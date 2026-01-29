"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
// Use lazy-loaded DynamicChart to reduce bundle size
import { DynamicChart } from './DynamicChart.lazy';
import { useCrossFilter } from './CrossFilterProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, ChevronLeft, Filter, X, Layers, MousePointerClick, Home, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChartConfig } from '@/types';

// Drill filter for WHERE clause
export interface DrillFilter {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
    value: string | number;
}

// Drill level info
interface DrillLevel {
    field: string;
    value: string;
    label?: string;
}

interface InteractiveChartProps {
    config: ChartConfig;
    data: Record<string, unknown>[];
    chartId: string;
    width?: number | string;
    height?: number | string;
    // Drill-down callback - called when user clicks to drill down
    // Returns new data for the drilled view
    onDrillDown?: (filters: DrillFilter[], newGroupBy?: string) => Promise<Record<string, unknown>[]>;
    // Cross-filter
    enableCrossFilter?: boolean;
    crossFilterField?: string;
}

export function InteractiveChart({
    config,
    data: initialData,
    chartId,
    width = "100%",
    height = "100%",
    onDrillDown,
    enableCrossFilter = false,
    crossFilterField,
}: InteractiveChartProps) {
    // Drill-down state
    const [drillPath, setDrillPath] = useState<DrillLevel[]>([]);
    const [drillData, setDrillData] = useState<Record<string, unknown>[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Cross-filter hook
    const crossFilter = useCrossFilter(chartId);

    // Original xAxis field from config
    const originalXAxis = config.dataSource?.xAxis || 'name';

    // Current data (drilled or initial)
    const currentData = drillData || initialData;

    // Drill state - only 2 levels: overview (0) → detail (1)
    const currentLevel = drillPath.length;
    // Only allow drill at level 0 (overview) - max 1 drill to see detail
    const canDrillDown = currentLevel === 0 && currentData.length > 1 && Boolean(onDrillDown);
    const canDrillUp = currentLevel > 0;

    // Reset drill data when initial data changes
    useEffect(() => {
        if (drillPath.length === 0) {
            setDrillData(null);
        }
    }, [initialData, drillPath.length]);

    // Build filters from drill path
    const buildDrillFilters = useCallback((path: DrillLevel[]): DrillFilter[] => {
        return path.map(level => ({
            field: level.field,
            operator: '=' as const,
            value: level.value,
        }));
    }, []);

    // Drill-down action - fetch new data with filter
    const handleDrillDown = useCallback(async (value: string, label?: string, fieldOverride?: string) => {
        if (!onDrillDown) return;

        const newLevel: DrillLevel = {
            field: fieldOverride || originalXAxis,
            value,
            label: label || value,
        };

        const newPath = [...drillPath, newLevel];
        const filters = buildDrillFilters(newPath);

        setIsLoading(true);
        try {
            // Call parent to fetch new data with filters
            // Parent can decide new groupBy field for next level
            const newData = await onDrillDown(filters);
            setDrillPath(newPath);
            setDrillData(newData);
        } catch (error) {
            console.error('Drill-down error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [onDrillDown, originalXAxis, drillPath, buildDrillFilters]);

    // Drill up action
    const handleDrillUp = useCallback(async (toLevel?: number) => {
        const targetLevel = toLevel ?? (currentLevel - 1);

        if (targetLevel < 0) return;

        if (targetLevel === 0) {
            // Reset to initial
            setDrillPath([]);
            setDrillData(null);
            return;
        }

        // Re-fetch data for the target level
        if (onDrillDown) {
            const newPath = drillPath.slice(0, targetLevel);
            const filters = buildDrillFilters(newPath);

            setIsLoading(true);
            try {
                const newData = await onDrillDown(filters);
                setDrillPath(newPath);
                setDrillData(newData);
            } catch (error) {
                console.error('Drill-up error:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [currentLevel, drillPath, onDrillDown, buildDrillFilters]);

    // Reset drill
    const handleReset = useCallback(() => {
        setDrillPath([]);
        setDrillData(null);
    }, []);

    // Handle data point click
    const handleDataPointClick = useCallback((clickedData: Record<string, unknown>, field?: string) => {
        // Default behavior: Filter by the current X-axis dimension (e.g. Unit)
        // so we can see details FOR that unit.

        // Prioritize: _drillValue (original raw value) > originalXAxis > name
        const xValue = clickedData._drillValue ?? clickedData[originalXAxis] ?? clickedData['name'] ?? clickedData[field || ''];

        const label = (clickedData['name'] as string) || String(xValue);

        console.log('[InteractiveChart] Click Debug:', {
            clickedData,
            originalXAxis,
            resolvedValue: xValue
        });

        if (xValue !== undefined && canDrillDown && !isLoading) {
            // Drill down with WHERE filter using originalXAxis
            handleDrillDown(String(xValue), label, originalXAxis);
            return;
        }

        // Cross-filter (only if not drilling)
        if (enableCrossFilter && crossFilterField && drillPath.length === 0) {
            const filterValue = clickedData[crossFilterField];
            if (filterValue !== undefined) {
                crossFilter.setFilter(crossFilterField, filterValue as string | number);
            }
        }
    }, [originalXAxis, canDrillDown, isLoading, handleDrillDown, enableCrossFilter, crossFilterField, crossFilter, drillPath.length, config]);

    // Modify config for drill-down view
    const currentConfig = useMemo(() => {
        if (drillPath.length === 0 || !drillData || drillData.length === 0) {
            return config;
        }

        const firstRow = drillData[0];
        const lastDrill = drillPath[drillPath.length - 1];

        // Check what fields are available in drill data
        const hasNameField = 'name' in firstRow;
        const hasValueField = 'value' in firstRow;

        // Determine xAxis for drilled data:
        // Priority: drillDownLabelField (if configured) > 'name' field > original xAxis field > '_row_id'
        let drillXAxis = 'name';

        if (config.dataSource?.drillDownLabelField) {
            drillXAxis = config.dataSource.drillDownLabelField;
        } else if (!hasNameField) {
            drillXAxis = config.dataSource?.xAxis || '_row_id';
        }

        // For drill-down, if we have 'name' and 'value' (breakdown format), use them
        // Otherwise, keep original yAxis fields
        let drillYAxis = config.dataSource?.yAxis || ['value'];
        if (hasNameField && hasValueField && !config.dataSource?.yAxis?.some(y => y in firstRow)) {
            drillYAxis = ['value'];
        }

        return {
            ...config,
            name: `${config.name || 'Chart'} - ${lastDrill?.label || 'Chi tiết'}`,
            dataSource: {
                ...config.dataSource,
                xAxis: drillXAxis,
                yAxis: drillYAxis,
                // Remove groupBy for detailed view
                groupBy: undefined,
            },
        };
    }, [config, drillPath, drillData]);

    // Render chart with drill-down UI
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Drill-down breadcrumb navigation - Responsive */}
            {drillPath.length > 0 && (
                <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border-b bg-slate-50 dark:bg-slate-900 flex-wrap text-xs sm:text-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-6 px-2 text-xs touch-manipulation"
                        onClick={handleReset}
                        disabled={isLoading}
                    >
                        <Home className="h-3.5 w-3.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden sm:inline">Tổng quan</span>
                        <span className="sm:hidden">Trang chủ</span>
                    </Button>

                            {drillPath.map((level, index) => (
                                <React.Fragment key={index}>
                                    <ChevronRight className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 sm:h-6 px-2 text-xs font-medium touch-manipulation"
                                onClick={() => handleDrillUp(index + 1)}
                                disabled={isLoading}
                            >
                                <span className="text-muted-foreground mr-1">{level.field}:</span>
                                {level.label || level.value}
                            </Button>
                        </React.Fragment>
                    ))}

                    <div className="ml-auto flex items-center gap-2">
                        {isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleDrillUp()}
                            disabled={isLoading}
                        >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Quay lại
                        </Button>
                    </div>
                </div>
            )}

            {/* Chart container */}
            <div className={cn(
                "relative flex-1 min-h-0 group",
                enableCrossFilter && crossFilter.hasActiveFilter && "ring-2 ring-primary/30 rounded-lg"
            )}>
                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/50 z-20 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Đang tải chi tiết...</span>
                        </div>
                    </div>
                )}

                {/* Drill-down indicator */}
                {/* {drillPath.length === 0 && canDrillDown && (
                    <div className="absolute top-2 right-2 z-10">
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge
                                    variant="outline"
                                    className="gap-1 bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 opacity-60 group-hover:opacity-100 transition-opacity cursor-default"
                                >
                                    <Layers className="h-3 w-3" />
                                    <span className="text-[10px]">Click để xem chi tiết</span>
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Click vào cột/điểm để xem dữ liệu chi tiết</p>
                                <p className="text-xs text-muted-foreground">(WHERE {originalXAxis} = giá trị)</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )} */}

                {/* Drill level indicator when drilled */}
                {drillPath.length > 0 && !isLoading && (
                    <div className="absolute top-2 right-2 z-10">
                        <Badge
                            variant="secondary"
                            className="gap-1 text-xs"
                        >
                            <Filter className="h-3 w-3" />
                            Chi tiết: {drillPath[drillPath.length - 1]?.value}
                        </Badge>
                    </div>
                )}

                {/* Cross-filter indicators */}
                {enableCrossFilter && drillPath.length === 0 && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                        {crossFilter.hasActiveFilter && (
                            <Badge
                                variant="secondary"
                                className="gap-1 cursor-pointer hover:bg-destructive/10 text-xs"
                                onClick={() => crossFilter.clearMyFilters()}
                            >
                                <Filter className="h-3 w-3" />
                                Đang lọc
                                <X className="h-3 w-3" />
                            </Badge>
                        )}

                        {crossFilter.appliedFilters.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                                {crossFilter.appliedFilters.length} bộ lọc
                            </Badge>
                        )}
                    </div>
                )}

                <DynamicChart
                    config={currentConfig}
                    data={currentData}
                    width={width}
                    height={height}
                    onDataPointClick={!isLoading ? handleDataPointClick : undefined}
                    enableDrillDown={canDrillDown && !isLoading}
                    enableCrossFilter={enableCrossFilter && drillPath.length === 0}
                    chartId={chartId}
                />
            </div>
        </div>
    );
}
