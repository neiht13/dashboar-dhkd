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

        // Fetch column metadata to validate fields
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${tableName}'
        `);
        const availableColumns = new Set(
            columnsResult.recordset.map((row: any) => row.COLUMN_NAME.replace(/[^\w]/g, ''))
        );
        const isValidField = (field?: string) =>
            !!field && availableColumns.has(field.replace(/[^\w]/g, ''));

        // Validate yAxis
        const validYAxis = yAxis.filter((col: string) => isValidField(col));
        const invalidYAxis = yAxis.filter((col: string) => !isValidField(col));
        if (validYAxis.length === 0) {
            return NextResponse.json({
                success: false,
                error: `Không tìm thấy cột Y hợp lệ trong bảng. Cột sai: ${invalidYAxis.join(', ')}`,
            }, { status: 400 });
        }

        // Validate xAxis
        if (xAxis && !isValidField(xAxis)) {
            return NextResponse.json({
                success: false,
                error: `Cột trục X '${xAxis}' không tồn tại trong bảng`,
            }, { status: 400 });
        }

        // Validate groupBy
        let sanitizedGroupBy: string[] | string | undefined = undefined;
        if (Array.isArray(groupBy)) {
            const validGroups = groupBy.filter((g: string) => isValidField(g));
            sanitizedGroupBy = validGroups.length > 0 ? validGroups : undefined;
        } else if (typeof groupBy === 'string' && isValidField(groupBy)) {
            sanitizedGroupBy = groupBy;
        }

        // Validate orderBy
        const sanitizedOrderBy = orderBy && isValidField(orderBy) ? orderBy : undefined;

        // Build aggregation function
        const aggFunc = aggregation.toUpperCase();
        const validAggFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
        const selectedAgg = validAggFunctions.includes(aggFunc) ? aggFunc : 'SUM';

        // Build SELECT clause for Y axis columns with aggregation
        const yAxisSelects = validYAxis.map((col: string) => {
            const escapedCol = col.replace(/[^\w]/g, '');
            return `${selectedAgg}([${escapedCol}]) as [${escapedCol}]`;
        }).join(', ');

        const requestBuilder = pool.request();
        let whereClause = `WHERE 1=1`;
        let groupByClause = '';
        let orderByClause = '';
        let selectXAxis = '';
        let selectGroupBy = ''; // Additional columns for groupBy

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

        // Build GROUP BY clause AND SELECT for additional groupBy columns
        let fullGroupByClause = groupByClause;
        if (sanitizedGroupBy && Array.isArray(sanitizedGroupBy) && sanitizedGroupBy.length > 0) {
            const groupByColumns = sanitizedGroupBy.map((col: string) => `[${col.replace(/[^\w]/g, '')}]`);
            const additionalGroups = groupByColumns.join(', ');
            fullGroupByClause = fullGroupByClause ? `${fullGroupByClause}, ${additionalGroups}` : additionalGroups;
            // Also add to SELECT clause
            selectGroupBy = groupByColumns.join(', ') + ',';
        } else if (sanitizedGroupBy && typeof sanitizedGroupBy === 'string') {
            const escapedGroupBy = `[${sanitizedGroupBy.replace(/[^\w]/g, '')}]`;
            fullGroupByClause = fullGroupByClause ? `${fullGroupByClause}, ${escapedGroupBy}` : escapedGroupBy;
            selectGroupBy = `${escapedGroupBy},`;
        }

        // Handle drillDownLabelField (Add to Select using MAX for aggregation)
        let selectLabel = '';
        const { drillDownLabelField } = body;
        if (drillDownLabelField && isValidField(drillDownLabelField)) {
            const escapedLabel = `[${drillDownLabelField.replace(/[^\w]/g, '')}]`;
            // Only add if not already in groupBy or xAxis
            // Check if the label field is already part of the X-axis or explicit GROUP BY columns
            const isLabelInXAxis = xAxis && xAxis.replace(/[^\w]/g, '') === drillDownLabelField.replace(/[^\w]/g, '');
            const isLabelInGroupBy = (Array.isArray(sanitizedGroupBy) && sanitizedGroupBy.some(g => g.replace(/[^\w]/g, '') === drillDownLabelField.replace(/[^\w]/g, ''))) ||
                (typeof sanitizedGroupBy === 'string' && sanitizedGroupBy.replace(/[^\w]/g, '') === drillDownLabelField.replace(/[^\w]/g, ''));

            if (!isLabelInXAxis && !isLabelInGroupBy) {
                // Do NOT add to Group By, instead use MAX to pick one label per group
                // This prevents splitting rows if labels are inconsistent for the same ID
                selectLabel = `MAX(${escapedLabel}) as ${escapedLabel},`;
            }
        }

        const sortDir = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Build ORDER BY clause
        if (sanitizedOrderBy) {
            const sortColStr = `[${sanitizedOrderBy.replace(/[^\w]/g, '')}]`;
            orderByClause = `ORDER BY ${sortColStr} ${sortDir}`;
        }

        // Build query
        let query: string;
        // Construct final query - include groupBy columns in SELECT
        query = `
            SELECT TOP ${limit}
                ${selectXAxis}
                ${selectGroupBy}
                ${selectLabel}
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
