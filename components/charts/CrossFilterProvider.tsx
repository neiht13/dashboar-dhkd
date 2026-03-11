"use client";

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useCrossFilterStore, CrossFilter } from '@/stores/cross-filter-store';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrossFilterContextValue {
    // Set filter from a chart
    setFilter: (chartId: string, field: string, value: string | number | null) => void;
    setMultiFilter: (chartId: string, field: string, values: (string | number)[]) => void;
    setRangeFilter: (chartId: string, field: string, min: number, max: number) => void;

    // Clear filters
    clearFilter: (chartId: string, field?: string) => void;
    clearAllFilters: () => void;

    // Get filters for a chart
    getFiltersForChart: (chartId: string) => CrossFilter[];
    getFilterQuery: (chartId: string) => Array<{ field: string; operator: string; value: unknown }>;

    // Check if chart has active filter
    hasActiveFilter: (chartId: string) => boolean;

    // All active filters
    activeFilters: CrossFilter[];
}

const CrossFilterContext = createContext<CrossFilterContextValue | null>(null);

interface CrossFilterProviderProps {
    children: React.ReactNode;
    linkedChartIds?: string[]; // Charts that filter each other
}

const AUTO_LINKED_GROUP_ID = 'dashboard-auto-linked-group';

export function CrossFilterProvider({ children, linkedChartIds }: CrossFilterProviderProps) {
    const {
        setFilter: setStoreFilter,
        clearFilter: clearStoreFilter,
        clearAllFilters: clearAllStoreFilters,
        getFiltersForChart: getFiltersForChartFromStore,
        buildFilterQuery: buildFilterQueryFromStore,
        linkCharts,
        activeFilters,
    } = useCrossFilterStore(
        useShallow((state) => ({
            setFilter: state.setFilter,
            clearFilter: state.clearFilter,
            clearAllFilters: state.clearAllFilters,
            getFiltersForChart: state.getFiltersForChart,
            buildFilterQuery: state.buildFilterQuery,
            linkCharts: state.linkCharts,
            activeFilters: state.activeFilters,
        }))
    );

    const linkedChartSignature = useMemo(() => {
        if (!linkedChartIds || linkedChartIds.length === 0) return '';
        return Array.from(new Set(linkedChartIds.filter(Boolean))).sort().join('|');
    }, [linkedChartIds]);

    // Link charts if provided (stable key to avoid update loops)
    React.useEffect(() => {
        const normalizedIds = linkedChartSignature ? linkedChartSignature.split('|') : [];
        const existing = useCrossFilterStore.getState().linkedGroups[AUTO_LINKED_GROUP_ID] || [];

        const isSame =
            existing.length === normalizedIds.length &&
            existing.every((id, index) => id === normalizedIds[index]);

        if (isSame) return;
        linkCharts(AUTO_LINKED_GROUP_ID, normalizedIds);
    }, [linkedChartSignature, linkCharts]);

    const setFilter = useCallback((chartId: string, field: string, value: string | number | null) => {
        setStoreFilter({ chartId, field, value, operator: '=' });
    }, [setStoreFilter]);

    const setMultiFilter = useCallback((chartId: string, field: string, values: (string | number)[]) => {
        setStoreFilter({ chartId, field, value: null, operator: 'in', values });
    }, [setStoreFilter]);

    const setRangeFilter = useCallback((chartId: string, field: string, min: number, max: number) => {
        setStoreFilter({ chartId, field, value: null, operator: 'range', range: { min, max } });
    }, [setStoreFilter]);

    const clearFilter = useCallback((chartId: string, field?: string) => {
        clearStoreFilter(chartId, field);
    }, [clearStoreFilter]);

    const getFiltersForChart = useCallback((chartId: string) => {
        return getFiltersForChartFromStore(chartId, true);
    }, [getFiltersForChartFromStore]);

    const getFilterQuery = useCallback((chartId: string) => {
        return buildFilterQueryFromStore(chartId);
    }, [buildFilterQueryFromStore]);

    const hasActiveFilter = useCallback((chartId: string) => {
        return activeFilters.some((f) => f.chartId === chartId);
    }, [activeFilters]);

    const contextValue = useMemo<CrossFilterContextValue>(() => ({
        setFilter,
        setMultiFilter,
        setRangeFilter,
        clearFilter,
        clearAllFilters: clearAllStoreFilters,
        getFiltersForChart,
        getFilterQuery,
        hasActiveFilter,
        activeFilters,
    }), [
        setFilter, 
        setMultiFilter, 
        setRangeFilter, 
        clearFilter, 
        clearAllStoreFilters,
        getFiltersForChart,
        getFilterQuery,
        hasActiveFilter,
        activeFilters,
    ]);

    return (
        <CrossFilterContext.Provider value={contextValue}>
            {children}
        </CrossFilterContext.Provider>
    );
}

// Hook to use cross filter in chart components
export function useCrossFilter(chartId: string) {
    const context = useContext(CrossFilterContext);
    
    if (!context) {
        // Return no-op functions if not in provider
        return {
            setFilter: () => {},
            setMultiFilter: () => {},
            setRangeFilter: () => {},
            clearMyFilters: () => {},
            appliedFilters: [],
            filterQuery: [],
            hasActiveFilter: false,
        };
    }

    return {
        setFilter: (field: string, value: string | number | null) => 
            context.setFilter(chartId, field, value),
        setMultiFilter: (field: string, values: (string | number)[]) => 
            context.setMultiFilter(chartId, field, values),
        setRangeFilter: (field: string, min: number, max: number) => 
            context.setRangeFilter(chartId, field, min, max),
        clearMyFilters: () => context.clearFilter(chartId),
        appliedFilters: context.getFiltersForChart(chartId),
        filterQuery: context.getFilterQuery(chartId),
        hasActiveFilter: context.hasActiveFilter(chartId),
    };
}

// Component to display active filters
interface ActiveFiltersBarProps {
    className?: string;
    fieldLabels?: Record<string, string>;
}

export function ActiveFiltersBar({ className, fieldLabels = {} }: ActiveFiltersBarProps) {
    const context = useContext(CrossFilterContext);

    if (!context || context.activeFilters.length === 0) {
        return null;
    }

    const getFieldLabel = (field: string) => fieldLabels[field] || field;

    const formatFilterValue = (filter: CrossFilter) => {
        if (filter.operator === 'range' && filter.range) {
            return `${filter.range.min} - ${filter.range.max}`;
        }
        if (filter.operator === 'in' && filter.values) {
            return filter.values.slice(0, 3).join(', ') + 
                (filter.values.length > 3 ? ` +${filter.values.length - 3}` : '');
        }
        return String(filter.value);
    };

    return (
        <div className={cn(
            'flex items-center gap-2 p-2 bg-muted/50 border-b flex-wrap',
            className
        )}>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Bộ lọc:</span>
            </div>

            {context.activeFilters.map((filter, index) => (
                <Badge 
                    key={`${filter.chartId}-${filter.field}-${index}`}
                    variant="secondary"
                    className="gap-1 pr-1"
                >
                    <span className="text-muted-foreground">{getFieldLabel(filter.field)}:</span>
                    <span className="font-medium">{formatFilterValue(filter)}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-destructive/20"
                        onClick={() => context.clearFilter(filter.chartId, filter.field)}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </Badge>
            ))}

            {context.activeFilters.length > 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={context.clearAllFilters}
                >
                    Xóa tất cả
                </Button>
            )}
        </div>
    );
}

// HOC to make any chart cross-filterable
export function withCrossFilter<P extends { 
    chartId?: string;
    data?: Record<string, unknown>[];
    onDataPointClick?: (data: Record<string, unknown>) => void;
}>(
    WrappedChart: React.ComponentType<P>,
    options?: {
        filterField?: string;
        highlightFiltered?: boolean;
    }
) {
    return function CrossFilterChart(props: P) {
        const chartId = props.chartId || `chart_${Math.random().toString(36).substr(2, 9)}`;
        const { setFilter, appliedFilters, hasActiveFilter, filterQuery } = useCrossFilter(chartId);

        const handleClick = (data: Record<string, unknown>) => {
            if (options?.filterField && data[options.filterField] !== undefined) {
                setFilter(options.filterField, data[options.filterField] as string | number);
            }
            props.onDataPointClick?.(data);
        };

        // Filter data based on applied filters
        const filteredData = useMemo(() => {
            if (!props.data || appliedFilters.length === 0) return props.data;

            return props.data.filter((item) => {
                return appliedFilters.every((filter) => {
                    const value = item[filter.field];
                    
                    if (filter.operator === 'range' && filter.range) {
                        return Number(value) >= filter.range.min && Number(value) <= filter.range.max;
                    }
                    if (filter.operator === 'in' && filter.values) {
                        return filter.values.includes(value as string | number);
                    }
                    return value === filter.value;
                });
            });
        }, [props.data, appliedFilters]);

        return (
            <div className={cn(hasActiveFilter && 'ring-2 ring-primary/30 rounded-lg')}>
                <WrappedChart
                    {...props}
                    chartId={chartId}
                    data={filteredData}
                    onDataPointClick={handleClick}
                />
            </div>
        );
    };
}
