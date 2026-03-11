"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DynamicChart } from "./DynamicChart.lazy";
import { useCrossFilter } from "./CrossFilterProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Filter, Home, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types";

export interface DrillFilter {
    field: string;
    operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
    value: string | number;
}

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
    onDrillDown?: (
        filters: DrillFilter[],
        newGroupBy?: string
    ) => Promise<Record<string, unknown>[]>;
    /** Dashboard-level drilldown: navigate to another tab with filters */
    onDashboardDrilldown?: (targetTabId: string, filters: Record<string, string>) => void;
    enableCrossFilter?: boolean;
    crossFilterField?: string;
    crossFilterFields?: string[];
}

function normalizeGroupBy(groupBy?: string | string[]): string[] {
    if (!groupBy) return [];
    return Array.isArray(groupBy) ? groupBy : [groupBy];
}

export function InteractiveChart({
    config,
    data: initialData,
    chartId,
    width = "100%",
    height = "100%",
    onDrillDown,
    onDashboardDrilldown,
    enableCrossFilter = false,
    crossFilterField,
    crossFilterFields,
}: InteractiveChartProps) {
    const [drillPath, setDrillPath] = useState<DrillLevel[]>([]);
    const [drillData, setDrillData] = useState<Record<string, unknown>[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const crossFilter = useCrossFilter(chartId);
    const originalXAxis = config.dataSource?.xAxis || "name";
    const groupByFields = useMemo(
        () => normalizeGroupBy(config.dataSource?.groupBy),
        [config.dataSource?.groupBy]
    );

    const drillHierarchy = useMemo(() => {
        const configured = (config.dataSource?.drillDownHierarchy || []).filter(Boolean);
        if (configured.length > 0) {
            return Array.from(new Set(configured));
        }

        const fallback = [
            config.dataSource?.xAxis,
            config.dataSource?.drillDownLabelField,
            ...groupByFields,
        ].filter(
            (field): field is string => Boolean(field)
        );
        return Array.from(new Set(fallback));
    }, [config.dataSource?.drillDownHierarchy, config.dataSource?.xAxis, groupByFields]);

    const currentData = drillData || initialData;
    const currentLevel = drillPath.length;
    const activeDrillField = drillHierarchy[currentLevel] || originalXAxis;
    const nextDrillField = drillHierarchy[currentLevel + 1];

    const canDrillDown = Boolean(onDrillDown && nextDrillField && currentData.length > 0);

    useEffect(() => {
        if (drillPath.length === 0) {
            setDrillData(null);
        }
    }, [initialData, drillPath.length]);

    const buildDrillFilters = useCallback((path: DrillLevel[]): DrillFilter[] => {
        return path.map((level) => ({
            field: level.field,
            operator: "=",
            value: level.value,
        }));
    }, []);

    const runDrillQuery = useCallback(
        async (newPath: DrillLevel[]) => {
            if (!onDrillDown) return;

            const filters = buildDrillFilters(newPath);
            const newGroupBy = drillHierarchy[newPath.length];

            setIsLoading(true);
            try {
                const newData = await onDrillDown(filters, newGroupBy);
                setDrillPath(newPath);
                setDrillData(newData);
            } catch (error) {
                console.error("Drill query error:", error);
            } finally {
                setIsLoading(false);
            }
        },
        [onDrillDown, buildDrillFilters, drillHierarchy]
    );

    const handleDrillDown = useCallback(
        async (value: string, label?: string, fieldOverride?: string) => {
            if (!onDrillDown) return;

            const field = fieldOverride || activeDrillField;
            const newLevel: DrillLevel = {
                field,
                value,
                label: label || value,
            };

            const newPath = [...drillPath, newLevel];
            await runDrillQuery(newPath);
        },
        [onDrillDown, activeDrillField, drillPath, runDrillQuery]
    );

    const handleDrillUp = useCallback(
        async (toLevel?: number) => {
            const targetLevel = toLevel ?? currentLevel - 1;
            if (targetLevel < 0) return;

            if (targetLevel === 0) {
                setDrillPath([]);
                setDrillData(null);
                return;
            }

            await runDrillQuery(drillPath.slice(0, targetLevel));
        },
        [currentLevel, drillPath, runDrillQuery]
    );

    const handleReset = useCallback(() => {
        setDrillPath([]);
        setDrillData(null);
    }, []);

    const resolvedCrossFilterFields = useMemo(() => {
        const configured = (crossFilterFields || config.dataSource?.crossFilterFields || []).filter(
            Boolean
        );

        if (configured.length > 0) {
            return Array.from(new Set(configured));
        }

        const fallback = [crossFilterField, config.dataSource?.xAxis, ...groupByFields].filter(
            (field): field is string => Boolean(field)
        );

        return Array.from(new Set(fallback));
    }, [
        crossFilterFields,
        config.dataSource?.crossFilterFields,
        crossFilterField,
        config.dataSource?.xAxis,
        groupByFields,
    ]);

    const handleDataPointClick = useCallback(
        (clickedData: Record<string, unknown>, field?: string) => {
            const drillField = field || activeDrillField || originalXAxis;
            const rawValue =
                clickedData[drillField] ??
                clickedData._drillValue ??
                clickedData[originalXAxis] ??
                clickedData.name;

            const label = String(clickedData.name ?? rawValue ?? "");

            // Priority 1: Dashboard drilldown (tab navigation)
            // Check if chart's tab has a drilldown config targeting another tab
            if (onDashboardDrilldown && rawValue !== undefined && rawValue !== null) {
                const ds = config.dataSource;
                const drilldownConfig = ((config as unknown) as Record<string, unknown>)._tabDrilldown as {
                    targetTabId?: string;
                    passFilters?: { sourceField: string; targetField: string }[];
                } | undefined;

                if (drilldownConfig?.targetTabId) {
                    const filters: Record<string, string> = {};
                    if (drilldownConfig.passFilters?.length) {
                        for (const pf of drilldownConfig.passFilters) {
                            const val = clickedData[pf.sourceField] ?? rawValue;
                            if (val !== undefined && val !== null) {
                                filters[pf.targetField] = String(val);
                            }
                        }
                    } else {
                        // Default: pass the clicked value with xAxis field
                        filters[drillField] = String(rawValue);
                    }
                    onDashboardDrilldown(drilldownConfig.targetTabId, filters);
                    return;
                }
            }

            // Priority 2: Data-level drill-down (re-query with hierarchy)
            if (rawValue !== undefined && rawValue !== null && canDrillDown && !isLoading) {
                handleDrillDown(String(rawValue), label, drillField);
                return;
            }

            // Priority 3: Cross-filter
            if (!enableCrossFilter || drillPath.length > 0) {
                return;
            }

            crossFilter.clearMyFilters();

            resolvedCrossFilterFields.forEach((crossField) => {
                const filterValue =
                    clickedData[crossField] ??
                    (crossField === originalXAxis ? rawValue : undefined);

                if (
                    filterValue !== undefined &&
                    filterValue !== null &&
                    String(filterValue).trim() !== ""
                ) {
                    crossFilter.setFilter(crossField, filterValue as string | number);
                }
            });
        },
        [
            activeDrillField,
            originalXAxis,
            canDrillDown,
            isLoading,
            handleDrillDown,
            onDashboardDrilldown,
            config,
            enableCrossFilter,
            drillPath.length,
            crossFilter,
            resolvedCrossFilterFields,
        ]
    );

    const currentConfig = useMemo(() => {
        if (drillPath.length === 0 || !drillData || drillData.length === 0) {
            return config;
        }

        const firstRow = drillData[0];
        const lastDrill = drillPath[drillPath.length - 1];
        const targetXAxis =
            drillHierarchy[drillPath.length] ||
            config.dataSource?.drillDownLabelField ||
            config.dataSource?.xAxis ||
            "name";

        let resolvedXAxis = targetXAxis;
        if (!(resolvedXAxis in firstRow)) {
            if (config.dataSource?.drillDownLabelField && config.dataSource.drillDownLabelField in firstRow) {
                resolvedXAxis = config.dataSource.drillDownLabelField;
            } else if ("name" in firstRow) {
                resolvedXAxis = "name";
            } else if (config.dataSource?.xAxis && config.dataSource.xAxis in firstRow) {
                resolvedXAxis = config.dataSource.xAxis;
            } else {
                resolvedXAxis = "_row_id";
            }
        }

        const hasNameField = "name" in firstRow;
        const hasValueField = "value" in firstRow;
        let drillYAxis = config.dataSource?.yAxis || ["value"];
        if (hasNameField && hasValueField && !drillYAxis.some((y) => y in firstRow)) {
            drillYAxis = ["value"];
        }

        return {
            ...config,
            name: `${config.name || "Chart"} - ${lastDrill?.label || "Chi tiet"}`,
            dataSource: {
                ...config.dataSource,
                xAxis: resolvedXAxis,
                yAxis: drillYAxis,
                groupBy: undefined,
            },
        };
    }, [config, drillPath, drillData, drillHierarchy]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
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
                        <span className="hidden sm:inline">Tong quan</span>
                        <span className="sm:hidden">Trang chu</span>
                    </Button>

                    {drillPath.map((level, index) => (
                        <React.Fragment key={`${level.field}-${level.value}-${index}`}>
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
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleDrillUp()}
                            disabled={isLoading}
                        >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Quay lai
                        </Button>
                    </div>
                </div>
            )}

            <div
                className={cn(
                    "relative flex-1 min-h-0 group",
                    enableCrossFilter && crossFilter.hasActiveFilter && "ring-2 ring-primary/30 rounded-lg"
                )}
            >
                {isLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/50 z-20 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Dang tai chi tiet...</span>
                        </div>
                    </div>
                )}

                {drillPath.length > 0 && !isLoading && (
                    <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary" className="gap-1 text-xs">
                            <Filter className="h-3 w-3" />
                            Chi tiet: {drillPath[drillPath.length - 1]?.value}
                        </Badge>
                    </div>
                )}

                {enableCrossFilter && drillPath.length === 0 && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                        {crossFilter.hasActiveFilter && (
                            <Badge
                                variant="secondary"
                                className="gap-1 cursor-pointer hover:bg-destructive/10 text-xs"
                                onClick={() => crossFilter.clearMyFilters()}
                            >
                                <Filter className="h-3 w-3" />
                                Dang loc
                                <X className="h-3 w-3" />
                            </Badge>
                        )}

                        {crossFilter.appliedFilters.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                                {crossFilter.appliedFilters.length} bo loc
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
