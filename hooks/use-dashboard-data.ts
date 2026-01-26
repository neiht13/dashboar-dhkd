/**
 * Custom hooks for dashboard data fetching using SWR
 * Consolidates server state management
 */

import useSWR from 'swr';
import type { Dashboard } from '@/types';

interface DashboardsResponse {
    success: boolean;
    data: Dashboard[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}

interface DashboardResponse {
    success: boolean;
    data: Dashboard;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('Failed to fetch data');
        throw error;
    }
    return res.json();
};

/**
 * Hook for fetching all dashboards
 */
export function useDashboards(params?: {
    search?: string;
    folderId?: string;
    favorites?: boolean;
    recent?: boolean;
    limit?: number;
}) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.folderId) queryParams.set('folderId', params.folderId);
    if (params?.favorites) queryParams.set('favorites', 'true');
    if (params?.recent) queryParams.set('recent', 'true');
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/api/dashboards${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR<DashboardsResponse>(
        url,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        dashboards: data?.data || [],
        pagination: data?.pagination,
        error,
        isLoading,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Hook for fetching a single dashboard
 */
export function useDashboard(id: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
        id ? `/api/dashboards/${id}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        dashboard: data?.data,
        error,
        isLoading,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Hook for recent dashboards
 */
export function useRecentDashboards(limit: number = 10) {
    return useDashboards({ recent: true, limit });
}

/**
 * Hook for favorite dashboards
 */
export function useFavoriteDashboards() {
    return useDashboards({ favorites: true });
}
