"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { BarChart3, Type, LineChart, PieChart, AreaChart, Search, Image, Code, Activity, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useChartStore } from "@/stores/chart-store";
import { generateId } from "@/lib/utils";
import type { WidgetType, ChartConfig, LayoutItem } from "@/types";

const GRID_COLS = 12;

// Helper to check if two layout items collide
const itemsCollide = (a: LayoutItem, b: LayoutItem) => {
    return a.i !== b.i &&
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
};

// Find the first free position for a new widget
const findFreePosition = (existingLayouts: LayoutItem[], widgetWidth: number, widgetHeight: number): { x: number; y: number } => {
    // If no existing widgets, place at (0, 0)
    if (existingLayouts.length === 0) {
        return { x: 0, y: 0 };
    }

    // Try positions from top-left, scanning left to right, then top to bottom
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x <= GRID_COLS - widgetWidth; x++) {
            const testLayout: LayoutItem = {
                i: 'test',
                x,
                y,
                w: widgetWidth,
                h: widgetHeight,
            };

            // Check if this position collides with any existing widget
            const hasCollision = existingLayouts.some(existing => itemsCollide(testLayout, existing));

            if (!hasCollision) {
                return { x, y };
            }
        }
    }

    // If no free position found, place below the lowest widget
    const maxY = Math.max(...existingLayouts.map(l => (l.y || 0) + (l.h || 3)), 0);
    return { x: 0, y: maxY };
};

// Draggable wrapper component
function DraggableWidget({ id, children, data }: { id: string; children: React.ReactNode; data: any }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: isDragging ? 1000 : 1,
            opacity: isDragging ? 0.8 : 1,
        }
        : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
}

// Simplified widget types - only text, image, iframe
const widgetTypes = [
    {
        type: "text",
        label: "Văn bản",
        icon: <Type className="h-5 w-5" />,
        description: "Tiêu đề, ghi chú, hoặc nội dung văn bản",
    },
    {
        type: "image",
        label: "Hình ảnh",
        icon: <Image className="h-5 w-5" />,
        description: "Chèn hình ảnh từ URL",
    },
    {
        type: "iframe",
        label: "Nhúng Web",
        icon: <Code className="h-5 w-5" />,
        description: "Nhúng trang web hoặc nội dung HTML",
    },
    {
        type: "header-advanced", // Separator
        label: "Nâng cao",
        icon: null,
        description: null
    },
    {
        type: "metric", // Maps to hexagon
        label: "Chỉ số (Hexagon)",
        icon: <Activity className="h-5 w-5" />,
        description: "Widget hình lục giác, hiển thị chỉ số & xu hướng",
    },
    {
        type: "map",
        label: "Bản đồ TTVT",
        icon: <Map className="h-5 w-5" />,
        description: "Bản đồ phân bố vùng & thuê bao",
    },
];

// Get icon for chart type
function getChartIcon(type: string) {
    switch (type) {
        case "line":
            return <LineChart className="h-5 w-5" />;
        case "pie":
        case "donut":
        case "sizedPie": // Legacy - now use pie with pieVariant: 'sized'
            return <PieChart className="h-5 w-5" />;
        case "area":
            return <AreaChart className="h-5 w-5" />;
        default:
            return <BarChart3 className="h-5 w-5" />;
    }
}

export function WidgetLibrary() {
    const { addWidget, currentDashboard } = useDashboardStore();
    const { charts } = useChartStore();
    const [chartSearchQuery, setChartSearchQuery] = useState("");

    // Filter charts based on search query
    const filteredCharts = useMemo(() => {
        if (!chartSearchQuery.trim()) return charts;
        const query = chartSearchQuery.toLowerCase();
        return charts.filter(chart =>
            chart.name?.toLowerCase().includes(query) ||
            chart.type?.toLowerCase().includes(query) ||
            chart.dataSource?.table?.toLowerCase().includes(query)
        );
    }, [charts, chartSearchQuery]);

    const handleAddWidget = (type: string, chartConfig?: ChartConfig) => {
        const id = generateId();
        let config: any = {};
        let w = 4;
        let h = 4;

        switch (type) {
            case "text":
                config = {
                    content: "Nhập văn bản tại đây...",
                    fontSize: 16,
                    fontWeight: "normal",
                    textAlign: 'left',
                    color: "#0F172A",
                    backgroundColor: "transparent"
                };
                w = 6;
                h = 2;
                break;
            case "image":
                config = {
                    title: "",
                    url: "",
                    alt: "Hình ảnh",
                    objectFit: "contain" // contain, cover, fill
                };
                w = 4;
                h = 4;
                break;
            case "iframe":
                config = {
                    title: "",
                    url: "",
                    allowFullscreen: true,
                    sandbox: "allow-scripts allow-same-origin"
                };
                w = 6;
                h = 6;
                break;
            case "chart":
                if (chartConfig) {
                    config = chartConfig;
                    w = 6;
                    h = 5;
                }
                break;
            case "metric":
                config = {
                    title: "Thuê bao PTM",
                    type: "hexagon", // DynamicChart type
                    dataSource: {
                        yAxis: ['value'], // Default field
                        xAxis: 'name'
                    },
                    style: {
                        cardIcon: "Activity",
                        colors: ["#3b82f6"]
                    }
                };
                w = 3;
                h = 3;
                break;
            case "map":
                config = {
                    title: "Bản đồ phân bố",
                    type: "map",
                    dataSource: {
                        table: "TTVT_Data", // Mock
                        xAxis: "ma_ttvt",
                        yAxis: ["value"]
                    }
                };
                w = 8;
                h = 6;
                break;
        }

        // Find free position to avoid collisions
        const existingLayouts = currentDashboard?.widgets
            .map(w => w.layout)
            .filter((l): l is LayoutItem => l !== undefined) || [];

        const freePosition = findFreePosition(existingLayouts, w, h);

        addWidget({
            id,
            type: type as WidgetType,
            config,
            layout: { i: id, x: freePosition.x, y: freePosition.y, w, h },
        });
    };

    return (
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
            {/* Header - Angular Style */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Thư viện Widget
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Click hoặc kéo thả vào dashboard</p>
            </div>

            {/* Saved Charts Section - FIRST with Search */}
            <div className="p-4 border-b border-slate-200">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                    <span>Biểu đồ đã lưu</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[9px]">{charts.length}</span>
                </h4>

                {/* Search Box - Angular */}
                {charts.length > 0 && (
                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm biểu đồ..."
                            value={chartSearchQuery}
                            onChange={(e) => setChartSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm rounded-none border-slate-200 focus:border-blue-500"
                        />
                    </div>
                )}

                {charts.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-xs">Chưa có biểu đồ nào</p>
                        <p className="text-[10px]">Tạo biểu đồ tại trang Charts</p>
                    </div>
                ) : filteredCharts.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-400">
                        <p>Không tìm thấy biểu đồ</p>
                        <p className="text-xs">Thử từ khóa khác</p>
                    </div>
                ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {filteredCharts.map((chart) => (
                            <DraggableWidget
                                key={chart.id}
                                id={`chart-${chart.id}`}
                                data={{ type: "chart", chart }}
                            >
                                <div
                                    className="cursor-pointer border-2 border-slate-100 hover:border-blue-400 hover:-translate-y-0.5 transition-all bg-white p-2.5 flex items-start gap-3"
                                    onClick={() => handleAddWidget("chart", chart)}
                                >
                                    <div className="size-9 flex items-center justify-center bg-blue-600 text-white shrink-0">
                                        {getChartIcon(chart.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                            {chart.name || "Biểu đồ không tên"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                                            {chart.type} • {chart.dataSource?.table || "N/A"}
                                        </p>
                                    </div>
                                </div>
                            </DraggableWidget>
                        ))}
                    </div>
                )}
            </div>

            {/* Other Widget Types - Angular Style */}
            <div className="p-4 flex-1">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Widget khác
                </h4>
                <div className="space-y-1.5">
                    {widgetTypes
                        .filter(item => item.type !== "header-advanced")
                        .map((item) => (
                            <DraggableWidget
                                key={item.type}
                                id={`widget-${item.type}`}
                                data={{ type: item.type }}
                            >
                                <div
                                    className="cursor-pointer border-2 border-slate-100 hover:border-blue-400 hover:-translate-y-0.5 transition-all bg-white p-2.5 flex items-start gap-3"
                                    onClick={() => handleAddWidget(item.type)}
                                >
                                    <div className="size-9 flex items-center justify-center bg-slate-100 text-slate-500 shrink-0">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                                        <p className="text-[10px] text-slate-400">{item.description}</p>
                                    </div>
                                </div>
                            </DraggableWidget>
                        ))}
                </div>
            </div>
        </div>
    );
}
