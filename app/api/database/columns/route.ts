import { NextResponse } from 'next/server';
import { getPool, getPoolById } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');
        const connectionId = searchParams.get('connectionId');

        if (!table) {
            return NextResponse.json({
                success: false,
                error: 'Table name is required',
            }, { status: 400 });
        }

        const pool = connectionId ? await getPoolById(connectionId) : await getPool();

        const result = await pool.request()
            .input('table', table)
            .query(`
                SELECT 
                    c.COLUMN_NAME as name,
                    c.DATA_TYPE as type,
                    c.IS_NULLABLE as nullable,
                    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as isPrimaryKey
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
                WHERE c.TABLE_NAME = @table
                ORDER BY c.ORDINAL_POSITION
            `);

        return NextResponse.json({
            success: true,
            data: result.recordset.map((col: Record<string, unknown>) => ({
                name: col.name,
                type: col.type,
                nullable: col.nullable === 'YES',
                isPrimaryKey: col.isPrimaryKey === 1,
            })),
        });
    } catch (error) {
        console.error('Error fetching columns:', error);

        // Fallback: try to get from schema API
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');

        return NextResponse.json({
            success: true,
            data: [
                { name: 'id', type: 'int', nullable: false, isPrimaryKey: true },
                { name: 'name', type: 'nvarchar', nullable: true, isPrimaryKey: false },
            ],
            demo: true,
            message: `Could not fetch columns for ${table}`,
        });
    }
}
