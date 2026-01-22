import { create } from 'zustand';

export interface CrossFilter {
    chartId: string;
    field: string;
    value: string | number | null;
    operator: '=' | 'in' | 'range';
    values?: (string | number)[];
    range?: { min: number; max: number };
}

interface CrossFilterState {
    // Active filters from chart interactions
    activeFilters: CrossFilter[];

    // Linked chart groups (charts that filter each other)
    linkedGroups: Record<string, string[]>; // groupId -> chartIds

    // Chart filter dependencies
    chartDependencies: Record<string, string[]>; // chartId -> fields it can filter

    // Actions
    setFilter: (filter: CrossFilter) => void;
    clearFilter: (chartId: string, field?: string) => void;
    clearAllFilters: () => void;

    // Linking
    linkCharts: (groupId: string, chartIds: string[]) => void;
    unlinkChart: (groupId: string, chartId: string) => void;
    getLinkedCharts: (chartId: string) => string[];

    // Dependencies
    setChartDependencies: (chartId: string, fields: string[]) => void;

    // Query helpers
    getFiltersForChart: (chartId: string, excludeSelf?: boolean) => CrossFilter[];
    buildFilterQuery: (chartId: string) => Array<{ field: string; operator: string; value: unknown }>;
}

export const useCrossFilterStore = create<CrossFilterState>((set, get) => ({
    activeFilters: [],
    linkedGroups: {},
    chartDependencies: {},

    setFilter: (filter) => {
        set((state) => {
            // Remove existing filter for same chart+field
            const filtered = state.activeFilters.filter(
                (f) => !(f.chartId === filter.chartId && f.field === filter.field)
            );

            // Add new filter if value is not null
            if (filter.value !== null || filter.values?.length || filter.range) {
                return { activeFilters: [...filtered, filter] };
            }

            return { activeFilters: filtered };
        });
    },

    clearFilter: (chartId, field) => {
        set((state) => ({
            activeFilters: state.activeFilters.filter((f) => {
                if (field) {
                    return !(f.chartId === chartId && f.field === field);
                }
                return f.chartId !== chartId;
            }),
        }));
    },

    clearAllFilters: () => {
        set({ activeFilters: [] });
    },

    linkCharts: (groupId, chartIds) => {
        set((state) => ({
            linkedGroups: {
                ...state.linkedGroups,
                [groupId]: chartIds,
            },
        }));
    },

    unlinkChart: (groupId, chartId) => {
        set((state) => {
            const group = state.linkedGroups[groupId];
            if (!group) return state;

            const newGroup = group.filter((id) => id !== chartId);
            
            if (newGroup.length === 0) {
                const { [groupId]: _, ...rest } = state.linkedGroups;
                return { linkedGroups: rest };
            }

            return {
                linkedGroups: {
                    ...state.linkedGroups,
                    [groupId]: newGroup,
                },
            };
        });
    },

    getLinkedCharts: (chartId) => {
        const { linkedGroups } = get();

        for (const groupId in linkedGroups) {
            if (linkedGroups[groupId].includes(chartId)) {
                return linkedGroups[groupId].filter((id) => id !== chartId);
            }
        }

        return [];
    },

    setChartDependencies: (chartId, fields) => {
        set((state) => ({
            chartDependencies: {
                ...state.chartDependencies,
                [chartId]: fields,
            },
        }));
    },

    getFiltersForChart: (chartId, excludeSelf = true) => {
        const { activeFilters, linkedGroups } = get();

        // Find which group this chart belongs to
        let linkedChartIds: string[] = [];
        for (const groupId in linkedGroups) {
            if (linkedGroups[groupId].includes(chartId)) {
                linkedChartIds = linkedGroups[groupId];
                break;
            }
        }

        // If no group, return all filters (except self if excludeSelf)
        if (linkedChartIds.length === 0) {
            if (excludeSelf) {
                return activeFilters.filter((f) => f.chartId !== chartId);
            }
            return activeFilters;
        }

        // Return filters from linked charts only
        return activeFilters.filter((f) => {
            if (excludeSelf && f.chartId === chartId) return false;
            return linkedChartIds.includes(f.chartId);
        });
    },

    buildFilterQuery: (chartId) => {
        const filters = get().getFiltersForChart(chartId, true);

        return filters.map((filter) => {
            if (filter.operator === 'range' && filter.range) {
                return [
                    { field: filter.field, operator: '>=', value: filter.range.min },
                    { field: filter.field, operator: '<=', value: filter.range.max },
                ];
            }

            if (filter.operator === 'in' && filter.values) {
                return { field: filter.field, operator: 'in', value: filter.values };
            }

            return { field: filter.field, operator: filter.operator, value: filter.value };
        }).flat();
    },
}));

// Hook for chart components
export function useCrossFilter(chartId: string) {
    const {
        setFilter,
        clearFilter,
        getFiltersForChart,
        buildFilterQuery,
        activeFilters,
    } = useCrossFilterStore();

    return {
        // Set a filter from this chart
        setFilter: (field: string, value: string | number | null) => {
            setFilter({ chartId, field, value, operator: '=' });
        },

        // Set multiple values filter
        setMultiFilter: (field: string, values: (string | number)[]) => {
            setFilter({ chartId, field, value: null, operator: 'in', values });
        },

        // Set range filter
        setRangeFilter: (field: string, min: number, max: number) => {
            setFilter({ chartId, field, value: null, operator: 'range', range: { min, max } });
        },

        // Clear filters from this chart
        clearMyFilters: () => clearFilter(chartId),

        // Get filters that should be applied to this chart
        appliedFilters: getFiltersForChart(chartId, true),

        // Get filter query for API
        filterQuery: buildFilterQuery(chartId),

        // Check if this chart has active filters
        hasActiveFilter: activeFilters.some((f) => f.chartId === chartId),
    };
}
