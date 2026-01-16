import { NextResponse } from 'next/server';
import { getPool, getPoolById } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            table, xAxis, yAxis, aggregation = 'sum', groupBy,
            orderBy, orderDirection = 'ASC', limit = 50, filters = [],
            resolution, connectionId,
            // Custom SQL support
            customQuery
        } = body;

        // Get pool based on connectionId or default
        const pool = connectionId ? await getPoolById(connectionId) : await getPool();

        // ============ CUSTOM SQL MODE ============
        if (customQuery && customQuery.trim()) {
            console.log('[Chart Data API] Executing custom SQL query');

            // Basic SQL injection prevention - only allow SELECT statements
            const cleanQuery = customQuery.trim().toUpperCase();
            if (!cleanQuery.startsWith('SELECT')) {
                return NextResponse.json({
                    success: false,
                    error: 'Chỉ cho phép câu lệnh SELECT',
                }, { status: 400 });
            }

            // Block dangerous keywords
            const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE', 'XP_', 'SP_'];
            for (const keyword of dangerousKeywords) {
                if (cleanQuery.includes(keyword)) {
                    return NextResponse.json({
                        success: false,
                        error: `Không được sử dụng từ khóa: ${keyword}`,
                    }, { status: 400 });
                }
            }

            // Execute custom query
            try {
                const result = await pool.request().query(customQuery);
                console.log('[Chart Data API] Custom query returned:', result.recordset.length, 'rows');

                return NextResponse.json({
                    success: true,
                    data: result.recordset,
                    columns: result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [],
                });
            } catch (sqlError) {
                console.error('[Chart Data API] Custom SQL error:', sqlError);
                return NextResponse.json({
                    success: false,
                    error: sqlError instanceof Error ? sqlError.message : 'Lỗi thực thi SQL',
                }, { status: 400 });
            }
        }

        // ============ SIMPLE MODE (existing logic) ============
        if (!table || !yAxis || yAxis.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: table, yAxis',
            }, { status: 400 });
        }

        // First verify table exists
        const tableCheck = await pool.request()
            .input('tableName', table)
            .query(`
                SELECT TABLE_SCHEMA, TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = @tableName
            `);

        if (tableCheck.recordset.length === 0) {
            return NextResponse.json({
                success: false,
                error: `Table '${table}' not found`,
            }, { status: 404 });
        }

        const schema = tableCheck.recordset[0].TABLE_SCHEMA;
        const tableName = tableCheck.recordset[0].TABLE_NAME;

        // Build aggregation function
        const aggFunc = aggregation.toUpperCase();
        const validAggFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
        const selectedAgg = validAggFunctions.includes(aggFunc) ? aggFunc : 'SUM';

        // Build SELECT clause for Y axis columns with aggregation
        const yAxisSelects = yAxis.map((col: string) => {
            const escapedCol = col.replace(/[^\w]/g, '');
            return `${selectedAgg}([${escapedCol}]) as [${escapedCol}]`;
        }).join(', ');

        const requestBuilder = pool.request();
        let whereClause = `WHERE 1=1`;
        let groupByClause = '';
        let orderByClause = '';
        let selectXAxis = '';

        // Only process X-Axis if provided
        if (xAxis) {
            // Escape xAxis column name
            const escapedXAxis = xAxis.replace(/[^\w]/g, '');

            // Handle Resolution (Time Grouping)
            let selectedXAxisExpr = `[${escapedXAxis}]`;
            let groupXAxisExpr = `[${escapedXAxis}]`;

            if (resolution) {
                if (resolution === 'year') {
                    selectedXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy')`;
                    groupXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy')`;
                } else if (resolution === 'month') {
                    selectedXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy-MM')`;
                    groupXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy-MM')`;
                } else if (resolution === 'day') {
                    selectedXAxisExpr = `TRY_CAST([${escapedXAxis}] as DATE)`;
                    groupXAxisExpr = `TRY_CAST([${escapedXAxis}] as DATE)`;
                }
            }

            selectXAxis = `${selectedXAxisExpr} as [${escapedXAxis}],`;
            whereClause += ` AND [${escapedXAxis}] IS NOT NULL`;
            groupByClause = groupXAxisExpr;
        }

        // Build Filters (WHERE clause)
        if (filters && Array.isArray(filters)) {
            filters.forEach((filter: any, index: number) => {
                const field = filter.field.replace(/[^\w]/g, '');
                const paramName = `filterParam${index}`;
                const operator = filter.operator;

                const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'];
                if (validOperators.includes(operator)) {
                    whereClause += ` AND [${field}] ${operator} @${paramName}`;
                    requestBuilder.input(paramName, filter.value);
                }
            });
        }

        // Build GROUP BY clause
        let fullGroupByClause = groupByClause;
        if (groupBy && Array.isArray(groupBy) && groupBy.length > 0) {
            const additionalGroups = groupBy.map((col: string) => `[${col.replace(/[^\w]/g, '')}]`).join(', ');
            fullGroupByClause = fullGroupByClause ? `${fullGroupByClause}, ${additionalGroups}` : additionalGroups;
        } else if (groupBy && typeof groupBy === 'string') {
            const additionalGroup = `[${groupBy.replace(/[^\w]/g, '')}]`;
            fullGroupByClause = fullGroupByClause ? `${fullGroupByClause}, ${additionalGroup}` : additionalGroup;
        }

        const sortDir = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Build ORDER BY clause
        if (orderBy) {
            const sortColStr = `[${orderBy.replace(/[^\w]/g, '')}]`;
            orderByClause = `ORDER BY ${sortColStr} ${sortDir}`;
        }

        // Build query
        let query: string;
        // Construct final query
        query = `
            SELECT TOP ${limit}
                ${selectXAxis}
                ${yAxisSelects}
            FROM [${schema}].[${tableName}]
            ${whereClause}
            ${fullGroupByClause ? `GROUP BY ${fullGroupByClause}` : ''}
            ${orderByClause}
        `;

        console.log('Executing chart query:', query);

        const result = await requestBuilder.query(query);

        return NextResponse.json({
            success: true,
            data: result.recordset,
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch chart data',
        }, { status: 500 });
    }
}
