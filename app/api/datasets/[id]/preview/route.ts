import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dataset from '@/models/Dataset';
import { getCurrentUser } from '@/lib/auth';
import { getPool, getPoolById } from '@/lib/db';

// POST /api/datasets/:id/preview - Preview dataset data
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const limit = body.limit || 50;

        await connectDB();

        const dataset = await Dataset.findOne({
            _id: id,
            ownerId: user._id,
        }).lean();

        if (!dataset) {
            return NextResponse.json(
                { success: false, error: 'Dataset not found' },
                { status: 404 }
            );
        }

        let data: Record<string, unknown>[] = [];
        let totalRows = 0;

        if (dataset.sourceType === 'import') {
            // Import source - data stored in document
            const fullDataset = await Dataset.findById(id).lean();
            const allData = fullDataset?.importedData || [];
            totalRows = allData.length;
            data = allData.slice(0, limit) as Record<string, unknown>[];
        } else {
            try {
                const pool = dataset.connectionId
                    ? await getPoolById(dataset.connectionId)
                    : await getPool();

                if (dataset.sourceType === 'table' && dataset.table) {
                    const schemaName = dataset.schema || 'dbo';
                    const countResult = await pool.request().query(
                        `SELECT COUNT(*) as cnt FROM [${schemaName}].[${dataset.table}]`
                    );
                    totalRows = countResult.recordset[0]?.cnt || 0;

                    const result = await pool.request().query(
                        `SELECT TOP ${limit} * FROM [${schemaName}].[${dataset.table}]`
                    );
                    data = result.recordset;
                } else if (dataset.sourceType === 'query' && dataset.customQuery) {
                    const result = await pool.request().query(
                        `SELECT TOP ${limit} * FROM (${dataset.customQuery}) AS __preview`
                    );
                    data = result.recordset;
                    totalRows = data.length; // Approximate
                } else if (dataset.sourceType === 'storedProcedure' && dataset.storedProcedureName) {
                    const req = pool.request();
                    if (dataset.storedProcedureParams) {
                        for (const [key, value] of Object.entries(dataset.storedProcedureParams)) {
                            req.input(key, value);
                        }
                    }
                    const result = await req.execute(dataset.storedProcedureName);
                    totalRows = result.recordset?.length || 0;
                    data = (result.recordset || []).slice(0, limit);
                }
            } catch (err) {
                console.error('Error executing dataset query:', err);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to execute dataset query: ' + (err instanceof Error ? err.message : 'Unknown error'),
                }, { status: 500 });
            }
        }

        // Update lastRefreshed and rowCount
        await Dataset.findByIdAndUpdate(id, {
            lastRefreshed: new Date(),
            rowCount: totalRows || data.length,
        });

        return NextResponse.json({
            success: true,
            data: {
                rows: data,
                totalRows,
                columns: data.length > 0
                    ? Object.keys(data[0]).map((key) => ({
                        name: key,
                        type: typeof data[0][key] === 'number' ? 'numeric' : typeof data[0][key],
                    }))
                    : dataset.columns,
            },
        });
    } catch (error) {
        console.error('Error previewing dataset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to preview dataset' },
            { status: 500 }
        );
    }
}
