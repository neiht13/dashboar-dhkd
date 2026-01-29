"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useChartStore } from "@/stores/chart-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Move, GripVertical, Maximize2, BarChart3, Copy, Edit2, Settings } from "lucide-react";
import { InteractiveChart } from "@/components/charts/InteractiveChart";
import { StatCard } from "@/components/charts/StatCard";
import { CrossFilterProvider, ActiveFiltersBar } from "@/components/charts/CrossFilterProvider";
import { cn, generateId } from "@/lib/utils";
import { useIsMobile, useIsTablet } from "@/hooks/use-responsive";
import { processChartData, buildChartDataRequest, createCompositeLabel } from "@/lib/chart-data-utils";
import { useBatchChartData } from "@/hooks/use-chart-data-processing";
import type { Widget, LayoutItem, ChartConfig as ChartConfigType } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardGridProps {
    onWidgetDrop?: (x: number, y: number) => void;
    refreshTrigger?: Date | null; // Trigger to force refresh
    onDataUpdated?: (timestamp: Date) => void; // Callback when data is updated
}

// Widget size presets
const SIZE_PRESETS = {
    small: { w: 3, h: 3, label: "Nhỏ" },
    medium: { w: 6, h: 4, label: "Vừa" },
    large: { w: 9, h: 5, label: "Lớn" },
    full: { w: 12, h: 6, label: "Toàn bộ" },
};

const CHART_TYPES = [
    { value: "bar", label: "Cột (Bar)" },
    { value: "line", label: "Đường (Line)" },
    { value: "area", label: "Vùng (Area)" },
    { value: "pie", label: "Tròn (Pie)" },
    { value: "donut", label: "Donut" },
    { value: "gauge", label: "Tốc độ (Gauge)" },
    { value: "radar", label: "Radar" },
    { value: "scatter", label: "Phân tán (Scatter)" },
];

const GRID_COLS = 12;
const GRID_COLS_MOBILE = 1; // Single column on mobile
const CELL_HEIGHT = 60;
const CELL_HEIGHT_MOBILE = 50; // Smaller cells on mobile
const GAP = 16;
const GAP_MOBILE = 12; // Smaller gap on mobile

// Helper to check collision
const itemsCollide = (a: LayoutItem, b: LayoutItem) => {
    return a.i !== b.i &&
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
};

// Helper to resolve layout collisions (simple push down)
const resolveLayout = (layout: LayoutItem[], activeId: string): LayoutItem[] => {
    const sorted = [...layout].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });

    let hasChanges = true;
    let limit = 0;

    while (hasChanges && limit < 100) {
        hasChanges = false;
        limit++;

        for (let i = 0; i < sorted.length; i++) {
            const itemA = sorted[i];

            for (let j = 0; j < sorted.length; j++) {
                if (i === j) continue;
                const itemB = sorted[j];

                if (itemsCollide(itemA, itemB)) {
                    if (itemA.i === activeId) {
                        itemB.y = itemA.y + itemA.h;
                        hasChanges = true;
                    } else if (itemB.i === activeId) {
                        itemA.y = itemB.y + itemB.h;
                        hasChanges = true;
                    } else {
                        const lower = itemA.y >= itemB.y ? itemA : itemB;
                        const upper = itemA.y >= itemB.y ? itemB : itemA;
                        lower.y = upper.y + upper.h;
                        hasChanges = true;
                    }
                }
            }
        }
    }
    return sorted;
};

// Delete Widget Button Component
function DeleteWidgetButton({ widgetId }: { widgetId: string }) {
    const { removeWidget } = useDashboardStore();
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            removeWidget(widgetId);
            setIsOpen(false);
        } catch (error) {
            console.error("Error removing widget:", error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="h-5 w-5 text-white hover:bg-red-500 rounded flex items-center justify-center transition-colors"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsOpen(true);
                    }}
                    title="Xóa"
                >
                    <X className="h-3 w-3" />
                </button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-60 p-3 z-50" 
                align="end" 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-slate-900">Xóa Widget?</h4>
                    <p className="text-xs text-slate-600">Hành động này không thể hoàn tác.</p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setIsOpen(false);
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleDelete}
                        >
                            Xóa
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function DashboardGrid({ refreshTrigger, onDataUpdated }: DashboardGridProps = {}) {
    const {
        currentDashboard,
        removeWidget,
        updateWidget,
        updateLayout, // Get updateLayout
        addWidget,
        isEditing,
        globalFilters, // Get global filters
    } = useDashboardStore();

    const [containerWidth, setContainerWidth] = useState(1200); // Default fallback
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();

    const router = useRouter();
    const { charts } = useChartStore();

    const gridRef = useRef<HTMLDivElement>(null);
    const [showSizeMenu, setShowSizeMenu] = useState<string | null>(null);

    // Responsive grid configuration
    const gridCols = isMobile ? GRID_COLS_MOBILE : GRID_COLS;
    const cellHeight = isMobile ? CELL_HEIGHT_MOBILE : CELL_HEIGHT;
    const gap = isMobile ? GAP_MOBILE : GAP;

    // Measure container width
    useEffect(() => {
        if (!gridRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(gridRef.current);
        return () => resizeObserver.disconnect();
    }, []);
    const [chartDataCache, setChartDataCache] = useState<Record<string, any[]>>({});

    // Clear cache when widget is removed
    useEffect(() => {
        if (!currentDashboard) return;
        const currentWidgetIds = new Set(currentDashboard.widgets.map(w => w.id));
        const cachedWidgetIds = Object.keys(chartDataCache);
        
        // Remove cache for widgets that no longer exist
        const widgetsToRemove = cachedWidgetIds.filter(id => !currentWidgetIds.has(id));
        if (widgetsToRemove.length > 0) {
            setChartDataCache(prev => {
                const newCache = { ...prev };
                widgetsToRemove.forEach(id => delete newCache[id]);
                return newCache;
            });
        }
    }, [currentDashboard?.widgets, chartDataCache]);
    const [chartTypeOverrides, setChartTypeOverrides] = useState<Record<string, string>>({});
    const [gridRows, setGridRows] = useState(8);
    const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);

    // Edit dialog state
    const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
    const [editForm, setEditForm] = useState({
        // Common
        name: "",
        // Chart specific
        chartType: "bar",
        colors: [] as string[],
        // Text widget
        content: "",
        fontSize: 16,
        fontWeight: "normal" as "normal" | "bold",
        textAlign: "left" as "left" | "center" | "right",
        textColor: "#0F172A",
        // Image widget
        imageUrl: "",
        imageAlt: "",
        objectFit: "contain" as "contain" | "cover" | "fill",
        // Iframe widget  
        iframeUrl: "",
        allowFullscreen: true,
    });

    const { setNodeRef, isOver } = useDroppable({
        id: "dashboard-grid",
    });

    // Calculate grid rows based on widget positions
    useEffect(() => {
        if (!currentDashboard) return;

        let maxRow = 8;
        currentDashboard.widgets.forEach(widget => {
            const y = widget.layout?.y || 0;
            const h = widget.layout?.h || 3;
            maxRow = Math.max(maxRow, y + h + 2);
        });
        setGridRows(maxRow);
    }, [currentDashboard?.widgets]);

    // Fetch chart data for chart widgets using batch endpoint
    useEffect(() => {
        if (!currentDashboard) return;

        // Collect all chart widgets that need data fetching
        const chartWidgets = currentDashboard.widgets.filter(
            widget => widget.type === "chart" && 
            !chartDataCache[widget.id] // Only fetch if not cached
        );

        if (chartWidgets.length === 0) return;

        const fetchAllChartData = async () => {
            // Build batch requests
            const batchRequests = chartWidgets.map(widget => {
                const widgetConfig = widget.config as ChartConfigType;
                const chartConfig = charts.find(c => c.id === widgetConfig.chartId)?.config || widgetConfig;
                const isCard = chartConfig.type === 'card';

                // Handle import mode - process locally
                if (chartConfig.dataSource?.queryMode === 'import' && chartConfig.dataSource?.importedData) {
                    const rawData = chartConfig.dataSource.importedData as Record<string, unknown>[];
                    const xAxis = chartConfig.dataSource.xAxis;
                    const yAxis = chartConfig.dataSource.yAxis || [];
                    const groupByFields = chartConfig.dataSource.groupBy;
                    const orderByField = chartConfig.dataSource.orderBy;
                    const orderDir = chartConfig.dataSource.orderDirection || 'asc';
                    const limitNum = chartConfig.dataSource.limit || 0;

                    // Process import data using shared utility
                    const processedData = processChartData(rawData, {
                        xAxis,
                        yAxis,
                        aggregation: chartConfig.dataSource.aggregation || 'sum',
                        groupBy: groupByFields,
                        orderBy: orderByField,
                        orderDirection: orderDir,
                        limit: limitNum,
                        drillDownLabelField: chartConfig.dataSource.drillDownLabelField,
                    });

                    setChartDataCache(prev => ({
                        ...prev,
                        [widget.id]: processedData,
                    }));
                    return null; // Skip API call for import mode
                }

                // Build request for API-based charts
                if (!chartConfig.dataSource?.table || (!isCard && !chartConfig.dataSource?.xAxis) || !chartConfig.dataSource?.yAxis?.length) {
                    return null;
                }

                // Build request body using shared utility
                const requestBody = buildChartDataRequest(chartConfig.dataSource, globalFilters);

                const { queryMode, customQuery, connectionId } = chartConfig.dataSource;

                return {
                    widgetId: widget.id,
                    config: {
                        table: chartConfig.dataSource.table,
                        xAxis: isCard ? undefined : chartConfig.dataSource.xAxis,
                        yAxis: chartConfig.dataSource.yAxis,
                        aggregation: chartConfig.dataSource.aggregation || "sum",
                        groupBy: chartConfig.dataSource.groupBy || undefined,
                        orderBy: chartConfig.dataSource.orderBy,
                        orderDirection: chartConfig.dataSource.orderDirection,
                        limit: chartConfig.dataSource.limit || undefined,
                        filters: savedFilters,
                        connectionId,
                        queryMode,
                        customQuery,
                        drillDownLabelField: chartConfig.dataSource.drillDownLabelField,
                        resolution: chartConfig.dataSource.resolution,
                    },
                };
            }).filter((req): req is NonNullable<typeof req> => req !== null);

            if (batchRequests.length === 0) return;

            try {
                // Fetch all charts in a single batch request
                const response = await fetch("/api/database/chart-data/batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ requests: batchRequests }),
                });

                const result = await response.json();
                if (result.success && result.data) {
                    // Process each chart's data (same post-processing as before)
                    const newCache: Record<string, any[]> = {};
                    
                    batchRequests.forEach(req => {
                        const widget = chartWidgets.find(w => w.id === req.widgetId);
                        if (!widget) return;
                        
                        const widgetConfig = widget.config as ChartConfigType;
                        const chartConfig = charts.find(c => c.id === widgetConfig.chartId)?.config || widgetConfig;
                        let chartData = result.data[req.widgetId] || [];

                        if (chartData.length > 0) {
                            const xAxis = chartConfig.dataSource?.xAxis;
                            const groupByFields = chartConfig.dataSource?.groupBy;
                            const groupByArr = Array.isArray(groupByFields) ? groupByFields : groupByFields ? [groupByFields] : [];
                            const queryMode = chartConfig.dataSource?.queryMode;
                            const aggregation = chartConfig.dataSource?.aggregation || "sum";

                            // Post-process custom SQL mode using shared utility
                            if (queryMode === 'custom' && xAxis && chartConfig.dataSource?.yAxis?.length) {
                                chartData = processChartData(chartData, {
                                    xAxis,
                                    yAxis: chartConfig.dataSource.yAxis,
                                    aggregation: aggregation as any,
                                    groupBy: groupByArr,
                                    drillDownLabelField: chartConfig.dataSource.drillDownLabelField,
                                });
                                
                                // Add _drillValue for backward compatibility
                                chartData = chartData.map((row: any) => ({
                                    ...row,
                                    _drillValue: row._drillValue || row[xAxis],
                                }));
                            } else if (xAxis && groupByArr.length > 0) {
                                // Simple mode: just create composite labels
                                chartData = chartData.map((row: any) => {
                                    const labelParts = [String(row[xAxis] || ''), ...groupByArr.map(g => String(row[g] || ''))];
                                    return {
                                        ...row,
                                        _drillValue: row[xAxis],
                                        [xAxis]: labelParts.join(' - '),
                                    };
                                });
                            }
                        }

                        newCache[req.widgetId] = chartData;
                    });

                    setChartDataCache(prev => ({
                        ...prev,
                        ...newCache,
                    }));
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error("Error fetching batch chart data:", error.message);
                } else {
                    console.error("Error fetching batch chart data:", String(error));
                }
            }
        };

        fetchAllChartData();
    }, [currentDashboard?.widgets, charts, globalFilters, refreshTrigger]);

    // Clear cache when refresh is triggered
    useEffect(() => {
        if (refreshTrigger) {
            setChartDataCache({});
        }
    }, [refreshTrigger]);

    // Legacy single chart fetch (kept for drill-down and manual refresh)
    const fetchChartData = useCallback(async (widgetId: string, config: ChartConfigType) => {
        const isCard = config.type === 'card';

        // Handle import mode - aggregate imported data locally
        if (config.dataSource?.queryMode === 'import' && config.dataSource?.importedData) {
            const rawData = config.dataSource.importedData as Record<string, unknown>[];
            const xAxis = config.dataSource.xAxis;
            const yAxis = config.dataSource.yAxis || [];
            const groupByFields = config.dataSource.groupBy;
            const orderByField = config.dataSource.orderBy;
            const orderDir = config.dataSource.orderDirection || 'asc';
            const limitNum = config.dataSource.limit || 0;

            // Aggregate data if xAxis and yAxis are provided
            let processedData = rawData;
            if (xAxis && yAxis.length > 0) {
                // Build group key from xAxis + groupBy
                const groupByArr = Array.isArray(groupByFields) ? groupByFields : groupByFields ? [groupByFields] : [];
                const groupFields = [xAxis, ...groupByArr];

                const groups: Record<string, Record<string, unknown>> = {};
                rawData.forEach(row => {
                    const key = groupFields.map(f => String(row[f] || '')).join('|||');
                    if (!groups[key]) {
                        groups[key] = {};
                        groupFields.forEach(f => { groups[key][f] = row[f]; });
                        yAxis.forEach(y => { groups[key][y] = 0; });
                        groups[key]._count = 0;
                        // Create composite label if groupBy exists
                        if (groupByArr.length > 0) {
                            const labelParts = [String(row[xAxis] || ''), ...groupByArr.map(g => String(row[g] || ''))];
                            groups[key]._compositeLabel = labelParts.join(' - ');
                        }
                    }
                    (groups[key]._count as number)++;
                    yAxis.forEach(y => {
                        const val = Number(row[y]) || 0;
                        (groups[key][y] as number) += val;
                    });
                });
                processedData = Object.values(groups);

                // If groupBy exists, override xAxis value with composite label
                if (groupByArr.length > 0) {
                    processedData = processedData.map(row => ({
                        ...row,
                        [xAxis as string]: row._compositeLabel || row[xAxis as string],
                    }));
                }
            }

            // Apply sorting
            if (orderByField) {
                processedData = [...processedData].sort((a, b) => {
                    const aVal = a[orderByField];
                    const bVal = b[orderByField];
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                        return orderDir === 'asc' ? aVal - bVal : bVal - aVal;
                    }
                    return orderDir === 'asc'
                        ? String(aVal || '').localeCompare(String(bVal || ''))
                        : String(bVal || '').localeCompare(String(aVal || ''));
                });
            }

            // Apply limit
            if (limitNum > 0) {
                processedData = processedData.slice(0, limitNum);
            }

            setChartDataCache(prev => ({
                ...prev,
                [widgetId]: processedData,
            }));
            return;
        }

        if (!config.dataSource?.table || (!isCard && !config.dataSource?.xAxis) || !config.dataSource?.yAxis?.length) {
            return;
        }

        try {
            // Start with saved filters from chart config
            const savedFilters = [...(config.dataSource.filters || [])];

            // Apply global filters ONLY if chart has date columns configured
            const startCol = config.dataSource.startDateColumn;
            const endCol = config.dataSource.endDateColumn;

            if (startCol && globalFilters.dateRange?.from) {
                const fromDate = globalFilters.dateRange.from instanceof Date
                    ? globalFilters.dateRange.from.toISOString().split('T')[0]
                    : globalFilters.dateRange.from;
                savedFilters.push({
                    field: startCol,
                    operator: '>=' as const,
                    value: fromDate
                });
            }

            if (endCol && globalFilters.dateRange?.to) {
                const toDate = globalFilters.dateRange.to instanceof Date
                    ? globalFilters.dateRange.to.toISOString().split('T')[0]
                    : globalFilters.dateRange.to;
                savedFilters.push({
                    field: endCol,
                    operator: '<=' as const,
                    value: toDate
                });
            }

            const { queryMode, customQuery, connectionId } = config.dataSource;

            // Build request payload using shared utility
            const requestBody = buildChartDataRequest(config.dataSource, globalFilters);
            
            // Override xAxis for card type and add custom query if needed
            if (isCard) {
                requestBody.xAxis = undefined;
            }
            if (queryMode === 'custom' && customQuery) {
                requestBody.customQuery = customQuery;
            }

            const response = await fetch("/api/database/chart-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            if (result.success && result.data) {
                let chartData = result.data as Record<string, unknown>[];

                const xAxis = config.dataSource.xAxis;
                const groupByFields = config.dataSource.groupBy;
                const groupByArr = Array.isArray(groupByFields) ? groupByFields : groupByFields ? [groupByFields] : [];
                const aggregation = config.dataSource.aggregation || "sum";

                // Nếu là custom SQL: group lại theo giao diện (Cột X + groupBy) để đảm bảo giống thiết kế
                if (queryMode === 'custom' && xAxis && config.dataSource.yAxis?.length) {
                    const yFields = config.dataSource.yAxis;
                    const groups: Record<string, any> = {};

                    chartData.forEach(row => {
                        const keyFields = [xAxis, ...groupByArr];
                        const key = keyFields.map(f => String(row[f] ?? "")).join("|||");
                        if (!groups[key]) {
                            groups[key] = { _count: 0 } as any;
                            keyFields.forEach(f => { groups[key][f] = row[f]; });
                            yFields.forEach(y => {
                                groups[key][y] =
                                    aggregation === "min"
                                        ? Infinity
                                        : aggregation === "max"
                                            ? -Infinity
                                            : 0;
                            });
                            // Composite label cho xAxis
                            if (groupByArr.length > 0) {
                                const labelParts = keyFields.map(f => String(row[f] ?? ""));
                                groups[key]._compositeLabel = labelParts.join(" - ");
                            }
                        }
                        groups[key]._count++;
                        yFields.forEach(y => {
                            const val = Number(row[y]) || 0;
                            if (aggregation === "sum" || aggregation === "avg") {
                                groups[key][y] += val;
                            } else if (aggregation === "min") {
                                groups[key][y] = Math.min(groups[key][y], val);
                            } else if (aggregation === "max") {
                                groups[key][y] = Math.max(groups[key][y], val);
                            }
                        });

                        // DashboardGrid Inline Aggregation: Handle drillDownLabelField (MAX)
                        const drillLabelField = config.dataSource.drillDownLabelField;
                        if (drillLabelField && row[drillLabelField]) {
                            const currentLabel = String(groups[key][drillLabelField] || '');
                            const newLabel = String(row[drillLabelField]);
                            if (newLabel.localeCompare(currentLabel) > 0) {
                                groups[key][drillLabelField] = newLabel;
                            }
                        }
                    });

                    chartData = Object.values(groups).map((g: any) => {
                        const row: any = { ...g };
                        // avg / count
                        if (aggregation === "avg") {
                            config.dataSource.yAxis.forEach(y => {
                                row[y] = row[y] / g._count;
                            });
                        } else if (aggregation === "count") {
                            config.dataSource.yAxis.forEach(y => {
                                row[y] = g._count;
                            });
                        }
                        delete row._count;

                        // Store original value for drill-down
                        if (xAxis) {
                            row._drillValue = row[xAxis];
                        }

                        if (row._compositeLabel && xAxis) {
                            row[xAxis] = row._compositeLabel;
                            delete row._compositeLabel;
                        }
                        return row;
                    });
                } else if (xAxis && groupByArr.length > 0) {
                    // Simple mode: chỉ join label hiển thị
                    chartData = chartData.map((row) => {
                        const labelParts = [String(row[xAxis] || ''), ...groupByArr.map(g => String(row[g] || ''))];
                        return {
                            ...row,
                            _drillValue: row[xAxis], // Store original value
                            [xAxis]: labelParts.join(' - '),
                        };
                    });
                }

                setChartDataCache(prev => ({
                    ...prev,
                    [widgetId]: chartData,
                }));
            }
        } catch (error) {
            // Log error (sanitized - no sensitive data)
            if (error instanceof Error) {
                console.error("Error fetching chart data:", error.message);
            } else {
                console.error("Error fetching chart data:", String(error));
            }
        }
    }, [globalFilters, charts]);

    useEffect(() => {
        if (!currentDashboard) return;

        currentDashboard.widgets.forEach(widget => {
            if (widget.type === "chart") {
                // Get the widget's stored config
                const widgetConfig = widget.config as ChartConfigType;

                // Look up the LATEST chart config from the chart store by ID
                // This ensures we use updated filters/settings if the chart was re-saved
                const latestChart = charts.find(c => c.id === widgetConfig.id);
                const config = latestChart || widgetConfig; // Fallback to widget config if not found

                fetchChartData(widget.id, config);
            }
        });
    }, [currentDashboard, fetchChartData]); // Add charts dependency

    // Fetch drill-down data: WHERE filter, NO GROUP BY - show raw records
    const fetchDrillDownData = useCallback(async (
        config: ChartConfigType,
        drillFilters: Array<{ field: string; operator: string; value: string | number }>
    ): Promise<Record<string, unknown>[]> => {
        // Handle import mode - filter imported data locally
        if (config.dataSource?.queryMode === 'import' && config.dataSource?.importedData) {
            const xAxisField = config.dataSource.xAxis;
            const labelField = config.dataSource.drillDownLabelField || xAxisField;

            // Filter the imported data based on drill filters
            let filteredData = [...config.dataSource.importedData] as Record<string, unknown>[];

            drillFilters.forEach(f => {
                filteredData = filteredData.filter(row => {
                    const rowValue = row[f.field];
                    return String(rowValue) === String(f.value);
                });
            });

            // Aggregate filtered data by labelField
            const groups: Record<string, any> = {};
            const yAxisFields = config.dataSource.yAxis || [];
            // Default aggregation to sum for import if not specified
            const agg = config.dataSource.aggregation || 'sum';

            filteredData.forEach(row => {
                // Use labelField as grouping key
                const key = String(row[labelField] || row[xAxisField] || 'Unknown');

                if (!groups[key]) {
                    groups[key] = { _count: 0 };
                    if (labelField) groups[key][labelField] = key;
                    if (xAxisField) groups[key][xAxisField] = key; // Keep consistent
                    // Init Y fields
                    yAxisFields.forEach(y => {
                        groups[key][y] = agg === 'min' ? Infinity : (agg === 'max' ? -Infinity : 0);
                    });
                }
                groups[key]._count++;

                yAxisFields.forEach(y => {
                    const val = Number(row[y]) || 0;
                    if (agg === 'sum' || agg === 'avg') {
                        groups[key][y] += val;
                    } else if (agg === 'min') {
                        groups[key][y] = Math.min(groups[key][y], val);
                    } else if (agg === 'max') {
                        groups[key][y] = Math.max(groups[key][y], val);
                    }
                });
            });

            return Object.values(groups).map((g: any, index) => {
                const row: any = { ...g };
                if (agg === 'avg') {
                    yAxisFields.forEach(y => {
                        row[y] = row[y] / g._count;
                    });
                } else if (agg === 'count') {
                    yAxisFields.forEach(y => {
                        row[y] = g._count;
                    });
                }
                delete row._count;
                return {
                    ...row,
                    _row_id: index + 1,
                    _label: row[labelField] || row[xAxisField] || `#${index + 1}`,
                    name: row[labelField] || row[xAxisField] || `#${index + 1}`,
                };
            });
        }

        // Handle Custom SQL mode - re-query with drill filters and aggregate like outer chart
        if (config.dataSource?.queryMode === 'custom' && config.dataSource?.customQuery) {
            try {
                const xAxisField = config.dataSource.xAxis;
                const yAxisFields = config.dataSource.yAxis || [];
                const aggregation = config.dataSource.aggregation || 'sum';
                const groupByFields = config.dataSource.groupBy;
                const groupByArr = Array.isArray(groupByFields) ? groupByFields : groupByFields ? [groupByFields] : [];

                // Modify the custom query to add WHERE conditions for drill filters
                // IMPORTANT: We send filters as separate parameters to API for safe parameterized queries
                // The API will handle building safe WHERE clauses
                const customQuery = config.dataSource.customQuery;

                // Build safe filter array for API
                const safeFilters: Array<{ field: string; operator: string; value: string | number }> = [];
                
                drillFilters.forEach(f => {
                    // Validate field name (sanitize)
                    const sanitizedField = f.field.replace(/[^a-zA-Z0-9_\[\]]/g, '');
                    if (sanitizedField && sanitizedField === f.field) {
                        safeFilters.push({
                            field: sanitizedField,
                            operator: f.operator || '=',
                            value: f.value,
                        });
                    }
                });

                // Add global date filters as safe parameters
                const startCol = config.dataSource.startDateColumn;
                const endCol = config.dataSource.endDateColumn;

                if (startCol && globalFilters.dateRange?.from) {
                    const sanitizedStartCol = startCol.replace(/[^a-zA-Z0-9_\[\]]/g, '');
                    if (sanitizedStartCol === startCol) {
                        const fromDate = globalFilters.dateRange.from instanceof Date
                            ? globalFilters.dateRange.from.toISOString().split('T')[0]
                            : globalFilters.dateRange.from;
                        safeFilters.push({
                            field: sanitizedStartCol,
                            operator: '>=',
                            value: fromDate,
                        });
                    }
                }

                if (endCol && globalFilters.dateRange?.to) {
                    const sanitizedEndCol = endCol.replace(/[^a-zA-Z0-9_\[\]]/g, '');
                    if (sanitizedEndCol === endCol) {
                        const toDate = globalFilters.dateRange.to instanceof Date
                            ? globalFilters.dateRange.to.toISOString().split('T')[0]
                            : globalFilters.dateRange.to;
                        safeFilters.push({
                            field: sanitizedEndCol,
                            operator: '<=',
                            value: toDate,
                        });
                    }
                }

                const response = await fetch("/api/database/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customQuery: customQuery.trim(),
                        connectionId: config.dataSource.connectionId,
                        filters: safeFilters, // Send filters as separate parameterized array
                    }),
                });

                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    let chartData = result.data as Record<string, unknown>[];

                    // Apply same aggregation logic using shared utility
                    if (xAxisField && yAxisFields.length > 0) {
                        chartData = processChartData(chartData, {
                            xAxis: config.dataSource.drillDownLabelField || xAxisField,
                            yAxis: yAxisFields,
                            aggregation,
                            groupBy: groupByArr,
                            drillDownLabelField: config.dataSource.drillDownLabelField,
                        });
                    }

                    return chartData;
                }
                return [];
            } catch (error) {
                // Log error (sanitized - no sensitive data)
                if (error instanceof Error) {
                    console.error("Error fetching Custom SQL drill-down data:", error.message);
                } else {
                    console.error("Error fetching Custom SQL drill-down data:", String(error));
                }
                return [];
            }
        }

        if (!config.dataSource?.table || !config.dataSource?.yAxis?.length) {
            return [];
        }

        try {
            const table = config.dataSource.table;
            const yAxisFields = config.dataSource.yAxis;
            const xAxisField = config.dataSource.xAxis;
            // Use drillDownLabelField if configured, otherwise fall back to xAxis
            const labelField = config.dataSource.drillDownLabelField || xAxisField;

            // Build WHERE conditions from drill filters
            const whereConditions: string[] = [];

            // Add drill filters (WHERE donvi = 'TTVT1')
            drillFilters.forEach(f => {
                const field = f.field.replace(/[^\w]/g, '');
                const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                whereConditions.push(`[${field}] = ${value}`);
            });

            // Add saved filters from chart config
            (config.dataSource.filters || []).forEach(f => {
                const field = f.field.replace(/[^\w]/g, '');
                const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                whereConditions.push(`[${field}] ${f.operator} ${value}`);
            });

            // Add global date filters if configured
            const startCol = config.dataSource.startDateColumn;
            const endCol = config.dataSource.endDateColumn;

            if (startCol && globalFilters.dateRange?.from) {
                const fromDate = globalFilters.dateRange.from instanceof Date
                    ? globalFilters.dateRange.from.toISOString().split('T')[0]
                    : globalFilters.dateRange.from;
                whereConditions.push(`[${startCol}] >= '${fromDate}'`);
            }

            if (endCol && globalFilters.dateRange?.to) {
                const toDate = globalFilters.dateRange.to instanceof Date
                    ? globalFilters.dateRange.to.toISOString().split('T')[0]
                    : globalFilters.dateRange.to;
                whereConditions.push(`[${endCol}] <= '${toDate}'`);
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            // Build SELECT columns - GROUP BY with aggregation
            const yAxisSelect = yAxisFields.map(f => {
                const field = `[${f.replace(/[^\w]/g, '')}]`;
                const agg = config.dataSource.aggregation || 'sum';
                switch (agg) {
                    case 'avg': return `AVG(${field}) as [${f}]`;
                    case 'min': return `MIN(${field}) as [${f}]`;
                    case 'max': return `MAX(${field}) as [${f}]`;
                    case 'count': return `COUNT(${field}) as [${f}]`;
                    case 'sum':
                    default: return `SUM(${field}) as [${f}]`;
                }
            }).join(', ');

            // Build GROUP BY columns: X-axis + additional groupBy fields
            const groupByFields = config.dataSource.groupBy;
            const groupByArr = Array.isArray(groupByFields) ? groupByFields : groupByFields ? [groupByFields] : [];

            // Check if we have a drillDownLabelField - if so, we should GROUP BY that field for the next level
            // instead of the original xAxis (since we are filtering by xAxis)
            const nextDrillLabel = config.dataSource.drillDownLabelField;
            const effectiveGroupCol = (nextDrillLabel && nextDrillLabel !== xAxisField) ? nextDrillLabel : xAxisField;

            // Fields to select and group by
            // If we use labelField, we select it. Otherwise select xAxis.
            const groupCols = [effectiveGroupCol, ...groupByArr].filter(Boolean).map(f => `[${f.replace(/[^\w]/g, '')}]`);

            const customQuery = `
                SELECT 
                    ${groupCols.join(', ')},
                    ${yAxisSelect}
                FROM [dbo].[${table}]
                ${whereClause}
                GROUP BY ${groupCols.join(', ')}
            `;

            // Debug log removed for security (query details should not be logged client-side)

            const response = await fetch("/api/database/chart-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customQuery: customQuery.trim(),
                    connectionId: config.dataSource.connectionId,
                }),
            });

            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                // Return aggregated data
                return result.data.map((row: any, index: number) => {
                    // Create composite label for X-axis if needed
                    if (groupByArr.length > 0 && xAxisField) {
                        const labelParts = [String(row[xAxisField] || ''), ...groupByArr.map(g => String(row[g] || ''))];
                        const compositeLabel = labelParts.join(' - ');
                        return {
                            ...row,
                            [xAxisField]: compositeLabel, // Override X-axis value with composite label
                            name: compositeLabel,
                            _index: index + 1
                        };
                    }

                    return {
                        ...row,
                        name: row[labelField] || row[xAxisField] || `#${index + 1}`,
                        _index: index + 1,
                    };
                });
            }

            return [];
        } catch (error) {
            // Log error (sanitized - no sensitive data)
            if (error instanceof Error) {
                console.error("Error fetching drill-down data:", error.message);
            } else {
                console.error("Error fetching drill-down data:", String(error));
            }
            return [];
        }
    }, [globalFilters]);

    // Handle widget resize via presets
    const handleResize = useCallback((widgetId: string, size: keyof typeof SIZE_PRESETS) => {
        const preset = SIZE_PRESETS[size];
        const widget = currentDashboard?.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        updateWidget(widgetId, {
            layout: {
                ...widget.layout,
                i: widgetId,
                w: preset.w,
                h: preset.h,
            }
        });
        setShowSizeMenu(null);
    }, [currentDashboard, updateWidget]);

    // Handle custom resize
    const handleCustomResize = useCallback((widgetId: string, deltaW: number, deltaH: number) => {
        const widget = currentDashboard?.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const currentLayout = widget.layout;
        const newW = Math.max(2, Math.min(12, (currentLayout?.w || 4) + deltaW));
        const newH = Math.max(2, (currentLayout?.h || 3) + deltaH);

        updateWidget(widgetId, {
            layout: {
                ...currentLayout,
                i: widgetId,
                w: newW,
                h: newH,
            }
        });
    }, [currentDashboard, updateWidget]);

    // Clone widget
    const handleCloneWidget = useCallback((widget: Widget) => {
        const newId = generateId();
        const clonedWidget: Widget = {
            ...widget,
            id: newId,
            layout: {
                ...widget.layout,
                i: newId,
                x: Math.min((widget.layout?.x || 0) + 1, GRID_COLS - (widget.layout?.w || 4)),
                y: (widget.layout?.y || 0) + (widget.layout?.h || 3),
            },
            config: { ...widget.config },
        };
        addWidget(clonedWidget);
    }, [addWidget]);

    // Open edit dialog
    const handleOpenEditDialog = useCallback((widget: Widget) => {
        if (widget.type === "chart") {
            // Redirect to chart builder for charts
            const chartConfig = widget.config as ChartConfigType;
            if (chartConfig.id) {
                router.push(`/charts/new?edit=${chartConfig.id}`);
            }
            return;
        }

        setEditingWidget(widget);
        const config = widget.config as any;

        // Reset form with widget values
        setEditForm({
            name: config.title || "",
            chartType: "bar",
            colors: [],
            // Text fields
            content: config.content || "",
            fontSize: config.fontSize || 16,
            fontWeight: config.fontWeight || "normal",
            textAlign: config.textAlign || "left",
            textColor: config.color || "#0F172A",
            // Image fields
            imageUrl: config.url || "",
            imageAlt: config.alt || "",
            objectFit: config.objectFit || "contain",
            // Iframe fields
            iframeUrl: config.url || "",
            allowFullscreen: config.allowFullscreen ?? true,
        });
    }, [router]);

    // Save edit
    const handleSaveEdit = useCallback(() => {
        if (!editingWidget) return;

        if (editingWidget.type === "text") {
            updateWidget(editingWidget.id, {
                config: {
                    ...editingWidget.config as any,
                    content: editForm.content,
                    fontSize: editForm.fontSize,
                    fontWeight: editForm.fontWeight,
                    textAlign: editForm.textAlign,
                    color: editForm.textColor,
                } as any
            });
        } else if (editingWidget.type === "image") {
            updateWidget(editingWidget.id, {
                config: {
                    ...editingWidget.config as any,
                    url: editForm.imageUrl,
                    alt: editForm.imageAlt,
                    objectFit: editForm.objectFit,
                } as any
            });
        } else if (editingWidget.type === "iframe") {
            updateWidget(editingWidget.id, {
                config: {
                    ...editingWidget.config as any,
                    url: editForm.iframeUrl,
                    allowFullscreen: editForm.allowFullscreen,
                } as any
            });
        }

        setEditingWidget(null);
    }, [editingWidget, editForm, updateWidget]);

    // Local state for smooth dragging/resizing
    const [previewLayout, setPreviewLayout] = useState<Record<string, LayoutItem>>({});

    // Handle widget drag within grid
    const handleWidgetMouseDown = (widget: Widget, e: React.MouseEvent) => {
        if (!isEditing) return;
        e.preventDefault();

        setDraggingWidgetId(widget.id);
        const startX = e.clientX;
        const startY = e.clientY;
        const startLayoutX = widget.layout?.x || 0;
        const startLayoutY = widget.layout?.y || 0;
        const cellWidth = (containerWidth - (GRID_COLS - 1) * GAP) / GRID_COLS;

        // Initialize preview
        setPreviewLayout(prev => ({
            ...prev,
            [widget.id]: widget.layout || { i: widget.id, x: 0, y: 0, w: 4, h: 3 }
        }));

        let animationFrameId: number;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                const colDelta = Math.round(deltaX / (cellWidth + GAP));
                const rowDelta = Math.round(deltaY / (CELL_HEIGHT + GAP));

                const w = widget.layout?.w || 4;
                const newX = Math.max(0, Math.min(GRID_COLS - w, startLayoutX + colDelta));
                const newY = Math.max(0, startLayoutY + rowDelta);

                setPreviewLayout(prev => ({
                    ...prev,
                    [widget.id]: {
                        ...prev[widget.id],
                        x: newX,
                        y: newY,
                    }
                }));
            });
        };

        const handleMouseUp = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            setDraggingWidgetId(null);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);

            // Commit final position and resolve collisions
            setPreviewLayout(prev => {
                const finalItem = prev[widget.id];
                if (finalItem && currentDashboard) {
                    // Construct new layout list
                    const currentLayout = currentDashboard.widgets.map(w => w.layout || { i: w.id, x: 0, y: 0, w: 4, h: 3 });

                    // Update the moved item
                    const nextLayout = currentLayout.map(item =>
                        item.i === widget.id ? finalItem : item
                    );

                    // Resolve collisions
                    const resolved = resolveLayout(nextLayout, widget.id);

                    // Update store with FULL resolved layout
                    updateLayout(resolved);
                }

                // Clear preview
                const newPreview = { ...prev };
                delete newPreview[widget.id];
                return newPreview;
            });
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Handle widget touch for mobile drag
    const handleWidgetTouchStart = (widget: Widget, e: React.TouchEvent) => {
        if (!isEditing || !isMobile) return;
        e.preventDefault();

        setDraggingWidgetId(widget.id);
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const startLayoutY = widget.layout?.y || 0;

        // Initialize preview
        setPreviewLayout(prev => ({
            ...prev,
            [widget.id]: widget.layout || { i: widget.id, x: 0, y: 0, w: 4, h: 3 }
        }));

        let animationFrameId: number;

        const handleTouchMove = (moveEvent: TouchEvent) => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (moveEvent.touches.length === 0) return;

            animationFrameId = requestAnimationFrame(() => {
                const touch = moveEvent.touches[0];
                const deltaY = touch.clientY - startY;

                const rowDelta = Math.round(deltaY / (cellHeight + gap));
                const newY = Math.max(0, startLayoutY + rowDelta);

                setPreviewLayout(prev => ({
                    ...prev,
                    [widget.id]: {
                        ...prev[widget.id],
                        y: newY,
                    }
                }));
            });
        };

        const handleTouchEnd = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            setDraggingWidgetId(null);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);

            // Commit final position
            setPreviewLayout(prev => {
                const finalItem = prev[widget.id];
                if (finalItem && currentDashboard) {
                    const currentLayout = currentDashboard.widgets.map(w => w.layout || { i: w.id, x: 0, y: 0, w: 4, h: 3 });
                    const nextLayout = currentLayout.map(item =>
                        item.i === widget.id ? finalItem : item
                    );
                    const resolved = resolveLayout(nextLayout, widget.id);
                    updateLayout(resolved);
                }

                const newPreview = { ...prev };
                delete newPreview[widget.id];
                return newPreview;
            });
        };

        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("touchend", handleTouchEnd);
    };

    if (!currentDashboard) return null;

    const { widgets } = currentDashboard;

    // Render different widget types
    const renderWidgetContent = (widget: Widget) => {
        // Responsive height calculation
        const widgetHeight = isMobile 
            ? ((widget.layout?.h || 3) * cellHeight) - (isEditing ? 50 : 20)
            : ((widget.layout?.h || 3) * cellHeight) - 60;
        const height = Math.max(200, widgetHeight); // Minimum height for charts

        switch (widget.type) {
            case "chart":
                const baseChartConfig = widget.config as ChartConfigType;
                const chartData = chartDataCache[widget.id] || [];
                const xAxisField = baseChartConfig.dataSource?.xAxis;

                // Apply chart type override if exists (temporary, not saved)
                const overrideType = chartTypeOverrides[widget.id];
                const chartConfig: ChartConfigType = overrideType
                    ? { ...baseChartConfig, type: overrideType as ChartConfigType['type'] }
                    : baseChartConfig;

                // Create drill-down handler for this specific chart
                const handleChartDrillDown = async (
                    drillFilters: Array<{ field: string; operator: string; value: string | number }>
                ) => {
                    return fetchDrillDownData(baseChartConfig, drillFilters);
                };

                // Handle chart type change (temporary override)
                const handleChartTypeChange = (newType: string) => {
                    if (newType === 'reset') {
                        // Reset to original
                        setChartTypeOverrides(prev => {
                            const updated = { ...prev };
                            delete updated[widget.id];
                            return updated;
                        });
                    } else {
                        setChartTypeOverrides(prev => ({
                            ...prev,
                            [widget.id]: newType
                        }));
                    }
                };

                const currentChartType = overrideType || baseChartConfig.type;
                const isTypeChanged = overrideType && overrideType !== baseChartConfig.type;

                return (
                    <div className={cn(
                        "w-full h-full flex flex-col overflow-hidden",
                        isMobile && "p-1" // Add padding on mobile
                    )}>
                        {/* Chart Type Selector - Responsive */}
                        {!isEditing && (
                            <div className={cn(
                                "flex items-center justify-between border-b bg-slate-50/80 dark:bg-slate-900/50",
                                isMobile ? "px-2 py-2" : "px-2 py-1"
                            )}>
                                <span className={cn(
                                    "font-medium text-slate-600 dark:text-slate-400 truncate",
                                    isMobile ? "text-sm max-w-[140px]" : "text-xs max-w-[120px]"
                                )}>
                                    {chartConfig.name || 'Chart'}
                                </span>
                                <div className={cn(
                                    "flex items-center gap-1",
                                    isMobile && "gap-2"
                                )}>
                                    <Select
                                        value={currentChartType}
                                        onValueChange={handleChartTypeChange}
                                    >
                                        <SelectTrigger className={cn(
                                            "bg-white dark:bg-slate-800",
                                            isMobile ? "h-8 text-xs w-[110px]" : "h-6 text-[10px] w-[90px]"
                                        )}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CHART_TYPES.map(ct => (
                                                <SelectItem key={ct.value} value={ct.value} className="text-xs">
                                                    {ct.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {isTypeChanged && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "p-0 text-orange-500 hover:text-orange-600",
                                                isMobile ? "h-8 w-8" : "h-6 w-6"
                                            )}
                                            onClick={() => handleChartTypeChange('reset')}
                                            title="Khôi phục kiểu gốc"
                                        >
                                            <X className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {chartData.length > 0 ? (
                                <div className={cn(
                                    "w-full h-full",
                                    isMobile && "overflow-x-auto" // Allow horizontal scroll for wide charts
                                )}>
                                    <InteractiveChart
                                        config={chartConfig}
                                        data={chartData}
                                        chartId={widget.id}
                                        width="100%"
                                        height={Math.max(isMobile ? 250 : 100, height - (isEditing ? 0 : isMobile ? 50 : 28))}
                                        // Drill-down: re-query with WHERE filter
                                        onDrillDown={handleChartDrillDown}
                                        // Enable cross-filtering between charts
                                        enableCrossFilter={true}
                                        crossFilterField={xAxisField}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center text-[#94A3B8]">
                                        <BarChart3 className={cn(
                                            "mx-auto mb-2 opacity-50",
                                            isMobile ? "h-10 w-10" : "h-8 w-8"
                                        )} />
                                        <p className={isMobile ? "text-sm" : "text-xs"}>Đang tải...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case "kpi":
                const kpiTitle = (widget.config as any).title;
                const kpiValue = (widget.config as any).value || 0;
                return (
                    <div className="h-full w-full">
                        <StatCard
                            title={kpiTitle}
                            metrics={[{
                                label: kpiTitle,
                                value: kpiValue,
                                type: 'number',
                                color: '#0066FF'
                            }]}
                            className="h-full border-0 shadow-none p-4"
                        />
                    </div>
                );
            case "stats":
                const statsConfig = widget.config as any;
                const trendUp = statsConfig.trendUp;
                return (
                    <div className="h-full w-full">
                        <StatCard
                            title={statsConfig.title}
                            metrics={[{
                                label: statsConfig.title,
                                value: statsConfig.value,
                                change: statsConfig.trend,
                                isPositive: trendUp,
                                type: 'number',
                            }]}
                            className="h-full border-0 shadow-none p-4"
                        />
                    </div>
                );
            case "image":
                return (
                    <div className="w-full h-full relative overflow-hidden bg-gray-100 flex items-center justify-center">
                        {(widget.config as any).url ? (
                            <img
                                src={(widget.config as any).url}
                                alt={(widget.config as any).title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-gray-400 text-xs">No Image</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity truncate">
                            {(widget.config as any).title}
                        </div>
                    </div>
                );
            case "iframe":
                return (
                    <div className="w-full h-full bg-white relative">
                        <div className="absolute top-0 left-0 right-0 h-6 bg-gray-100 border-b flex items-center px-2">
                            <span className="text-[10px] text-gray-500 truncate">{(widget.config as any).url}</span>
                        </div>
                        <iframe
                            src={(widget.config as any).url}
                            className="w-full h-full pt-6"
                            title={(widget.config as any).title}
                            sandbox="allow-scripts allow-same-origin"
                        />
                    </div>
                );
            case "text":
                return (
                    <div className="p-4 overflow-auto h-full">
                        <div
                            className={cn("prose max-w-none", {
                                "text-center": (widget.config as any).textAlign === "center",
                                "text-right": (widget.config as any).textAlign === "right",
                            })}
                            style={{ fontSize: (widget.config as any).fontSize || 16 }}
                        >
                            {(widget.config as any).content}
                        </div>
                    </div>
                );
            case "table":
                return (
                    <div className="p-4 h-full">
                        <p className="text-sm font-medium text-[#0F172A] mb-2">{(widget.config as any).title}</p>
                        <div className="border rounded text-xs text-[#64748B] p-2 bg-gray-50 h-[calc(100%-24px)] flex items-center justify-center">
                            Bảng dữ liệu mẫu
                        </div>
                    </div>
                );
            default:
                return <div className="p-4 text-[#64748B]">Widget chưa hỗ trợ</div>;
        }
    };

    // Calculate absolute position for widget - responsive
    const getWidgetStyle = (layout: LayoutItem | undefined) => {
        const x = layout?.x || 0;
        const y = layout?.y || 0;
        const w = layout?.w || 4;
        const h = layout?.h || 3;

        // On mobile: stack widgets vertically, full width
        if (isMobile) {
            // Calculate vertical stacking position
            const widgetIndex = widgets.findIndex(w => w.layout?.i === layout?.i);
            let stackedY = 0;
            for (let i = 0; i < widgetIndex; i++) {
                const prevWidget = widgets[i];
                const prevH = prevWidget.layout?.h || 3;
                stackedY += prevH * cellHeight + gap;
            }

            return {
                position: "absolute" as const,
                left: 0,
                top: stackedY,
                width: "100%",
                height: h * cellHeight + (h - 1) * gap,
            };
        }

        // Desktop: use grid layout
        const cellWidth = (containerWidth - (gridCols - 1) * gap) / gridCols;

        return {
            position: "absolute" as const,
            left: x * (cellWidth + gap),
            top: y * (cellHeight + gap),
            width: w * cellWidth + (w - 1) * gap,
            height: h * cellHeight + (h - 1) * gap,
        };
    };

    const getSizeLabel = (layout: LayoutItem | undefined) => {
        const w = layout?.w || 4;
        const h = layout?.h || 3;
        return `${w}×${h}`;
    };

    const getPositionLabel = (layout: LayoutItem | undefined) => {
        const x = layout?.x || 0;
        const y = layout?.y || 0;
        return `(${x},${y})`;
    };

    // Calculate grid height - responsive
    const gridHeight = isMobile
        ? widgets.reduce((total, widget) => {
            const h = widget.layout?.h || 3;
            return total + (h * cellHeight + gap);
        }, 0)
        : gridRows * cellHeight + (gridRows - 1) * gap;

    // Get all chart widget IDs for cross-filter linking
    const chartWidgetIds = widgets
        .filter(w => w.type === 'chart')
        .map(w => w.id);

    return (
        <CrossFilterProvider linkedChartIds={chartWidgetIds}>
            {/* Active Filters Bar */}
            <ActiveFiltersBar
                className="mb-2 mx-4 rounded-lg"
                fieldLabels={{
                    region: 'Vùng',
                    province: 'Tỉnh/TP',
                    district: 'Quận/Huyện',
                    month: 'Tháng',
                    year: 'Năm',
                    category: 'Danh mục',
                    loaidichvu: 'Loại DV',
                    donvi: 'Đơn vị',
                }}
            />
            <div
                ref={(node) => {
                    setNodeRef(node);
                    (gridRef as any).current = node;
                }}
                className={cn(
                    "rounded-lg transition-all relative",
                    isEditing && "bg-[#F8FAFC]",
                    isOver && "ring-4 ring-[#0052CC]/40 bg-[#0052CC]/5",
                    isMobile && "overflow-x-hidden" // Prevent horizontal scroll on mobile
                )}
                style={{ 
                    minHeight: Math.max(500, gridHeight + 100),
                    width: "100%",
                    maxWidth: "100%",
                }}
            >
                {/* Grid background - responsive */}
                {isEditing && !isMobile && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                            gridAutoRows: `${cellHeight}px`,
                            gap: `${gap}px`,
                        }}
                    >
                        {Array.from({ length: gridCols * gridRows }).map((_, i) => (
                            <div
                                key={i}
                                className="border border-[#CBD5E1] rounded bg-white/60"
                            />
                        ))}
                    </div>
                )}

                {/* Widgets container */}
                <div
                    className="relative"
                    style={{ height: gridHeight }}
                >
                    {widgets.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center bg-white/90 p-8 rounded-xl border-2 border-dashed border-[#0052CC]/30 shadow-sm">
                                <GripVertical className="h-12 w-12 text-[#0052CC]/30 mx-auto mb-3" />
                                <p className="text-[#475569] font-medium mb-1">Kéo thả widget vào đây</p>
                                <p className="text-sm text-[#94A3B8]">Chọn widget từ thư viện bên trái</p>
                            </div>
                        </div>
                    ) : (
                        widgets.map((widget) => (
                            <Card
                                key={widget.id}
                                className={cn(
                                    "overflow-hidden bg-white shadow-md hover:shadow-lg transition-all group border-[#E2E8F0]",
                                    isEditing && "border-2 border-[#0052CC]/40 hover:border-[#0052CC]",
                                    draggingWidgetId === widget.id && "opacity-70 shadow-2xl z-50"
                                )}
                                style={getWidgetStyle(previewLayout[widget.id] || widget.layout)}
                            >
                                {/* Widget Header - responsive with touch support */}
                                {isEditing && (
                                    <div
                                        className={cn(
                                            "absolute top-0 left-0 right-0 bg-[#0052CC] z-20 flex items-center justify-between px-2",
                                            isMobile ? "h-10 cursor-grab active:cursor-grabbing" : "h-7 cursor-move"
                                        )}
                                        onMouseDown={(e) => !isMobile && handleWidgetMouseDown(widget, e)}
                                        onTouchStart={(e) => isMobile && handleWidgetTouchStart(widget, e)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Move className="h-3 w-3 text-white/70" />
                                            <span className="text-[10px] font-mono text-white/80">
                                                {getPositionLabel(widget.layout)} {getSizeLabel(widget.layout)}
                                            </span>
                                        </div>

                                        <div className="flex gap-0.5">
                                            {/* Edit Button - Touch-friendly */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "text-white hover:bg-white/20 active:bg-white/30",
                                                    isMobile ? "h-8 w-8" : "h-5 w-5"
                                                )}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditDialog(widget);
                                                }}
                                                title="Chỉnh sửa"
                                            >
                                                <Edit2 className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                                            </Button>

                                            {/* Clone Button - Touch-friendly */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "text-white hover:bg-white/20 active:bg-white/30",
                                                    isMobile ? "h-8 w-8" : "h-5 w-5"
                                                )}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloneWidget(widget);
                                                }}
                                                title="Nhân bản"
                                            >
                                                <Copy className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                                            </Button>

                                            {/* Size Menu - Touch-friendly */}
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "text-white hover:bg-white/20 active:bg-white/30",
                                                        isMobile ? "h-8 w-8" : "h-5 w-5"
                                                    )}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowSizeMenu(showSizeMenu === widget.id ? null : widget.id);
                                                    }}
                                                    title="Kích thước"
                                                >
                                                    <Maximize2 className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                                                </Button>

                                                {showSizeMenu === widget.id && (
                                                    <div
                                                        className="absolute top-6 right-0 bg-white shadow-xl rounded-lg border p-2 z-50 min-w-[140px]"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <p className="text-[10px] text-[#94A3B8] uppercase mb-2 px-1 font-medium">Kích thước</p>
                                                        {Object.entries(SIZE_PRESETS).map(([key, value]) => (
                                                            <button
                                                                key={key}
                                                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-[#0052CC]/10 rounded flex justify-between items-center"
                                                                onClick={() => handleResize(widget.id, key as keyof typeof SIZE_PRESETS)}
                                                            >
                                                                <span>{value.label}</span>
                                                                <span className="text-[#94A3B8] font-mono text-[10px]">{value.w}×{value.h}</span>
                                                            </button>
                                                        ))}
                                                        <hr className="my-2" />
                                                        <div className="grid grid-cols-4 gap-1 px-1">
                                                            <button
                                                                className="px-1.5 py-1 text-[10px] bg-[#F1F5F9] rounded hover:bg-[#E2E8F0] font-medium"
                                                                onClick={() => handleCustomResize(widget.id, -1, 0)}
                                                            >
                                                                W−
                                                            </button>
                                                            <button
                                                                className="px-1.5 py-1 text-[10px] bg-[#F1F5F9] rounded hover:bg-[#E2E8F0] font-medium"
                                                                onClick={() => handleCustomResize(widget.id, 1, 0)}
                                                            >
                                                                W+
                                                            </button>
                                                            <button
                                                                className="px-1.5 py-1 text-[10px] bg-[#F1F5F9] rounded hover:bg-[#E2E8F0] font-medium"
                                                                onClick={() => handleCustomResize(widget.id, 0, -1)}
                                                            >
                                                                H−
                                                            </button>
                                                            <button
                                                                className="px-1.5 py-1 text-[10px] bg-[#F1F5F9] rounded hover:bg-[#E2E8F0] font-medium"
                                                                onClick={() => handleCustomResize(widget.id, 0, 1)}
                                                            >
                                                                H+
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            <DeleteWidgetButton widgetId={widget.id} />
                                        </div>
                                    </div>
                                )}

                                <CardContent className={cn("p-0 h-full", isEditing && "pt-7")}>
                                    {renderWidgetContent(widget)}
                                </CardContent>

                                {/* Resize handle */}
                                {isEditing && (
                                    <div
                                        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-20"
                                        style={{
                                            background: "linear-gradient(135deg, transparent 50%, #0052CC 50%)",
                                            borderBottomRightRadius: "4px",
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            const startX = e.clientX;
                                            const startY = e.clientY;
                                            const startW = widget.layout?.w || 4;
                                            const startH = widget.layout?.h || 3;
                                            const cellWidth = (containerWidth - (GRID_COLS - 1) * GAP) / GRID_COLS;

                                            // Initialize preview
                                            setPreviewLayout(prev => ({
                                                ...prev,
                                                [widget.id]: widget.layout || { i: widget.id, x: 0, y: 0, w: 4, h: 3 }
                                            }));

                                            let animationFrameId: number;

                                            // Helper to check for overlap (duplicated for closure access to widgets)
                                            const checkOverlap = (id: string, x: number, y: number, w: number, h: number) => {
                                                const otherWidgets = widgets.filter(w => w.id !== id);
                                                for (const other of otherWidgets) {
                                                    const ox = other.layout?.x || 0;
                                                    const oy = other.layout?.y || 0;
                                                    const ow = other.layout?.w || 4;
                                                    const oh = other.layout?.h || 3;

                                                    if (x < ox + ow && x + w > ox && y < oy + oh && y + h > oy) {
                                                        return true;
                                                    }
                                                }
                                                return false;
                                            };

                                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                                if (animationFrameId) cancelAnimationFrame(animationFrameId);

                                                animationFrameId = requestAnimationFrame(() => {
                                                    const deltaX = moveEvent.clientX - startX;
                                                    const deltaY = moveEvent.clientY - startY;
                                                    const colDelta = Math.round(deltaX / (cellWidth + GAP));
                                                    const rowDelta = Math.round(deltaY / (CELL_HEIGHT + GAP));

                                                    const newW = Math.max(2, Math.min(GRID_COLS - (widget.layout?.x || 0), startW + colDelta));
                                                    const newH = Math.max(2, startH + rowDelta);

                                                    // Use current X/Y (not changing during simple resize)
                                                    const currentX = widget.layout?.x || 0;
                                                    const currentY = widget.layout?.y || 0;

                                                    const hasOverlap = checkOverlap(widget.id, currentX, currentY, newW, newH);

                                                    if (!hasOverlap) {
                                                        setPreviewLayout(prev => ({
                                                            ...prev,
                                                            [widget.id]: {
                                                                ...prev[widget.id],
                                                                w: newW,
                                                                h: newH,
                                                            }
                                                        }));
                                                    }
                                                });
                                            };

                                            const handleMouseUp = () => {
                                                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                                                document.removeEventListener("mousemove", handleMouseMove);
                                                document.removeEventListener("mouseup", handleMouseUp);

                                                // Commit final size
                                                setPreviewLayout(prev => {
                                                    const finalLayout = prev[widget.id];
                                                    if (finalLayout) {
                                                        updateWidget(widget.id, {
                                                            layout: {
                                                                ...widget.layout,
                                                                ...finalLayout
                                                            }
                                                        });
                                                    }
                                                    const newPreview = { ...prev };
                                                    delete newPreview[widget.id];
                                                    return newPreview;
                                                });
                                            };

                                            document.addEventListener("mousemove", handleMouseMove);
                                            document.addEventListener("mouseup", handleMouseUp);
                                        }}
                                    />
                                )}
                            </Card>
                        ))
                    )}
                </div>

                {showSizeMenu && (
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSizeMenu(null)}
                    />
                )}
            </div>

            {/* Edit Widget Dialog */}
            <Dialog open={!!editingWidget} onOpenChange={(open) => !open && setEditingWidget(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Chỉnh sửa Widget
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* TEXT Widget Fields */}
                        {editingWidget?.type === "text" && (
                            <>
                                <div>
                                    <Label htmlFor="text-content">Nội dung văn bản</Label>
                                    <textarea
                                        id="text-content"
                                        value={editForm.content}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Nhập văn bản..."
                                        className="mt-1 w-full min-h-[100px] p-2 border border-[#E2E8F0] rounded-md text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="font-size">Cỡ chữ (px)</Label>
                                        <Input
                                            id="font-size"
                                            type="number"
                                            value={editForm.fontSize}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 16 }))}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Kiểu chữ</Label>
                                        <Select
                                            value={editForm.fontWeight}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, fontWeight: value as "normal" | "bold" }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue>{editForm.fontWeight === "bold" ? "Đậm" : "Bình thường"}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Bình thường</SelectItem>
                                                <SelectItem value="bold">Đậm</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Căn chỉnh</Label>
                                        <Select
                                            value={editForm.textAlign}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, textAlign: value as "left" | "center" | "right" }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue>
                                                    {editForm.textAlign === "center" ? "Giữa" : editForm.textAlign === "right" ? "Phải" : "Trái"}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="left">Trái</SelectItem>
                                                <SelectItem value="center">Giữa</SelectItem>
                                                <SelectItem value="right">Phải</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="text-color">Màu chữ</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                id="text-color"
                                                value={editForm.textColor}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, textColor: e.target.value }))}
                                                className="w-10 h-10 rounded cursor-pointer border"
                                            />
                                            <Input
                                                value={editForm.textColor}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, textColor: e.target.value }))}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* IMAGE Widget Fields */}
                        {editingWidget?.type === "image" && (
                            <>
                                <div>
                                    <Label htmlFor="image-url">URL hình ảnh</Label>
                                    <Input
                                        id="image-url"
                                        value={editForm.imageUrl}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                                        placeholder="https://example.com/image.jpg"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="image-alt">Mô tả (Alt text)</Label>
                                    <Input
                                        id="image-alt"
                                        value={editForm.imageAlt}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, imageAlt: e.target.value }))}
                                        placeholder="Mô tả hình ảnh..."
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Kiểu hiển thị</Label>
                                    <Select
                                        value={editForm.objectFit}
                                        onValueChange={(value) => setEditForm(prev => ({ ...prev, objectFit: value as "contain" | "cover" | "fill" }))}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue>
                                                {editForm.objectFit === "cover" ? "Cắt vừa khung" : editForm.objectFit === "fill" ? "Kéo giãn" : "Giữ tỷ lệ"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="contain">Giữ tỷ lệ (contain)</SelectItem>
                                            <SelectItem value="cover">Cắt vừa khung (cover)</SelectItem>
                                            <SelectItem value="fill">Kéo giãn (fill)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {editForm.imageUrl && (
                                    <div className="border rounded-md p-2 bg-gray-50">
                                        <p className="text-xs text-[#64748B] mb-2">Xem trước:</p>
                                        <img
                                            src={editForm.imageUrl}
                                            alt={editForm.imageAlt}
                                            className="max-h-32 mx-auto rounded"
                                            style={{ objectFit: editForm.objectFit }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* IFRAME Widget Fields */}
                        {editingWidget?.type === "iframe" && (
                            <>
                                <div>
                                    <Label htmlFor="iframe-url">URL trang web</Label>
                                    <Input
                                        id="iframe-url"
                                        value={editForm.iframeUrl}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, iframeUrl: e.target.value }))}
                                        placeholder="https://example.com"
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-[#94A3B8] mt-1">
                                        Lưu ý: Một số trang web không cho phép nhúng
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="allow-fullscreen"
                                        checked={editForm.allowFullscreen}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, allowFullscreen: e.target.checked }))}
                                        className="w-4 h-4"
                                    />
                                    <Label htmlFor="allow-fullscreen">Cho phép toàn màn hình</Label>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWidget(null)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CrossFilterProvider>
    );
}
