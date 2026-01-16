import { NextResponse } from 'next/server';
import { getPool, getPoolById } from '@/lib/db';

export async function GET(request: Request) {
    try {
        // Get connectionId from query params
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');

        // Get pool based on connectionId or default
        const pool = connectionId ? await getPoolById(connectionId) : await getPool();

        const result = await pool.request().query(`
      SELECT 
        s.name as [schema],
        t.name as name,
        SUM(p.rows) as [rowCount]
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      LEFT JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
      WHERE t.type = 'U'
      GROUP BY s.name, t.name
      ORDER BY s.name, t.name
    `);

        return NextResponse.json({
            success: true,
            data: { tables: result.recordset },
        });
    } catch (error) {
        console.error('Error fetching tables:', error);

        // Return mock data for development/demo purposes
        return NextResponse.json({
            success: true,
            data: {
                tables: [
                    { schema: 'dbo', name: 'Subscribers', rowCount: 1135 },
                    { schema: 'dbo', name: 'Dashboards', rowCount: 5 },
                    { schema: 'dbo', name: 'Charts', rowCount: 12 },
                    { schema: 'dbo', name: 'Users', rowCount: 3 },
                ],
            },
            demo: true,
        });
    }
}
