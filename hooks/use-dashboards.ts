import useSWR from 'swr';
import type { Dashboard } from '@/types';

interface DashboardsResponse {
    success: boolean;
    data: Dashboard[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
    };
}

interface DashboardResponse {
    success: boolean;
    data: Dashboard;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

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

export function useRecentDashboards(limit: number = 10) {
    const { data, error, isLoading, mutate } = useSWR<DashboardsResponse>(
        `/api/dashboards/recent?limit=${limit}`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        dashboards: data?.data || [],
        error,
        isLoading,
        mutate,
    };
}

export function useFavoriteDashboards() {
    const { data, error, isLoading, mutate } = useSWR<DashboardsResponse>(
        '/api/dashboards?favorites=true',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        dashboards: data?.data || [],
        error,
        isLoading,
        mutate,
    };
}

// Mutation helpers
export function useDashboardMutations() {
    const createDashboard = async (data: Partial<Dashboard>) => {
        const res = await fetch('/api/dashboards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create dashboard');
        return res.json();
    };

    const updateDashboard = async (id: string, data: Partial<Dashboard>) => {
        const res = await fetch(`/api/dashboards/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update dashboard');
        return res.json();
    };

    const deleteDashboard = async (id: string) => {
        const res = await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete dashboard');
        return res.json();
    };

    const toggleFavorite = async (id: string, isFavorite: boolean) => {
        const res = await fetch(`/api/dashboards/${id}/favorite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite }),
        });
        if (!res.ok) throw new Error('Failed to toggle favorite');
        return res.json();
    };

    return {
        createDashboard,
        updateDashboard,
        deleteDashboard,
        toggleFavorite,
    };
}
