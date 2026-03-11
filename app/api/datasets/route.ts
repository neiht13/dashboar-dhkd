import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dataset from '@/models/Dataset';
import { getCurrentUser } from '@/lib/auth';
import { getPool, getPoolById } from '@/lib/db';

// GET /api/datasets - List all datasets
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        const datasets = await Dataset.find({ ownerId: user._id })
            .sort({ updatedAt: -1 })
            .select('-importedData -__v') // Exclude large data for listing
            .lean();

        return NextResponse.json({
            success: true,
            data: datasets.map((d) => ({
                ...d,
                id: d._id.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching datasets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch datasets' },
            { status: 500 }
        );
    }
}

// POST /api/datasets - Create new dataset
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            name, description, sourceType, table, schema,
            customQuery, storedProcedureName, storedProcedureParams,
            importedData, importedFileName, connectionId,
        } = body;

        if (!name || !sourceType) {
            return NextResponse.json(
                { success: false, error: 'Name and sourceType are required' },
                { status: 400 }
            );
        }

        // Auto-detect columns based on source type
        let columns: { name: string; type: string; nullable?: boolean; isPrimaryKey?: boolean }[] = [];
        let rowCount: number | undefined;

        if (sourceType === 'table' && table) {
            try {
                const pool = connectionId ? await getPoolById(connectionId) : await getPool();

                // Get columns
                const colResult = await pool.request()
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
                columns = colResult.recordset.map((col: Record<string, unknown>) => ({
                    name: col.name as string,
                    type: col.type as string,
                    nullable: col.nullable === 'YES',
                    isPrimaryKey: col.isPrimaryKey === 1,
                }));

                // Get row count
                const countResult = await pool.request()
                    .input('table', table)
                    .query(`
                        SELECT SUM(p.rows) as cnt
                        FROM sys.tables t
                        LEFT JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
                        WHERE t.name = @table
                        GROUP BY t.name
                    `);
                if (countResult.recordset.length > 0) {
                    rowCount = countResult.recordset[0].cnt;
                }
            } catch (err) {
                console.warn('Could not auto-detect columns for table:', table, err);
            }
        } else if (sourceType === 'query' && customQuery) {
            try {
                const pool = connectionId ? await getPoolById(connectionId) : await getPool();
                // Execute with TOP 1 to get schema
                const safeQuery = `SELECT TOP 1 * FROM (${customQuery}) AS __ds_preview`;
                const result = await pool.request().query(safeQuery);
                if (result.recordset.length > 0) {
                    columns = Object.keys(result.recordset[0]).map((key) => ({
                        name: key,
                        type: typeof result.recordset[0][key] === 'number' ? 'numeric' : 'nvarchar',
                    }));
                }
            } catch (err) {
                console.warn('Could not auto-detect columns for query:', err);
            }
        } else if (sourceType === 'import' && importedData?.length > 0) {
            const firstRow = importedData[0];
            columns = Object.keys(firstRow).map((key) => ({
                name: key,
                type: typeof firstRow[key] === 'number' ? 'numeric' : 'nvarchar',
            }));
            rowCount = importedData.length;
        } else if (sourceType === 'storedProcedure' && storedProcedureName) {
            try {
                const pool = connectionId ? await getPoolById(connectionId) : await getPool();
                const req = pool.request();
                if (storedProcedureParams) {
                    for (const [key, value] of Object.entries(storedProcedureParams)) {
                        req.input(key, value);
                    }
                }
                const result = await req.execute(storedProcedureName);
                if (result.recordset?.length > 0) {
                    columns = Object.keys(result.recordset[0]).map((key) => ({
                        name: key,
                        type: typeof result.recordset[0][key] === 'number' ? 'numeric' : 'nvarchar',
                    }));
                    rowCount = result.recordset.length;
                }
            } catch (err) {
                console.warn('Could not auto-detect columns for stored procedure:', err);
            }
        }

        await connectDB();

        const dataset = await Dataset.create({
            name,
            description,
            sourceType,
            table,
            schema: schema || 'dbo',
            customQuery,
            storedProcedureName,
            storedProcedureParams,
            importedData: sourceType === 'import' ? importedData : undefined,
            importedFileName,
            connectionId,
            columns,
            rowCount,
            lastRefreshed: new Date(),
            ownerId: user._id,
        });

        return NextResponse.json({
            success: true,
            data: {
                ...dataset.toObject(),
                id: dataset._id.toString(),
            },
            message: 'Dataset created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating dataset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create dataset' },
            { status: 500 }
        );
    }
}
