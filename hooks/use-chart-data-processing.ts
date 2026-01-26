/**
 * Custom hooks for chart data processing
 * Provides reusable logic for fetching and processing chart data
 */

import { useState, useCallback } from 'react';
import type { ChartConfig, AggregationType } from '@/types';
import {
    processChartData,
    buildChartDataRequest,
    type ProcessChartDataOptions,
} from '@/lib/chart-data-utils';

interface UseChartDataProcessingOptions {
    config?: ChartConfig;
    globalFilters?: {
        dateRange?: {
            from?: Date;
            to?: Date;
        };
    };
}

export function useChartDataProcessing(options: UseChartDataProcessingOptions) {
    const { config, globalFilters } = options;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch chart data from API
     */
    const fetchChartData = useCallback(async (): Promise<Record<string, unknown>[]> => {
        if (!config?.dataSource) {
            return [];
        }

        setIsLoading(true);
        setError(null);

        try {
            // Handle import mode locally
            if (config.dataSource.queryMode === 'import' && config.dataSource.importedData) {
                const rawData = config.dataSource.importedData as Record<string, unknown>[];
                const processed = processChartData(rawData, {
                    xAxis: config.dataSource.xAxis,
                    yAxis: config.dataSource.yAxis || [],
                    aggregation: config.dataSource.aggregation || 'sum',
                    groupBy: config.dataSource.groupBy,
                    orderBy: config.dataSource.orderBy,
                    orderDirection: config.dataSource.orderDirection || 'asc',
                    limit: config.dataSource.limit || 0,
                    drillDownLabelField: config.dataSource.drillDownLabelField,
                });
                setIsLoading(false);
                return processed;
            }

            // Build request body
            const requestBody = buildChartDataRequest(config.dataSource, globalFilters);

            // Fetch from API
            const response = await fetch('/api/database/chart-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch chart data');
            }

            if (!result.data || result.data.length === 0) {
                setIsLoading(false);
                return [];
            }

            // Process the data (aggregate, sort, limit)
            // Note: API may have already done some processing, but we ensure consistency
            const processed = processChartData(result.data, {
                xAxis: config.dataSource.xAxis,
                yAxis: config.dataSource.yAxis || [],
                aggregation: config.dataSource.aggregation || 'sum',
                groupBy: config.dataSource.groupBy,
                orderBy: config.dataSource.orderBy,
                orderDirection: config.dataSource.orderDirection || 'asc',
                limit: config.dataSource.limit || 0,
                drillDownLabelField: config.dataSource.drillDownLabelField,
            });

            setIsLoading(false);
            return processed;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setIsLoading(false);
            return [];
        }
    }, [config, globalFilters]);

    /**
     * Process raw data locally (for import mode or post-processing)
     */
    const processRawData = useCallback((
        rawData: Record<string, unknown>[],
        options?: Partial<ProcessChartDataOptions>
    ): Record<string, unknown>[] => {
        if (!config?.dataSource) {
            return rawData;
        }

        const processingOptions: ProcessChartDataOptions = {
            xAxis: options?.xAxis || config.dataSource.xAxis,
            yAxis: options?.yAxis || config.dataSource.yAxis || [],
            aggregation: options?.aggregation || config.dataSource.aggregation || 'sum',
            groupBy: options?.groupBy || config.dataSource.groupBy,
            orderBy: options?.orderBy || config.dataSource.orderBy,
            orderDirection: options?.orderDirection || config.dataSource.orderDirection || 'asc',
            limit: options?.limit !== undefined ? options.limit : (config.dataSource.limit || 0),
            drillDownLabelField: options?.drillDownLabelField || config.dataSource.drillDownLabelField,
        };

        return processChartData(rawData, processingOptions);
    }, [config]);

    return {
        fetchChartData,
        processRawData,
        isLoading,
        error,
    };
}

/**
 * Hook for batch chart data fetching
 */
export function useBatchChartData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBatchChartData = useCallback(async (
        requests: Array<{
            widgetId: string;
            config: ChartConfig;
            globalFilters?: {
                dateRange?: {
                    from?: Date;
                    to?: Date;
                };
            };
        }>
    ): Promise<Record<string, Record<string, unknown>[]>> => {
        setIsLoading(true);
        setError(null);

        try {
            // Separate import mode and API requests
            const importResults: Record<string, Record<string, unknown>[]> = {};
            const apiRequests: Array<{
                widgetId: string;
                requestBody: Record<string, unknown>;
            }> = [];

            requests.forEach(({ widgetId, config, globalFilters }) => {
                if (config.dataSource?.queryMode === 'import' && config.dataSource?.importedData) {
                    // Process import mode locally
                    const rawData = config.dataSource.importedData as Record<string, unknown>[];
                    const processed = processChartData(rawData, {
                        xAxis: config.dataSource.xAxis,
                        yAxis: config.dataSource.yAxis || [],
                        aggregation: config.dataSource.aggregation || 'sum',
                        groupBy: config.dataSource.groupBy,
                        orderBy: config.dataSource.orderBy,
                        orderDirection: config.dataSource.orderDirection || 'asc',
                        limit: config.dataSource.limit || 0,
                        drillDownLabelField: config.dataSource.drillDownLabelField,
                    });
                    importResults[widgetId] = processed;
                } else if (config.dataSource) {
                    // Build API request
                    const requestBody = buildChartDataRequest(config.dataSource, globalFilters);
                    apiRequests.push({ widgetId, requestBody });
                }
            });

            // Fetch API requests in batch
            let apiResults: Record<string, Record<string, unknown>[]> = {};
            if (apiRequests.length > 0) {
                const batchRequestBody = apiRequests.map(req => ({
                    widgetId: req.widgetId,
                    ...req.requestBody,
                }));

                const response = await fetch('/api/database/chart-data/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requests: batchRequestBody }),
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch batch chart data');
                }

                // Process results
                result.data.forEach((item: { widgetId: string; data: Record<string, unknown>[]; error?: string }) => {
                    if (item.error) {
                        console.error(`Error fetching data for widget ${item.widgetId}:`, item.error);
                        apiResults[item.widgetId] = [];
                    } else if (item.data) {
                        // Post-process data for consistency
                        const request = requests.find(r => r.widgetId === item.widgetId);
                        if (request?.config.dataSource) {
                            const processed = processChartData(item.data, {
                                xAxis: request.config.dataSource.xAxis,
                                yAxis: request.config.dataSource.yAxis || [],
                                aggregation: request.config.dataSource.aggregation || 'sum',
                                groupBy: request.config.dataSource.groupBy,
                                orderBy: request.config.dataSource.orderBy,
                                orderDirection: request.config.dataSource.orderDirection || 'asc',
                                limit: request.config.dataSource.limit || 0,
                                drillDownLabelField: request.config.dataSource.drillDownLabelField,
                            });
                            apiResults[item.widgetId] = processed;
                        } else {
                            apiResults[item.widgetId] = item.data;
                        }
                    }
                });
            }

            setIsLoading(false);
            return { ...importResults, ...apiResults };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setIsLoading(false);
            return {};
        }
    }, []);

    return {
        fetchBatchChartData,
        isLoading,
        error,
    };
}
