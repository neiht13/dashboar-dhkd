import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type { AggregationType } from '@/types';

interface QueryRequest {
    table: string;
    xAxis: string;
    yAxis: string[];
    aggregation: AggregationType;
    groupBy?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
}

// Demo data for development
const demoData: Record<string, Record<string, unknown>[]> = {
    Subscribers: [
        { thang: 7, nam: 2025, ptm: 2105, khoiphuc: 320, thanhly: 840 },
        { thang: 8, nam: 2025, ptm: 2450, khoiphuc: 380, thanhly: 920 },
        { thang: 9, nam: 2025, ptm: 2780, khoiphuc: 410, thanhly: 850 },
        { thang: 10, nam: 2025, ptm: 3100, khoiphuc: 450, thanhly: 780 },
        { thang: 11, nam: 2025, ptm: 3450, khoiphuc: 520, thanhly: 720 },
        { thang: 12, nam: 2025, ptm: 3800, khoiphuc: 580, thanhly: 650 },
    ],
};

function buildAggregationQuery(
    table: string,
    xAxis: string,
    yAxis: string[],
    aggregation: AggregationType,
    groupBy?: string,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc',
    limit?: number
): string {
    const aggFunc = aggregation === 'none' ? '' : aggregation.toUpperCase();

    const selectFields = yAxis.map((field) => {
        if (aggregation === 'none') {
            return `[${field}]`;
        }
        return `${aggFunc}([${field}]) as [${field}]`;
    }).join(', ');

    const groupByField = groupBy || xAxis;
    const orderByField = orderBy || xAxis;
    const direction = orderDirection || 'asc';

    let query = `SELECT [${xAxis}], ${selectFields} FROM [${table}]`;

    if (aggregation !== 'none') {
        query += ` GROUP BY [${groupByField}]`;
    }

    query += ` ORDER BY [${orderByField}] ${direction}`;

    if (limit) {
        query = query.replace('SELECT', `SELECT TOP ${limit}`);
    }

    return query;
}

export async function POST(request: Request) {
    try {
        const body: QueryRequest = await request.json();
        const { table, xAxis, yAxis, aggregation, groupBy, orderBy, orderDirection, limit } = body;

        // Validate required fields
        if (!table || !xAxis || !yAxis || yAxis.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: table, xAxis, yAxis',
            }, { status: 400 });
        }

        try {
            const pool = await getPool();
            const query = buildAggregationQuery(
                table,
                xAxis,
                yAxis,
                aggregation,
                groupBy,
                orderBy,
                orderDirection,
                limit
            );

            const result = await pool.request().query(query);

            return NextResponse.json({
                success: true,
                data: result.recordset,
                query, // For debugging
            });
        } catch (dbError) {
            console.error('Database query error:', dbError);

            // Return demo data
            const data = demoData[table] || [];
            return NextResponse.json({
                success: true,
                data,
                demo: true,
            });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to execute query',
        }, { status: 500 });
    }
}
