/**
 * Shared utilities for chart data processing
 * Reduces code duplication across components
 */

import type { ChartConfig, AggregationType } from '@/types';

export interface ProcessChartDataOptions {
    xAxis?: string;
    yAxis: string[];
    aggregation?: AggregationType;
    groupBy?: string | string[];
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    drillDownLabelField?: string;
}

export interface ProcessedChartData {
    data: Record<string, unknown>[];
    groups: Record<string, Record<string, unknown>>;
}

/**
 * Create composite label from xAxis and groupBy fields
 */
export function createCompositeLabel(
    row: Record<string, unknown>,
    xAxis: string,
    groupByFields: string[]
): string {
    if (groupByFields.length === 0) {
        return String(row[xAxis] || '');
    }

    const labelParts = [
        String(row[xAxis] || ''),
        ...groupByFields.map(f => String(row[f] || ''))
    ];

    return labelParts.join(' - ');
}

/**
 * Normalize groupBy to array format
 */
export function normalizeGroupBy(groupBy?: string | string[]): string[] {
    if (!groupBy) return [];
    return Array.isArray(groupBy) ? groupBy : [groupBy];
}

/**
 * Aggregate chart data with grouping and composite labels
 */
export function aggregateChartData(
    rawData: Record<string, unknown>[],
    options: ProcessChartDataOptions
): ProcessedChartData {
    const {
        xAxis,
        yAxis,
        aggregation = 'sum',
        groupBy,
        drillDownLabelField,
    } = options;

    if (!xAxis || yAxis.length === 0 || rawData.length === 0) {
        return {
            data: rawData,
            groups: {},
        };
    }

    const groupByArr = normalizeGroupBy(groupBy);
    const groupingField = drillDownLabelField || xAxis;
    const groupFields = [groupingField, ...groupByArr];

    const groups: Record<string, Record<string, unknown>> = {};

    rawData.forEach(row => {
        const key = groupFields.map(f => String(row[f] ?? '')).join('|||');

        if (!groups[key]) {
            groups[key] = { _count: 0 };
            groupFields.forEach(f => {
                groups[key][f] = row[f];
            });

            yAxis.forEach(y => {
                groups[key][y] =
                    aggregation === 'min'
                        ? "Không xác định"
                        : aggregation === 'max'
                            ? -"Không xác định"
                            : 0;
            });

            // Create composite label if groupBy exists
            if (groupByArr.length > 0) {
                groups[key]._compositeLabel = createCompositeLabel(row, groupingField, groupByArr);
            }

            // Initialize drillDownLabelField if present (for MAX aggregation)
            if (drillDownLabelField && row[drillDownLabelField]) {
                groups[key][drillDownLabelField] = String(row[drillDownLabelField]);
            }
        }

        (groups[key]._count as number)++;

        yAxis.forEach(y => {
            const val = Number(row[y]) || 0;
            if (aggregation === 'sum' || aggregation === 'avg') {
                (groups[key][y] as number) += val;
            } else if (aggregation === 'min') {
                (groups[key][y] as number) = Math.min(groups[key][y] as number, val);
            } else if (aggregation === 'max') {
                (groups[key][y] as number) = Math.max(groups[key][y] as number, val);
            }
        });

        // Aggregate drillDownLabelField (MAX) if present
        if (drillDownLabelField && row[drillDownLabelField]) {
            const currentLabel = String(groups[key][drillDownLabelField] || '');
            const newLabel = String(row[drillDownLabelField]);
            // Use lexicographical comparison to pick "MAX" label
            if (newLabel.localeCompare(currentLabel) > 0) {
                groups[key][drillDownLabelField] = newLabel;
            }
        }
    });

    // Convert groups to array and apply aggregation calculations
    let processedData = Object.values(groups).map((g: any) => {
        const row: any = { ...g };

        if (aggregation === 'avg') {
            yAxis.forEach(y => {
                row[y] = row[y] / (g._count || 1);
            });
        } else if (aggregation === 'count') {
            yAxis.forEach(y => {
                row[y] = g._count || 0;
            });
        }

        delete row._count;

        // Apply composite label to grouping field
        if (row._compositeLabel && groupingField) {
            row[groupingField] = row._compositeLabel;
            delete row._compositeLabel;
        }

        // Add name/label for chart display
        const displayLabel = row[groupingField] || `#${Object.keys(groups).indexOf(g) + 1}`;
        row._label = displayLabel;
        row.name = displayLabel;

        return row;
    });

    return {
        data: processedData,
        groups,
    };
}

/**
 * Sort chart data
 */
export function sortChartData(
    data: Record<string, unknown>[],
    orderBy?: string,
    orderDirection: 'asc' | 'desc' = 'asc'
): Record<string, unknown>[] {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return orderDirection === 'asc'
            ? String(aVal || '').localeCompare(String(bVal || ''))
            : String(bVal || '').localeCompare(String(aVal || ''));
    });
}

/**
 * Limit chart data
 */
export function limitChartData(
    data: Record<string, unknown>[],
    limit: number
): Record<string, unknown>[] {
    if (limit <= 0) return data;
    return data.slice(0, limit);
}

/**
 * Process chart data: aggregate, sort, and limit
 */
export function processChartData(
    rawData: Record<string, unknown>[],
    options: ProcessChartDataOptions
): Record<string, unknown>[] {
    const {
        orderBy,
        orderDirection = 'asc',
        limit,
    } = options;

    // Aggregate data
    const { data: aggregatedData } = aggregateChartData(rawData, options);

    // Sort data
    let processedData = sortChartData(aggregatedData, orderBy, orderDirection);

    // Limit data
    processedData = limitChartData(processedData, limit || 0);

    return processedData;
}

/**
 * Build chart data request body for API
 */
export function buildChartDataRequest(
    config: ChartConfig['dataSource'],
    globalFilters?: {
        dateRange?: {
            from?: Date;
            to?: Date;
        };
    }
): Record<string, unknown> {
    const filters = [...(config.filters || [])];

    // Apply date range filters
    const startCol = config.startDateColumn || config.dateColumn;
    const endCol = config.endDateColumn || config.dateColumn;

    if (startCol && globalFilters?.dateRange?.from) {
        const fromDate = globalFilters.dateRange.from instanceof Date
            ? globalFilters.dateRange.from.toISOString().split('T')[0]
            : globalFilters.dateRange.from;
        filters.push({
            field: startCol,
            operator: '>=' as const,
            value: fromDate,
        });
    }

    if (endCol && globalFilters?.dateRange?.to) {
        const toDate = globalFilters.dateRange.to instanceof Date
            ? globalFilters.dateRange.to.toISOString().split('T')[0]
            : globalFilters.dateRange.to;
        filters.push({
            field: endCol,
            operator: '<=' as const,
            value: toDate,
        });
    }

    const requestBody: Record<string, unknown> = {
        table: config.table,
        xAxis: config.xAxis,
        yAxis: config.yAxis,
        aggregation: config.aggregation || 'sum',
        groupBy: config.groupBy || undefined,
        orderBy: config.orderBy,
        orderDirection: config.orderDirection,
        limit: config.limit || 50,
        filters,
        connectionId: config.connectionId,
    };

    // Add custom query if present
    if (config.queryMode === 'custom' && config.customQuery) {
        requestBody.customQuery = config.customQuery;
    }

    return requestBody;
}
