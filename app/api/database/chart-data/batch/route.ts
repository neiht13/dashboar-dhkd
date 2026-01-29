import { NextResponse } from 'next/server';
import { getPool, getPoolById } from '@/lib/db';
import { validateSQLQuery, sanitizeIdentifier } from '@/lib/security/sql-validator';
import { logger } from '@/lib/security/logger';

interface BatchChartRequest {
    widgetId: string;
    config: {
        table?: string;
        xAxis?: string;
        yAxis?: string[];
        aggregation?: string;
        groupBy?: string | string[];
        orderBy?: string;
        orderDirection?: string;
        limit?: number;
        filters?: Array<{ field: string; operator: string; value: string | number }>;
        connectionId?: string;
        queryMode?: 'simple' | 'custom' | 'import';
        customQuery?: string;
        importedData?: Record<string, unknown>[];
        startDateColumn?: string;
        endDateColumn?: string;
        dateColumn?: string;
        drillDownLabelField?: string;
        resolution?: string;
    };
}

import { processChartData } from '@/lib/chart-data-utils';

/**
 * Process import mode data locally using shared utility
 */
function processImportData(
    rawData: Record<string, unknown>[],
    xAxis?: string,
    yAxis: string[] = [],
    groupBy?: string | string[],
    orderBy?: string,
    orderDirection: string = 'asc',
    limit?: number,
    aggregation: string = 'sum'
): Record<string, unknown>[] {
    if (!xAxis || yAxis.length === 0) {
        return rawData;
    }

    return processChartData(rawData, {
        xAxis,
        yAxis,
        aggregation: aggregation as any,
        groupBy,
        orderBy,
        orderDirection: orderDirection as 'asc' | 'desc',
        limit: limit || 0,
    });
}

/**
 * Execute single chart query
 */
async function executeChartQuery(request: BatchChartRequest): Promise<{ widgetId: string; data: Record<string, unknown>[]; error?: string }> {
    const { widgetId, config } = request;

    try {
        // Handle import mode
        if (config.queryMode === 'import' && config.importedData) {
            const data = processImportData(
                config.importedData,
                config.xAxis,
                config.yAxis,
                config.groupBy,
                config.orderBy,
                config.orderDirection || 'asc',
                config.limit
            );
            return { widgetId, data };
        }

        // Get pool
        const pool = config.connectionId ? await getPoolById(config.connectionId) : await getPool();

        // Handle custom SQL mode
        if (config.queryMode === 'custom' && config.customQuery) {
            const validation = validateSQLQuery(config.customQuery);
            if (!validation.isValid) {
                return { widgetId, data: [], error: validation.error };
            }

            const result = await pool.request().query(validation.sanitizedQuery!);
            return { widgetId, data: result.recordset };
        }

        // Handle simple mode
        if (!config.table || !config.yAxis || config.yAxis.length === 0) {
            return { widgetId, data: [] };
        }

        // Validate table exists
        const tableCheck = await pool.request()
            .input('tableName', config.table)
            .query(`
                SELECT TABLE_SCHEMA, TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = @tableName
            `);

        if (tableCheck.recordset.length === 0) {
            return { widgetId, data: [], error: `Table '${config.table}' not found` };
        }

        const schema = tableCheck.recordset[0].TABLE_SCHEMA;
        const tableName = tableCheck.recordset[0].TABLE_NAME;

        // Fetch column metadata
        const columnsResult = await pool.request()
            .input('schema', schema)
            .input('tableName', tableName)
            .query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @tableName
            `);

        const availableColumns = new Set(
            columnsResult.recordset.map((row: any) => row.COLUMN_NAME.replace(/[^\w]/g, ''))
        );
        const isValidField = (field?: string) =>
            !!field && availableColumns.has(field.replace(/[^\w]/g, ''));

        // Validate fields
        const validYAxis = config.yAxis.filter(col => isValidField(col));
        if (validYAxis.length === 0) {
            return { widgetId, data: [], error: 'No valid Y-axis columns found' };
        }

        if (config.xAxis && !isValidField(config.xAxis)) {
            return { widgetId, data: [], error: `X-axis column '${config.xAxis}' not found` };
        }

        // Validate groupBy
        let sanitizedGroupBy: string[] | undefined = undefined;
        if (Array.isArray(config.groupBy)) {
            const validGroups = config.groupBy.filter(g => isValidField(g));
            sanitizedGroupBy = validGroups.length > 0 ? validGroups : undefined;
        } else if (typeof config.groupBy === 'string' && isValidField(config.groupBy)) {
            sanitizedGroupBy = [config.groupBy];
        }

        // Validate orderBy
        const sanitizedOrderBy = config.orderBy && isValidField(config.orderBy) ? config.orderBy : undefined;

        // Build query
        const aggFunc = (config.aggregation || 'sum').toUpperCase();
        const validAggFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
        const selectedAgg = validAggFunctions.includes(aggFunc) ? aggFunc : 'SUM';

        const yAxisSelects = validYAxis.map((col: string) => {
            const escapedCol = col.replace(/[^\w]/g, '');
            return `${selectedAgg}([${escapedCol}]) as [${escapedCol}]`;
        }).join(', ');

        const requestBuilder = pool.request();
        let whereClause = `WHERE 1=1`;
        let groupByClause = '';
        let orderByClause = '';
        let selectXAxis = '';
        let selectGroupBy = '';

        if (config.xAxis) {
            const escapedXAxis = config.xAxis.replace(/[^\w]/g, '');
            let selectedXAxisExpr = `[${escapedXAxis}]`;
            let groupXAxisExpr = `[${escapedXAxis}]`;

            if (config.resolution) {
                if (config.resolution === 'year') {
                    selectedXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy')`;
                    groupXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy')`;
                } else if (config.resolution === 'month') {
                    selectedXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy-MM')`;
                    groupXAxisExpr = `FORMAT(TRY_CAST([${escapedXAxis}] as DATE), 'yyyy-MM')`;
                } else if (config.resolution === 'day') {
                    selectedXAxisExpr = `TRY_CAST([${escapedXAxis}] as DATE)`;
                    groupXAxisExpr = `TRY_CAST([${escapedXAxis}] as DATE)`;
                }
            }

            selectXAxis = `${selectedXAxisExpr} as [${escapedXAxis}],`;
            whereClause += ` AND [${escapedXAxis}] IS NOT NULL`;
            groupByClause = groupXAxisExpr;
        }

        // Build filters
        if (config.filters && Array.isArray(config.filters)) {
            config.filters.forEach((filter: any, index: number) => {
                try {
                    const sanitizedField = sanitizeIdentifier(filter.field);
                    const paramName = `filterParam${index}`;
                    const operator = filter.operator?.toUpperCase() || '=';

                    const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'];
                    if (validOperators.includes(operator)) {
                        if (operator === 'IN' && Array.isArray(filter.value)) {
                            filter.value.forEach((v: any, i: number) => {
                                requestBuilder.input(`${paramName}_${i}`, v);
                            });
                            whereClause += ` AND [${sanitizedField}] IN (${filter.value.map((_: any, i: number) => `@${paramName}_${i}`).join(', ')})`;
                        } else {
                            requestBuilder.input(paramName, filter.value);
                            whereClause += ` AND [${sanitizedField}] ${operator} @${paramName}`;
                        }
                    }
                } catch (fieldError) {
                    logger.warn('Invalid filter field', { field: filter.field, error: fieldError });
                }
            });
        }

        // Build GROUP BY
        if (sanitizedGroupBy && sanitizedGroupBy.length > 0) {
            const groupByColumns = sanitizedGroupBy.map((col: string) => `[${col.replace(/[^\w]/g, '')}]`);
            const additionalGroups = groupByColumns.join(', ');
            groupByClause = groupByClause ? `${groupByClause}, ${additionalGroups}` : additionalGroups;
            selectGroupBy = groupByColumns.join(', ') + ',';
        }

        // Handle drillDownLabelField
        let selectLabel = '';
        if (config.drillDownLabelField && isValidField(config.drillDownLabelField)) {
            const escapedLabel = `[${config.drillDownLabelField.replace(/[^\w]/g, '')}]`;
            const isLabelInXAxis = config.xAxis && config.xAxis.replace(/[^\w]/g, '') === config.drillDownLabelField.replace(/[^\w]/g, '');
            const isLabelInGroupBy = sanitizedGroupBy?.some(g => g.replace(/[^\w]/g, '') === config.drillDownLabelField.replace(/[^\w]/g, ''));

            if (!isLabelInXAxis && !isLabelInGroupBy) {
                selectLabel = `MAX(${escapedLabel}) as ${escapedLabel},`;
            }
        }

        const sortDir = (config.orderDirection || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        if (sanitizedOrderBy) {
            const sortColStr = `[${sanitizedOrderBy.replace(/[^\w]/g, '')}]`;
            orderByClause = `ORDER BY ${sortColStr} ${sortDir}`;
        }

        const limit = config.limit || 50;
        const query = `
            SELECT TOP ${limit}
                ${selectXAxis}
                ${selectGroupBy}
                ${selectLabel}
                ${yAxisSelects}
            FROM [${schema}].[${tableName}]
            ${whereClause}
            ${groupByClause ? `GROUP BY ${groupByClause}` : ''}
            ${orderByClause}
        `;

        const result = await requestBuilder.query(query);
        let chartData = result.recordset;

        // Create composite labels if groupBy exists
        if (sanitizedGroupBy && sanitizedGroupBy.length > 0 && config.xAxis) {
            chartData = chartData.map((row: any) => {
                const labelParts = [
                    String(row[config.xAxis!] || ''),
                    ...sanitizedGroupBy.map(g => String(row[g] || ''))
                ];
                return {
                    ...row,
                    [config.xAxis!]: labelParts.join(' - '),
                };
            });
        }

        return { widgetId, data: chartData };
    } catch (error) {
        logger.error('Error executing chart query', error instanceof Error ? error : new Error(String(error)), { widgetId });
        return { widgetId, data: [], error: error instanceof Error ? error.message : 'Query execution failed' };
    }
}

/**
 * POST /api/database/chart-data/batch
 * Fetch data for multiple charts in a single request
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { requests }: { requests: BatchChartRequest[] } = body;

        if (!Array.isArray(requests) || requests.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Requests array is required and must not be empty',
            }, { status: 400 });
        }

        if (requests.length > 50) {
            return NextResponse.json({
                success: false,
                error: 'Maximum 50 charts per batch request',
            }, { status: 400 });
        }

        logger.info('Processing batch chart data request', { count: requests.length });

        // Execute all queries in parallel
        const results = await Promise.all(
            requests.map(req => executeChartQuery(req))
        );

        // Build response
        const data: Record<string, Record<string, unknown>[]> = {};
        const errors: Record<string, string> = {};

        results.forEach(result => {
            if (result.error) {
                errors[result.widgetId] = result.error;
            } else {
                data[result.widgetId] = result.data;
            }
        });

        return NextResponse.json({
            success: true,
            data,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
        });
    } catch (error) {
        logger.error('Error processing batch chart data request', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process batch request',
        }, { status: 500 });
    }
}
