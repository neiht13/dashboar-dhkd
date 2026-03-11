"use client";

import React, { useState } from "react";
import {
    BarChart3, LineChart, PieChart, AreaChart, Activity,
    ScatterChart, TrendingUp, Layers, Map, LayoutGrid,
    Gauge, Table, GitBranch, Minus, ChevronDown, ChevronRight
} from "lucide-react";
import type { ChartType } from "@/types";
import { cn } from "@/lib/utils";

interface VisualizationTypePickerProps {
    selectedType: ChartType;
    onTypeChange: (type: ChartType) => void;
}

// Gom nhóm chart types theo category - tham khảo Power BI
const CHART_GROUPS: {
    group: string;
    items: { type: ChartType; icon: React.ElementType; label: string }[];
}[] = [
    {
        group: "Cơ bản",
        items: [
            { type: "bar", icon: BarChart3, label: "Cột đứng" },
            { type: "stackedBar", icon: Layers, label: "Cột chồng" },
            { type: "horizontalBar", icon: Minus, label: "Cột ngang" },
            { type: "line", icon: LineChart, label: "Đường" },
            { type: "area", icon: AreaChart, label: "Vùng" },
            { type: "composed", icon: TrendingUp, label: "Kết hợp" },
        ],
    },
    {
        group: "Phần & Tỷ lệ",
        items: [
            { type: "pie", icon: PieChart, label: "Tròn" },
            { type: "donut", icon: PieChart, label: "Donut" },
            { type: "funnel", icon: GitBranch, label: "Phễu" },
            { type: "treemap", icon: LayoutGrid, label: "Treemap" },
        ],
    },
    {
        group: "Phân tích",
        items: [
            { type: "scatter", icon: ScatterChart, label: "Phân tán" },
            { type: "radar", icon: Activity, label: "Radar" },
            { type: "waterfall", icon: BarChart3, label: "Thác nước" },
        ],
    },
    {
        group: "KPI & Thẻ",
        items: [
            { type: "statCard", icon: Table, label: "Thẻ KPI" },
            { type: "gauge", icon: Gauge, label: "Đồng hồ" },
            { type: "dataTileGrid", icon: LayoutGrid, label: "Lưới đơn vị" },
        ],
    },
    {
        group: "Bản đồ",
        items: [
            { type: "map", icon: Map, label: "Bản đồ" },
        ],
    },
];

export function VisualizationTypePicker({ selectedType, onTypeChange }: VisualizationTypePickerProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (group: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    // Tìm group chứa chart đang chọn
    const selectedGroup = CHART_GROUPS.find(g => g.items.some(i => i.type === selectedType));

    return (
        <div className="py-1">
            {CHART_GROUPS.map(({ group, items }) => {
                const isCollapsed = collapsedGroups.has(group);
                const hasSelected = items.some(i => i.type === selectedType);

                return (
                    <div key={group}>
                        {/* Group header */}
                        <button
                            onClick={() => toggleGroup(group)}
                            className={cn(
                                "w-full flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                                hasSelected
                                    ? "text-yellow-700 dark:text-yellow-400"
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                            )}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="h-2.5 w-2.5" />
                            ) : (
                                <ChevronDown className="h-2.5 w-2.5" />
                            )}
                            {group}
                        </button>

                        {/* Chart items */}
                        {!isCollapsed && (
                            <div className="grid grid-cols-6 gap-0.5 px-2 pb-1">
                                {items.map(({ type, icon: Icon, label }) => (
                                    <button
                                        key={type}
                                        onClick={() => onTypeChange(type)}
                                        title={label}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-1.5 rounded transition-all",
                                            "hover:bg-gray-100 dark:hover:bg-gray-700",
                                            "border border-transparent",
                                            selectedType === type
                                                ? "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600"
                                                : ""
                                        )}
                                    >
                                        <Icon className={cn(
                                            "h-4 w-4",
                                            selectedType === type
                                                ? "text-yellow-600 dark:text-yellow-400"
                                                : "text-gray-500 dark:text-gray-400"
                                        )} />
                                        <span className="text-[8px] mt-0.5 text-gray-500 dark:text-gray-400 leading-tight truncate w-full text-center">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
