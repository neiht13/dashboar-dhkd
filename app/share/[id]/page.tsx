"use client";

import React, { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Maximize2, Minimize2, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { cn } from "@/lib/utils";
import type { Dashboard, Widget, LayoutItem, ChartConfig } from "@/types";
import { DateRange } from "react-day-picker";

interface SharePageProps {
    params: Promise<{ id: string }>;
}

const GRID_COLS = 12;
const GAP = 16;

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

                const response = await fetch("/api/database/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        table: config.dataSource.table,
                        xAxis: config.dataSource.xAxis,
                        yAxis: config.dataSource.yAxis,
                        aggregation: config.dataSource.aggregation || "sum",
                        orderBy: config.dataSource.orderBy,
                        orderDirection: config.dataSource.orderDirection,
                        limit: config.dataSource.limit || 50,
                        filters,
                    }),
                });

                const result = await response.json();
                if (result.success && result.data) {
                    setChartDataCache(prev => ({
                        ...prev,
                        [widgetId]: result.data,
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

    const renderWidgetContent = (widget: Widget) => {
        const height = ((widget.layout?.h || 3) * CELL_HEIGHT) - 20;

        switch (widget.type) {
            case "chart":
                const chartConfig = widget.config as ChartConfig;
                const chartData = chartDataCache[widget.id] || [];

                return (
                    <div className="w-full h-full flex flex-col p-3">
                        <div className="flex-1 min-h-0">
                            <DynamicChart
                                config={chartConfig}
                                data={chartData}
                                height={Math.max(100, height)}
                            />
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
