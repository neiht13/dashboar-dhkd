"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { BarChart3, Type, LineChart, PieChart, AreaChart, Search, Image, Code } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useChartStore } from "@/stores/chart-store";
import { generateId } from "@/lib/utils";
import type { WidgetType, ChartConfig } from "@/types";

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
];

// Get icon for chart type
function getChartIcon(type: string) {
    switch (type) {
        case "line":
            return <LineChart className="h-5 w-5" />;
        case "pie":
        case "donut":
        case "sizedPie":
            return <PieChart className="h-5 w-5" />;
        case "area":
            return <AreaChart className="h-5 w-5" />;
        default:
            return <BarChart3 className="h-5 w-5" />;
    }
}

export function WidgetLibrary() {
    const { addWidget } = useDashboardStore();
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
        }

        addWidget({
            id,
            type: type as WidgetType,
            config,
            layout: { i: id, x: 0, y: 0, w, h },
        });
    };

    return (
        <div className="w-72 bg-white border-r border-[#E2E8F0] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#E2E8F0]">
                <h3 className="text-sm font-semibold text-[#0F172A]">Thư viện Widget</h3>
                <p className="text-xs text-[#64748B]">Click hoặc kéo thả vào dashboard</p>
            </div>

            {/* Saved Charts Section - FIRST with Search */}
            <div className="p-4 border-b border-[#E2E8F0]">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                    Biểu đồ đã lưu ({charts.length})
                </h4>

                {/* Search Box */}
                {charts.length > 0 && (
                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                        <Input
                            placeholder="Tìm biểu đồ..."
                            value={chartSearchQuery}
                            onChange={(e) => setChartSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                )}

                {charts.length === 0 ? (
                    <div className="text-center py-4 text-sm text-[#94A3B8]">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-[#CBD5E1]" />
                        <p>Chưa có biểu đồ nào</p>
                        <p className="text-xs">Tạo biểu đồ tại trang Charts</p>
                    </div>
                ) : filteredCharts.length === 0 ? (
                    <div className="text-center py-4 text-sm text-[#94A3B8]">
                        <p>Không tìm thấy biểu đồ</p>
                        <p className="text-xs">Thử từ khóa khác</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredCharts.map((chart) => (
                            <DraggableWidget
                                key={chart.id}
                                id={`chart-${chart.id}`}
                                data={{ type: "chart", chart }}
                            >
                                <Card
                                    className="cursor-pointer hover:border-[#0052CC] hover:bg-[#F8FAFC] transition-all group"
                                    onClick={() => handleAddWidget("chart", chart)}
                                >
                                    <CardContent className="p-3 flex items-start gap-3">
                                        <div className="p-2 rounded bg-[#0052CC]/10 text-[#0052CC]">
                                            {getChartIcon(chart.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#0F172A] truncate">
                                                {chart.name || "Biểu đồ không tên"}
                                            </p>
                                            <p className="text-xs text-[#94A3B8] capitalize">
                                                {chart.type} • {chart.dataSource?.table || "N/A"}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </DraggableWidget>
                        ))}
                    </div>
                )}
            </div>

            {/* Other Widget Types - Simplified */}
            <div className="p-4 flex-1">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                    Widget khác
                </h4>
                <div className="space-y-2">
                    {widgetTypes.map((item) => (
                        <DraggableWidget
                            key={item.type}
                            id={`widget-${item.type}`}
                            data={{ type: item.type }}
                        >
                            <Card
                                className="cursor-pointer hover:border-[#0052CC] hover:bg-[#F8FAFC] transition-all group"
                                onClick={() => handleAddWidget(item.type)}
                            >
                                <CardContent className="p-3 flex items-start gap-3">
                                    <div className="p-2 rounded bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0052CC] group-hover:bg-[#0052CC]/10 transition-colors">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                                        <p className="text-xs text-[#94A3B8]">{item.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </DraggableWidget>
                    ))}
                </div>
            </div>
        </div>
    );
}
