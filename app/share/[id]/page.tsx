"use client";

import React, { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Maximize2, Minimize2, RefreshCw, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { InteractiveChart, DrillFilter } from "@/components/charts/InteractiveChart";
import { CrossFilterProvider } from "@/components/charts/CrossFilterProvider";
import { cn } from "@/lib/utils";
import type { Dashboard, Widget, LayoutItem, ChartConfig } from "@/types";
import { DateRange } from "react-day-picker";

interface SharePageProps {
    params: Promise<{ id: string }>;
}

const GRID_COLS = 12;
const GAP = 16;

// Chart types for selector
const CHART_TYPES = [
    { value: "bar", label: "Cột" },
    { value: "line", label: "Đường" },
    { value: "area", label: "Vùng" },
    { value: "pie", label: "Tròn" },
    { value: "donut", label: "Donut" },
    { value: "radar", label: "Radar" },
    { value: "scatter", label: "Phân tán" },
];

// Auto-refresh intervals in seconds
const REFRESH_INTERVALS = [
    { label: "Không tự động", value: 0 },
    { label: "30 giây", value: 30 },
    { label: "1 phút", value: 60 },
    { label: "5 phút", value: 300 },
    { label: "15 phút", value: 900 },
    { label: "30 phút", value: 1800 },
];

export default function ShareDashboardPage({ params }: SharePageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartDataCache, setChartDataCache] = useState<Record<string, any[]>>({});
    const [chartTypeOverrides, setChartTypeOverrides] = useState<Record<string, string>>({});
    const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);
    const [containerWidth, setContainerWidth] = useState(typeof window !== 'undefined' ? window.innerWidth * 0.85 : 1600);
    // isFullWidth defaults to dashboard's layoutMode, with URL override
    const [isFullWidth, setIsFullWidth] = useState(false); // Will be synced after dashboard loads
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter state - using DateRange from react-day-picker
    // Default: from start of current month to today
    const getDefaultDateRange = (): DateRange => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: startOfMonth, to: today };
    };
    const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());

    // Auto-refresh state
    const [refreshInterval, setRefreshInterval] = useState(0);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Dynamic cell height based on container width for responsive scaling
    const getCellHeight = () => {
        if (containerWidth < 600) return 50;
        if (containerWidth < 900) return 55;
        return 60;
    };
    const CELL_HEIGHT = getCellHeight();

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Load dashboard
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const response = await fetch(`/api/public/dashboards/${id}`);
                const result = await response.json();

                if (result.success && result.data) {
                    const loadedDashboard = {
                        ...result.data,
                        id: result.data._id || result.data.id,
                    };
                    setDashboard(loadedDashboard);

                    // Sync layout mode from dashboard
                    setIsFullWidth(loadedDashboard.layoutMode === 'full');

                    // Always default to first tab for share page
                    if (loadedDashboard.tabs && loadedDashboard.tabs.length > 0) {
                        setActiveTabId(loadedDashboard.tabs[0].id);
                    } else if (loadedDashboard.activeTabId) {
                        setActiveTabId(loadedDashboard.activeTabId);
                    }
                } else {
                    const stored = localStorage.getItem('dashboard-storage');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        const found = parsed.state?.dashboards?.find((d: any) => d.id === id);
                        if (found) {
                            setDashboard(found);
                            // Sync layout mode from dashboard
                            setIsFullWidth(found.layoutMode === 'full');
                            // Always default to first tab for share page
                            if (found.tabs && found.tabs.length > 0) {
                                setActiveTabId(found.tabs[0].id);
                            } else if (found.activeTabId) {
                                setActiveTabId(found.activeTabId);
                            }
                        } else {
                            setError("Dashboard không tồn tại");
                        }
                    } else {
                        setError("Dashboard không tồn tại");
                    }
                }
            } catch (err) {
                try {
                    const stored = localStorage.getItem('dashboard-storage');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        const found = parsed.state?.dashboards?.find((d: any) => d.id === id);
                        if (found) {
                            setDashboard(found);
                            if (found.activeTabId) {
                                setActiveTabId(found.activeTabId);
                            } else if (found.tabs && found.tabs.length > 0) {
                                setActiveTabId(found.tabs[0].id);
                            }
                        } else {
                            setError("Dashboard không tồn tại");
                        }
                    }
                } catch {
                    setError("Không thể tải dashboard");
                }
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [id]);

    // Get current widgets based on active tab
    const getActiveWidgets = () => {
        if (!dashboard) return [];

        if (activeTabId && dashboard.tabs) {
            const tab = dashboard.tabs.find(t => t.id === activeTabId);
            if (tab) return tab.widgets || [];
        }

        if (dashboard.tabs && dashboard.tabs.length > 0) {
            return dashboard.tabs[0].widgets || [];
        }

        return dashboard.widgets || [];
    };

    const displayWidgets = getActiveWidgets();

    // Fetch chart data function
    const fetchAllChartData = useCallback(async (forceRefresh = false) => {
        if (!displayWidgets.length) return;

        setIsRefreshing(true);

        const fetchChartData = async (widgetId: string, config: ChartConfig) => {
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

            if (!config.dataSource?.table || !config.dataSource?.xAxis || !config.dataSource?.yAxis?.length) {
                return;
            }

            try {
                const filters = [...(config.dataSource.filters || [])];

                // Apply date range filters if chart has date columns configured
                const startCol = config.dataSource.startDateColumn || config.dataSource.dateColumn;
                const endCol = config.dataSource.endDateColumn || config.dataSource.dateColumn;

                if (startCol && dateRange?.from) {
                    filters.push({ field: startCol, operator: '>=', value: dateRange.from.toISOString().split('T')[0] });
                }
                if (endCol && dateRange?.to) {
                    filters.push({ field: endCol, operator: '<=', value: dateRange.to.toISOString().split('T')[0] });
                }

                const { queryMode, customQuery, connectionId } = config.dataSource;

                const requestBody: any = {
                    table: config.dataSource.table,
                    xAxis: config.dataSource.xAxis,
                    yAxis: config.dataSource.yAxis,
                    aggregation: config.dataSource.aggregation || "sum",
                    groupBy: config.dataSource.groupBy || undefined, // Send groupBy to API
                    orderBy: config.dataSource.orderBy,
                    orderDirection: config.dataSource.orderDirection,
                    limit: config.dataSource.limit || 50,
                    filters,

                    connectionId,
                };

                // Custom SQL mode
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
                        });

                        chartData = Object.values(groups).map((g: any) => {
                            const row: any = { ...g };
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
                console.error("Error fetching chart data:", error);
            }
        };

        const promises = displayWidgets
            .filter(widget => widget.type === "chart" && (forceRefresh || !chartDataCache[widget.id]))
            .map(widget => {
                const config = widget.config as ChartConfig;
                return fetchChartData(widget.id, config);
            });

        await Promise.all(promises);
        setIsRefreshing(false);
        setLastRefresh(new Date());
    }, [displayWidgets, chartDataCache, dateRange]);

    // Initial data fetch
    useEffect(() => {
        fetchAllChartData();
    }, [displayWidgets]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when date range changes
    useEffect(() => {
        if (dateRange) {
            setChartDataCache({});
            fetchAllChartData(true);
        }
    }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh timer
    useEffect(() => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        if (refreshInterval > 0) {
            refreshTimerRef.current = setInterval(() => {
                fetchAllChartData(true);
            }, refreshInterval * 1000);
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [refreshInterval, fetchAllChartData]);

    const handleManualRefresh = () => {
        fetchAllChartData(true);
    };

    const handleClearFilters = () => {
        setDateRange(undefined);
        setChartDataCache({});
        fetchAllChartData(true);
    };

    // Fetch drill-down data for a specific chart
    const fetchDrillDownData = useCallback(async (
        config: ChartConfig,
        drillFilters: DrillFilter[]
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
                let customQuery = config.dataSource.customQuery;

                // Build WHERE conditions
                const whereConditions: string[] = [];
                drillFilters.forEach(f => {
                    const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                    whereConditions.push(`[${f.field}] = ${value}`);
                });

                // Add global date filters
                const startCol = config.dataSource.startDateColumn;
                const endCol = config.dataSource.endDateColumn;

                if (startCol && dateRange?.from) {
                    const fromDate = dateRange.from.toISOString().split('T')[0];
                    whereConditions.push(`[${startCol}] >= '${fromDate}'`);
                }

                if (endCol && dateRange?.to) {
                    const toDate = dateRange.to.toISOString().split('T')[0];
                    whereConditions.push(`[${endCol}] <= '${toDate}'`);
                }

                // Wrap custom query as subquery and add WHERE
                if (whereConditions.length > 0) {
                    customQuery = `SELECT * FROM (${customQuery}) AS _drill_sub WHERE ${whereConditions.join(' AND ')}`;
                }

                console.log('[Drill-down Custom SQL] Query:', customQuery);

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
                    let chartData = result.data as Record<string, unknown>[];

                    // Apply same aggregation logic as outer chart (lines 338-402 logic)
                    if (xAxisField && yAxisFields.length > 0) {
                        const groups: Record<string, any> = {};
                        // Use drillDownLabelField if configured for grouping (Dimension Switching)
                        const drillLabelField = config.dataSource.drillDownLabelField;
                        const groupingField = drillLabelField || xAxisField;

                        chartData.forEach(row => {
                            const keyFields = [groupingField, ...groupByArr];
                            const key = keyFields.map(f => String(row[f] ?? "")).join("|||");
                            if (!groups[key]) {
                                groups[key] = { _count: 0 } as any;
                                keyFields.forEach(f => { groups[key][f] = row[f]; });
                                yAxisFields.forEach(y => {
                                    groups[key][y] =
                                        aggregation === "min"
                                            ? Infinity
                                            : aggregation === "max"
                                                ? -Infinity
                                                : 0;
                                });
                                // Composite label
                                if (groupByArr.length > 0) {
                                    const labelParts = keyFields.map(f => String(row[f] ?? ""));
                                    groups[key]._compositeLabel = labelParts.join(" - ");
                                }
                            }
                            groups[key]._count++;
                            yAxisFields.forEach(y => {
                                const val = Number(row[y]) || 0;
                                if (aggregation === "sum" || aggregation === "avg") {
                                    groups[key][y] += val;
                                } else if (aggregation === "min") {
                                    groups[key][y] = Math.min(groups[key][y], val);
                                } else if (aggregation === "max") {
                                    groups[key][y] = Math.max(groups[key][y], val);
                                }
                            });
                        });

                        chartData = Object.values(groups).map((g: any) => {
                            const row: any = { ...g };
                            if (aggregation === "avg") {
                                yAxisFields.forEach(y => {
                                    row[y] = row[y] / g._count;
                                });
                            } else if (aggregation === "count") {
                                yAxisFields.forEach(y => {
                                    row[y] = g._count;
                                });
                            }
                            delete row._count;

                            if (row._compositeLabel && groupingField) {
                                row[groupingField] = row._compositeLabel;
                                delete row._compositeLabel;
                            }

                            // Add name/label for chart display
                            const displayLabel = row[groupingField] || `#${Object.keys(groups).indexOf(row) + 1}`;
                            row._label = displayLabel;
                            row.name = displayLabel;

                            return row;
                        });
                    }

                    return chartData;
                }
                return [];
            } catch (error) {
                console.error("Error fetching Custom SQL drill-down data:", error);
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

            // Build WHERE conditions
            const whereConditions: string[] = [];

            // Add drill filters
            drillFilters.forEach(f => {
                const field = f.field.replace(/[^\w]/g, '');
                const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                whereConditions.push(`[${field}] = ${value}`);
            });

            // Add saved filters from chart config
            (config.dataSource.filters || []).forEach((f: any) => {
                const field = f.field.replace(/[^\w]/g, '');
                const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                whereConditions.push(`[${field}] ${f.operator} ${value}`);
            });

            // Add date filters (adapted for Share Page dateRange state)
            const startCol = config.dataSource.startDateColumn || config.dataSource.dateColumn;
            const endCol = config.dataSource.endDateColumn || config.dataSource.dateColumn;

            if (startCol && dateRange?.from) {
                whereConditions.push(`[${startCol}] >= '${dateRange.from.toISOString().split('T')[0]}'`);
            }
            if (endCol && dateRange?.to) {
                whereConditions.push(`[${endCol}] <= '${dateRange.to.toISOString().split('T')[0]}'`);
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

            const response = await fetch("/api/database/chart-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customQuery: customQuery.trim(), connectionId: config.dataSource.connectionId }),
            });

            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                return result.data.map((row: any, index: number) => {
                    // Composite label logic
                    if (groupByArr.length > 0 && effectiveGroupCol) {
                        const labelParts = [String(row[effectiveGroupCol] || ''), ...groupByArr.map(g => String(row[g] || ''))];
                        const compositeLabel = labelParts.join(' - ');
                        return {
                            ...row,
                            [effectiveGroupCol]: compositeLabel,
                            name: compositeLabel,
                            _index: index + 1
                        };
                    }

                    return {
                        ...row,
                        name: row[effectiveGroupCol] || `#${index + 1}`,
                        _index: index + 1,
                    };
                });
            }
            return [];
        } catch (error) {
            console.error("Error fetching drill-down data:", error);
            return [];
        }
    }, [dateRange]);

    const renderWidgetContent = (widget: Widget) => {
        const height = ((widget.layout?.h || 3) * CELL_HEIGHT) - 20;

        switch (widget.type) {
            case "chart":
                const baseChartConfig = widget.config as ChartConfig;
                const chartData = chartDataCache[widget.id] || [];
                const xAxisField = baseChartConfig.dataSource?.xAxis;

                // Apply chart type override if exists
                const overrideType = chartTypeOverrides[widget.id];
                const chartConfig: ChartConfig = overrideType
                    ? { ...baseChartConfig, type: overrideType as ChartConfig['type'] }
                    : baseChartConfig;

                // Create drill-down handler for this chart
                const handleChartDrillDown = async (filters: DrillFilter[]) => {
                    return fetchDrillDownData(baseChartConfig, filters);
                };

                // Handle chart type change
                const handleChartTypeChange = (newType: string) => {
                    if (newType === 'reset') {
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
                    <div className="w-full h-full flex flex-col">
                        {/* Chart Type Selector */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/80">
                            <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
                                {chartConfig.name || 'Chart'}
                            </span>
                            <div className="flex items-center gap-1">
                                <Select
                                    value={currentChartType}
                                    onValueChange={handleChartTypeChange}
                                >
                                    <SelectTrigger className="h-6 text-[10px] w-[80px] bg-white">
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
                                        className="h-6 w-6 p-0 text-orange-500 hover:text-orange-600"
                                        onClick={() => handleChartTypeChange('reset')}
                                        title="Khôi phục"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 p-2">
                            {chartData.length > 0 ? (
                                <InteractiveChart
                                    config={chartConfig}
                                    data={chartData}
                                    chartId={widget.id}
                                    height={Math.max(80, height - 32)}
                                    onDrillDown={handleChartDrillDown}
                                    enableCrossFilter={false}
                                    crossFilterField={xAxisField}
                                />
                            ) : (
                                <DynamicChart
                                    config={chartConfig}
                                    data={[]}
                                    height={Math.max(80, height - 32)}
                                    enableFilter={true}
                                    onFilterChange={() => {}}
                                />
                            )}
                        </div>
                    </div>
                );
            case "kpi":
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-sm text-[#64748B]">{(widget.config as any).title}</span>
                        <span className="text-3xl font-bold text-[#0F172A]">1,234</span>
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
            default:
                return null;
        }
    };

    const getWidgetStyle = (layout: LayoutItem | undefined, containerWidth: number) => {
        const x = layout?.x || 0;
        const y = layout?.y || 0;
        const w = layout?.w || 4;
        const h = layout?.h || 3;

        const cellWidth = (containerWidth - (GRID_COLS - 1) * GAP) / GRID_COLS;

        return {
            position: "absolute" as const,
            left: x * (cellWidth + GAP),
            top: y * (CELL_HEIGHT + GAP),
            width: w * cellWidth + (w - 1) * GAP,
            height: h * CELL_HEIGHT + (h - 1) * GAP,
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0052CC] mx-auto mb-4"></div>
                    <p className="text-[#64748B]">Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="text-center">
                    <LayoutDashboard className="h-16 w-16 text-[#CBD5E1] mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-[#0F172A] mb-2">Dashboard không tìm thấy</h1>
                    <p className="text-[#64748B] mb-4">{error || "Link này có thể đã hết hạn hoặc không tồn tại."}</p>
                    <Button onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Về trang chủ
                    </Button>
                </div>
            </div>
        );
    }

    let maxRow = 8;
    const validWidgets = displayWidgets.filter(w => w && w.id);
    validWidgets.forEach(widget => {
        const y = widget.layout?.y ?? 0;
        const h = widget.layout?.h ?? 3;
        maxRow = Math.max(maxRow, y + h + 1);
    });
    const gridHeight = maxRow * CELL_HEIGHT + (maxRow - 1) * GAP;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 py-4 sticky top-0 z-50 shadow-sm">
                <div className="w-full px-[7.5%]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg md:text-xl font-bold text-[#0F172A] truncate">{dashboard.name}</h1>
                            {dashboard.description && (
                                <p className="text-sm text-[#64748B] mt-0.5 truncate">{dashboard.description}</p>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Auto Refresh Selector */}
                            <Select
                                value={String(refreshInterval)}
                                onValueChange={(v) => setRefreshInterval(Number(v))}
                            >
                                <SelectTrigger className="w-[120px] h-8 text-xs bg-[#F1F5F9] border-none">
                                    <RefreshCw className={cn("h-3 w-3 mr-1.5", isRefreshing && "animate-spin")} />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REFRESH_INTERVALS.map(item => (
                                        <SelectItem key={item.value} value={String(item.value)}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Manual Refresh */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="h-8 px-2"
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                            </Button>

                            {/* Full Width Toggle */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setIsFullWidth(!isFullWidth)}
                            >
                                {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs + Filters Bar (below header like design) */}
            <div className="bg-white border-b border-[#E2E8F0] px-4 md:px-6">
                <div className="w-full px-[7.5%]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                        {/* Tabs */}
                        {dashboard.tabs && dashboard.tabs.length > 0 && (
                            <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0">
                                {dashboard.tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                                            activeTabId === tab.id
                                                ? "bg-[#0052CC] text-white"
                                                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                                        )}
                                        onClick={() => setActiveTabId(tab.id)}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-[#64748B] font-medium">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Bộ lọc:</span>
                            </div>

                            <DateRangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                placeholder="Chọn khoảng thời gian"
                            />

                            {dateRange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[#64748B] hover:text-[#0F172A]"
                                    onClick={handleClearFilters}
                                >
                                    Xóa lọc
                                </Button>
                            )}

                            {lastRefresh && (
                                <span className="text-xs text-[#94A3B8] hidden md:inline">
                                    Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="py-4 md:py-6">
                <div
                    ref={containerRef}
                    className={cn(
                        "mx-auto w-full transition-all duration-300",
                        isFullWidth ? "px-4" : "px-[7.5%]"
                    )}
                >
                    <div
                        className="relative transition-all duration-300 ease-in-out w-full bg-white rounded-xl shadow-sm p-4"
                    >
                        {validWidgets.length === 0 ? (
                            <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-[#E2E8F0] rounded-xl">
                                <p className="text-[#94A3B8]">Tab này chưa có widget nào</p>
                            </div>
                        ) : (
                            validWidgets.map((widget) => (
                                <Card
                                    key={widget.id}
                                    className="overflow-hidden bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow"
                                    style={getWidgetStyle(widget.layout, containerWidth)}
                                >
                                    <CardContent className="p-0 h-full">
                                        {renderWidgetContent(widget)}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
