"use client";

import React, { useState } from "react";
import {
    Filter, ChevronDown, ChevronRight, X, Search,
    Plus, Check
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChartConfig, PowerBIFilter } from "@/types";
import { generateId } from "@/lib/utils";

interface FilterCardProps {
    filter: PowerBIFilter;
    onUpdate: (updates: Partial<PowerBIFilter>) => void;
    onRemove: () => void;
}

function FilterCard({ filter, onUpdate, onRemove }: FilterCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded mb-1.5 bg-white dark:bg-gray-800">
            {/* Filter header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
                <span className="flex-1 text-left font-medium text-gray-700 dark:text-gray-200 truncate">
                    {filter.field}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                >
                    <X className="h-3 w-3" />
                </button>
            </button>

            {/* Filter body */}
            {isExpanded && (
                <div className="px-2 pb-2 space-y-1.5">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        is {filter.values.length > 0 ? `(${filter.values.length} selected)` : "(All)"}
                    </p>

                    {/* Filter type selector */}
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-gray-500 dark:text-gray-400">Loại:</span>
                        <select
                            value={filter.filterType}
                            onChange={(e) => onUpdate({ filterType: e.target.value as PowerBIFilter["filterType"] })}
                            className="flex-1 h-6 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1"
                        >
                            <option value="basic">Basic filtering</option>
                            <option value="advanced">Advanced filtering</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm..."
                            className="h-6 pl-6 text-[10px]"
                        />
                    </div>

                    {/* Values will be populated from actual data */}
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                        <label className="flex items-center gap-1.5 text-[10px] py-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-1 rounded">
                            <input
                                type="checkbox"
                                checked={filter.values.length === 0}
                                onChange={() => onUpdate({ values: [] })}
                                className="w-3 h-3 rounded"
                            />
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Chọn tất cả</span>
                        </label>
                    </div>

                    {/* Require single selection */}
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer pt-1 border-t border-gray-100 dark:border-gray-700">
                        <input
                            type="checkbox"
                            checked={filter.requireSingleSelection || false}
                            onChange={(e) => onUpdate({ requireSingleSelection: e.target.checked })}
                            className="w-3 h-3 rounded"
                        />
                        Yêu cầu chọn 1
                    </label>
                </div>
            )}
        </div>
    );
}

interface FilterSectionProps {
    title: string;
    level: "visual" | "page" | "report";
    filters: PowerBIFilter[];
    onAddFilter: (field: string) => void;
    onUpdateFilter: (id: string, updates: Partial<PowerBIFilter>) => void;
    onRemoveFilter: (id: string) => void;
    defaultOpen?: boolean;
}

function FilterSection({
    title,
    level,
    filters,
    onUpdateFilter,
    onRemoveFilter,
    defaultOpen = false,
}: FilterSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const { isOver, setNodeRef } = useDroppable({
        id: `filter-section-${level}`,
        data: { type: "filter-section", level },
    });

    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                {isOpen ? (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
                {title}
                {filters.length > 0 && (
                    <span className="ml-auto text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 rounded-full">
                        {filters.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="px-3 pb-2">
                    {/* Existing filters */}
                    {filters.map((filter) => (
                        <FilterCard
                            key={filter.id}
                            filter={filter}
                            onUpdate={(updates) => onUpdateFilter(filter.id, updates)}
                            onRemove={() => onRemoveFilter(filter.id)}
                        />
                    ))}

                    {/* Drop zone for adding new filters */}
                    <div
                        ref={setNodeRef}
                        className={cn(
                            "flex items-center justify-center h-7 rounded border-2 border-dashed text-[10px] text-gray-400 dark:text-gray-500 transition-colors mt-1",
                            isOver
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                                : "border-gray-200 dark:border-gray-600"
                        )}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Thêm trường dữ liệu vào đây
                    </div>
                </div>
            )}
        </div>
    );
}

export function PowerBIFilterPanel() {
    const {
        selectedWidgetId,
        currentDashboard,
        updateWidget,
        showFilterPanel,
        setShowFilterPanel,
    } = useDashboardStore(
        useShallow((s) => ({
            selectedWidgetId: s.selectedWidgetId,
            currentDashboard: s.currentDashboard,
            updateWidget: s.updateWidget,
            showFilterPanel: s.showFilterPanel,
            setShowFilterPanel: s.setShowFilterPanel,
        }))
    );

    const updateDashboard = useDashboardStore((s) => s.updateDashboard);

    if (!showFilterPanel) return null;

    const selectedWidget = currentDashboard?.widgets.find((w) => w.id === selectedWidgetId);
    const chartConfig = selectedWidget?.type === "chart" ? (selectedWidget.config as ChartConfig) : null;
    const visualFilters = chartConfig?.visualFilters || [];
    const pageFilters = currentDashboard?.pageFilters || [];
    const reportFilters = currentDashboard?.reportFilters || [];

    const handleAddVisualFilter = (field: string) => {
        if (!selectedWidgetId || !chartConfig) return;
        const newFilter: PowerBIFilter = {
            id: generateId(),
            field,
            level: "visual",
            filterType: "basic",
            operator: "in",
            values: [],
            isActive: true,
        };
        updateWidget(selectedWidgetId, {
            config: {
                ...chartConfig,
                visualFilters: [...visualFilters, newFilter],
            },
        });
    };

    const handleUpdateVisualFilter = (id: string, updates: Partial<PowerBIFilter>) => {
        if (!selectedWidgetId || !chartConfig) return;
        updateWidget(selectedWidgetId, {
            config: {
                ...chartConfig,
                visualFilters: visualFilters.map((f) =>
                    f.id === id ? { ...f, ...updates } : f
                ),
            },
        });
    };

    const handleRemoveVisualFilter = (id: string) => {
        if (!selectedWidgetId || !chartConfig) return;
        updateWidget(selectedWidgetId, {
            config: {
                ...chartConfig,
                visualFilters: visualFilters.filter((f) => f.id !== id),
            },
        });
    };

    const handleAddPageFilter = (field: string) => {
        if (!currentDashboard) return;
        const newFilter: PowerBIFilter = {
            id: generateId(),
            field,
            level: "page",
            filterType: "basic",
            operator: "in",
            values: [],
            isActive: true,
        };
        updateDashboard(currentDashboard.id, {
            pageFilters: [...pageFilters, newFilter],
        });
    };

    const handleUpdatePageFilter = (id: string, updates: Partial<PowerBIFilter>) => {
        if (!currentDashboard) return;
        updateDashboard(currentDashboard.id, {
            pageFilters: pageFilters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        });
    };

    const handleRemovePageFilter = (id: string) => {
        if (!currentDashboard) return;
        updateDashboard(currentDashboard.id, {
            pageFilters: pageFilters.filter((f) => f.id !== id),
        });
    };

    const handleAddReportFilter = (field: string) => {
        if (!currentDashboard) return;
        const newFilter: PowerBIFilter = {
            id: generateId(),
            field,
            level: "report",
            filterType: "basic",
            operator: "in",
            values: [],
            isActive: true,
        };
        updateDashboard(currentDashboard.id, {
            reportFilters: [...reportFilters, newFilter],
        });
    };

    const handleUpdateReportFilter = (id: string, updates: Partial<PowerBIFilter>) => {
        if (!currentDashboard) return;
        updateDashboard(currentDashboard.id, {
            reportFilters: reportFilters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        });
    };

    const handleRemoveReportFilter = (id: string) => {
        if (!currentDashboard) return;
        updateDashboard(currentDashboard.id, {
            reportFilters: reportFilters.filter((f) => f.id !== id),
        });
    };

    return (
        <div className="w-[220px] flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                        Bộ lọc
                    </span>
                </div>
                <button
                    onClick={() => setShowFilterPanel(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Filter sections */}
            <div className="flex-1 overflow-y-auto">
                {selectedWidgetId && chartConfig && (
                    <FilterSection
                        title="Bộ lọc biểu đồ này"
                        level="visual"
                        filters={visualFilters}
                        onAddFilter={handleAddVisualFilter}
                        onUpdateFilter={handleUpdateVisualFilter}
                        onRemoveFilter={handleRemoveVisualFilter}
                        defaultOpen={true}
                    />
                )}

                <FilterSection
                    title="Bộ lọc trang này"
                    level="page"
                    filters={pageFilters}
                    onAddFilter={handleAddPageFilter}
                    onUpdateFilter={handleUpdatePageFilter}
                    onRemoveFilter={handleRemovePageFilter}
                    defaultOpen={true}
                />

                <FilterSection
                    title="Bộ lọc tất cả các trang"
                    level="report"
                    filters={reportFilters}
                    onAddFilter={handleAddReportFilter}
                    onUpdateFilter={handleUpdateReportFilter}
                    onRemoveFilter={handleRemoveReportFilter}
                />
            </div>
        </div>
    );
}
