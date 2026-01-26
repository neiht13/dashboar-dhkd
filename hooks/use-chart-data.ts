import useSWR from 'swr';
import type { ChartConfig } from '@/types';

interface ChartDataParams {
    chartId?: string;
    config?: ChartConfig;
    connectionId?: string;
    startDate?: string;
    endDate?: string;
    filters?: Array<{ field: string; operator: string; value: unknown }>;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('Failed to fetch chart data');
        throw error;
    }
    return res.json();
};

export function useChartData(params: ChartDataParams) {
    const {
        chartId,
        config,
        connectionId,
        startDate,
        endDate,
        filters,
    } = params;

    // Build query string
    const queryParams = new URLSearchParams();
    if (connectionId) queryParams.set('connectionId', connectionId);
    if (startDate) queryParams.set('startDate', startDate);
    if (endDate) queryParams.set('endDate', endDate);
    if (filters) queryParams.set('filters', JSON.stringify(filters));
    if (config?.dataSource) {
        queryParams.set('config', JSON.stringify(config.dataSource));
    }

    const queryString = queryParams.toString();
    const url = chartId
        ? `/api/charts/${chartId}/data${queryString ? `?${queryString}` : ''}`
        : `/api/charts/data${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        config?.dataSource ? url : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes - increased cache time
            errorRetryCount: 3,
            errorRetryInterval: 5000,
            // Cache for 5 minutes
            refreshInterval: 0, // Disable auto-refresh, use manual refresh
            // Keep previous data while revalidating
            keepPreviousData: true,
        }
    );

    return {
        data: data?.data,
        error,
        isLoading,
        isValidating,
        mutate,
        refresh: () => mutate(),
    };
}

export function useChartDataMutation() {
    const postData = async (endpoint: string, body: unknown) => {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
    };

    return { postData };
}
