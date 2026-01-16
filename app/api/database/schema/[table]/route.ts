import { NextResponse } from 'next/server';
import { getPool, getPoolById } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ table: string }> }
) {
    try {
        const { table } = await params;

        // Get connectionId from query params
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');

        console.log('[Schema API] Fetching schema for table:', table, 'connectionId:', connectionId);

        // Get pool based on connectionId or default
        const pool = connectionId ? await getPoolById(connectionId) : await getPool();

        console.log('[Schema API] Pool connected:', pool.connected);

        // Get column information - use LIKE for case insensitivity
        const columnsResult = await pool.request()
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

        console.log('[Schema API] Columns found:', columnsResult.recordset.length);

        // If no columns found, try with LIKE (case insensitive)
        let columns = columnsResult.recordset;
        if (columns.length === 0) {
            console.log('[Schema API] No columns, trying case-insensitive search...');
            const fallbackResult = await pool.request()
                .input('table', `%${table}%`)
                .query(`
                    SELECT TOP 1 c.TABLE_NAME as actualTableName
                    FROM INFORMATION_SCHEMA.COLUMNS c
                    WHERE c.TABLE_NAME LIKE @table
                `);

            if (fallbackResult.recordset.length > 0) {
                const actualTableName = fallbackResult.recordset[0].actualTableName;
                console.log('[Schema API] Found actual table name:', actualTableName);

                const retryResult = await pool.request()
                    .input('table', actualTableName)
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
                columns = retryResult.recordset;
            }
        }

        // Get sample data (first 10 rows) - need to escape table name properly
        // First check if table exists
        const tableCheck = await pool.request()
            .input('tableName', table)
            .query(`
                SELECT TABLE_SCHEMA, TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = @tableName
            `);

        console.log('[Schema API] Table check result:', tableCheck.recordset.length);

        let sampleResult = { recordset: [] as Record<string, unknown>[] };
        if (tableCheck.recordset.length > 0) {
            const schema = tableCheck.recordset[0].TABLE_SCHEMA;
            const tableName = tableCheck.recordset[0].TABLE_NAME;
            console.log('[Schema API] Fetching sample data from:', schema, '.', tableName);
            sampleResult = await pool.request().query(
                `SELECT TOP 10 * FROM [${schema}].[${tableName}]`
            );
        }

        console.log('[Schema API] Returning columns:', columns.length, 'sampleData:', sampleResult.recordset.length);

        return NextResponse.json({
            success: true,
            data: {
                columns: columns,
                sampleData: sampleResult.recordset,
            },
        });
    } catch (error) {
        console.error('Error fetching schema:', error);

        const { table } = await params;

        // Return mock data for Subscribers table
        if (table === 'Subscribers') {
            return NextResponse.json({
                success: true,
                data: {
                    columns: [
                        { name: 'id', type: 'int', nullable: 'NO', isPrimaryKey: 1 },
                        { name: 'thang', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'nam', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'ma_dv', type: 'varchar', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'loaitb_id', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'ptm', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'khoiphuc', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'thanhly', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'tamngung_yc', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'tamngung_nc', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'dichchuyen', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'quahan', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'dungthu', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                        { name: 'dungthat', type: 'int', nullable: 'YES', isPrimaryKey: 0 },
                    ],
                    sampleData: [
                        { id: 1, thang: 11, nam: 2025, ma_dv: '387', loaitb_id: 61, ptm: 104, khoiphuc: 0, thanhly: 135 },
                        { id: 2, thang: 8, nam: 2025, ma_dv: '392', loaitb_id: 1, ptm: 1, khoiphuc: 3, thanhly: 4 },
                        { id: 3, thang: 10, nam: 2025, ma_dv: null, loaitb_id: 58, ptm: 0, khoiphuc: 0, thanhly: 10 },
                    ],
                },
                demo: true,
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch schema',
        }, { status: 500 });
    }
}
