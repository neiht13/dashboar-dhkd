"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
    Plus, BarChart3, LineChart, PieChart, Trash2, Edit, Copy,
    Activity, Radar, Layers, ArrowRightLeft, GitMerge, Filter,
    Gauge, Map, BarChart2, TreePine, GitFork, Signal, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AngularCard, AngularCardHeader, AngularCardContent, AngularCardTitle, AngularCardDescription } from "@/components/ui/angular-card";
import { DynamicToolbar } from "@/components/charts/DynamicToolbar";
import { DataTile } from "@/components/charts/DataTile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChartStore } from "@/stores/chart-store";
import type { ChartType } from "@/types";

const chartIcons: Record<string, React.ReactNode> = {
    bar: <BarChart3 className="h-6 w-6" />,
    stackedBar: <Layers className="h-6 w-6" />,
    horizontalBar: <ArrowRightLeft className="h-6 w-6" />,
    line: <LineChart className="h-6 w-6" />,
    area: <Activity className="h-6 w-6" />,
    pie: <PieChart className="h-6 w-6" />,
    radar: <Radar className="h-6 w-6" />,
    composed: <GitMerge className="h-6 w-6" />,
    funnel: <Filter className="h-6 w-6" />,
    gauge: <Gauge className="h-6 w-6" />,
    semicircleGauge: <Signal className="h-6 w-6" />,
    card: <BarChart2 className="h-6 w-6" />,
    map: <Map className="h-6 w-6" />,
    networkMap: <Wifi className="h-6 w-6" />,
    treemap: <TreePine className="h-6 w-6" />,
    waterfall: <GitFork className="h-6 w-6" />,
};

const chartTypeLabels: Record<string, string> = {
    bar: "Biểu đồ Cột",
    stackedBar: "Biểu đồ Cột chồng",
    horizontalBar: "Biểu đồ Cột ngang",
    line: "Biểu đồ Đường",
    area: "Biểu đồ Vùng",
    pie: "Biểu đồ Tròn",
    radar: "Biểu đồ Radar",
    composed: "Biểu đồ Kết hợp",
    funnel: "Biểu đồ Phễu",
    gauge: "Đồng hồ Gauge",
    semicircleGauge: "Semi Gauge",
    card: "Thẻ thống kê",
    map: "Bản đồ",
    networkMap: "Network Map",
    treemap: "Treemap",
    waterfall: "Waterfall",
};

const chartTypeColors: Record<string, string> = {
    bar: "#3b82f6",
    stackedBar: "#6366f1",
    horizontalBar: "#8b5cf6",
    line: "#10b981",
    area: "#14b8a6",
    pie: "#f59e0b",
    radar: "#ef4444",
    composed: "#ec4899",
    funnel: "#f97316",
    gauge: "#06b6d4",
    semicircleGauge: "#0ea5e9",
    card: "#84cc16",
    map: "#22c55e",
    networkMap: "#0d9488",
    treemap: "#a855f7",
    waterfall: "#d946ef",
};

const filterOptions = [
    { value: "all", label: "Tất cả" },
    { value: "bar", label: "Cột" },
    { value: "line", label: "Đường" },
    { value: "pie", label: "Tròn" },
    { value: "other", label: "Khác" },
];

const sortOptions = [
    { value: "name", label: "Tên" },
    { value: "createdAt", label: "Ngày tạo" },
    { value: "type", label: "Loại" },
];

export default function ChartsPage() {
    const { charts, setCharts, deleteChart, saveChart } = useChartStore();
    const [isLoading, setIsLoading] = React.useState(true);

    // Filter & Sort State
    const [searchText, setSearchText] = React.useState("");
    const [filterType, setFilterType] = React.useState("all");
    const [sortBy, setSortBy] = React.useState("createdAt");
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

    React.useEffect(() => {
        const fetchCharts = async () => {
            try {
                const response = await fetch('/api/charts');
                const result = await response.json();
                if (result.success) {
                    setCharts(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch charts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCharts();
    }, [setCharts]);

    // Process charts with filter and sort
    const processedCharts = useMemo(() => {
        let data = [...charts];

        // Search filter
        if (searchText) {
            const lower = searchText.toLowerCase();
            data = data.filter(c =>
                c.name.toLowerCase().includes(lower) ||
                c.type.toLowerCase().includes(lower)
            );
        }

        // Type filter
        if (filterType !== "all") {
            if (filterType === "other") {
                data = data.filter(c => !["bar", "line", "pie"].includes(c.type));
            } else {
                data = data.filter(c => c.type === filterType);
            }
        }

        // Sort
        data.sort((a, b) => {
            let valA: any = a[sortBy as keyof typeof a];
            let valB: any = b[sortBy as keyof typeof b];

            if (sortBy === "createdAt") {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            } else if (typeof valA === "string") {
                valA = valA.toLowerCase();
                valB = valB?.toLowerCase() || "";
            }

            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [charts, searchText, filterType, sortBy, sortDir]);

    const formatDate = (date?: Date) => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(date));
    };

    const handleDuplicate = async (chart: any) => {
        try {
            const { _id, id, createdAt, updatedAt, ...chartConfig } = chart;

            const newChart = {
                ...chartConfig,
                name: `${chartConfig.name} (Copy)`,
            };

            const response = await fetch('/api/charts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChart),
            });

            const result = await response.json();
            if (result.success && result.data) {
                saveChart(result.data);
            } else {
                console.error("Failed to duplicate:", result.error);
            }
        } catch (error) {
            console.error("Error duplicating chart:", error);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                            Thư viện Biểu đồ
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {charts.length} biểu đồ đã tạo
                        </p>
                    </div>
                    <Link href="/charts/new">
                        <Button className="gap-2 rounded-none font-bold">
                            <Plus className="h-4 w-4" />
                            Tạo Chart Mới
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Summary with DataTile */}
            <div className="max-w-[1400px] mx-auto px-6 mt-4">
                <div className="grid grid-cols-4 gap-3">
                    <DataTile
                        label="Tổng Charts"
                        value={charts.length}
                        color="#3b82f6"
                        showProgress={false}
                    />
                    <DataTile
                        label="Biểu đồ Cột"
                        value={charts.filter(c => c.type.includes('bar') || c.type === 'bar').length}
                        target={charts.length}
                        color="#6366f1"
                    />
                    <DataTile
                        label="Biểu đồ Đường"
                        value={charts.filter(c => c.type === 'line' || c.type === 'area').length}
                        target={charts.length}
                        color="#10b981"
                    />
                    <DataTile
                        label="Khác"
                        value={charts.filter(c => !c.type.includes('bar') && c.type !== 'line' && c.type !== 'area').length}
                        target={charts.length}
                        color="#f59e0b"
                    />
                </div>
            </div>

            {/* Dynamic Filter Toolbar */}
            <div className="max-w-[1400px] mx-auto px-6 mt-4">
                <DynamicToolbar
                    searchValue={searchText}
                    onSearchChange={setSearchText}
                    searchPlaceholder="Tìm biểu đồ..."
                    filterOptions={filterOptions}
                    filterValue={filterType}
                    onFilterChange={setFilterType}
                    sortOptions={sortOptions}
                    sortValue={sortBy}
                    onSortChange={setSortBy}
                    sortDirection={sortDir}
                    onSortDirectionToggle={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                />
            </div>

            {/* Content */}
            <div className="max-w-[1400px] mx-auto px-6 py-6">
                {processedCharts.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-white border-2 border-dashed border-slate-200">
                        <div className="size-16 bg-slate-100 flex items-center justify-center mb-4">
                            <BarChart3 className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {searchText || filterType !== "all" ? "Không tìm thấy biểu đồ" : "Chưa có biểu đồ nào"}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-md mb-4">
                            {searchText || filterType !== "all"
                                ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                                : "Tạo biểu đồ đầu tiên để bắt đầu xây dựng dashboards"}
                        </p>
                        {!searchText && filterType === "all" && (
                            <Link href="/charts/new">
                                <Button className="gap-2 rounded-none">
                                    <Plus className="h-4 w-4" />
                                    Tạo Chart Mới
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {processedCharts.map((chart) => (
                            <AngularCard
                                key={chart.id}
                                accentColor={chartTypeColors[chart.type] || "#3b82f6"}
                            >
                                <AngularCardHeader>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="size-10 flex items-center justify-center text-white"
                                            style={{ backgroundColor: chartTypeColors[chart.type] || "#3b82f6" }}
                                        >
                                            {chartIcons[chart.type] || <BarChart3 className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <AngularCardTitle className="truncate">{chart.name}</AngularCardTitle>
                                            <AngularCardDescription>
                                                {chartTypeLabels[chart.type] || chart.type}
                                            </AngularCardDescription>
                                        </div>
                                    </div>
                                </AngularCardHeader>

                                <AngularCardContent>
                                    <div className="space-y-3">
                                        <div className="text-[10px] text-slate-500 space-y-0.5">
                                            <p className="flex justify-between">
                                                <span className="uppercase font-bold">Bảng:</span>
                                                <span className="font-medium text-slate-700">{chart.dataSource?.table || 'N/A'}</span>
                                            </p>
                                            <p className="flex justify-between">
                                                <span className="uppercase font-bold">X-Axis:</span>
                                                <span className="font-medium text-slate-700">{chart.dataSource?.xAxis || 'N/A'}</span>
                                            </p>
                                            <p className="flex justify-between">
                                                <span className="uppercase font-bold">Y-Axis:</span>
                                                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                                    {(chart.dataSource?.yAxis || []).join(", ") || 'N/A'}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {formatDate(chart.createdAt ? new Date(chart.createdAt) : undefined)}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                                <Link href={`/charts/new?edit=${chart.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none">
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-blue-600 hover:text-blue-700 rounded-none"
                                                    onClick={() => handleDuplicate(chart)}
                                                    title="Nhân bản"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Popover>
                                                    <PopoverTrigger>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-600 rounded-none"
                                                            title="Xóa biểu đồ"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-72 rounded-none" align="end">
                                                        <div className="space-y-4">
                                                            <h4 className="font-bold text-slate-900">Xóa biểu đồ?</h4>
                                                            <p className="text-sm text-slate-500">
                                                                Hành động này không thể hoàn tác. Biểu đồ sẽ bị xóa vĩnh viễn.
                                                            </p>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="rounded-none"
                                                                    onClick={() => deleteChart(chart.id)}
                                                                >
                                                                    Xác nhận xóa
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>
                                </AngularCardContent>
                            </AngularCard>
                        ))}

                        {/* Create New Chart Card */}
                        <Link href="/charts/new">
                            <div className="bg-white border-2 border-dashed border-slate-200 hover:border-blue-500 transition-all cursor-pointer h-full min-h-[200px] flex flex-col items-center justify-center">
                                <div className="size-12 bg-slate-100 flex items-center justify-center mb-3">
                                    <Plus className="h-6 w-6 text-slate-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                    Tạo Chart Mới
                                </p>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
