"use client";

import React, { useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { DataSource, ChartStyle } from "@/types";

interface SortOption {
    value: string;
    label: string;
}

interface FilterButton {
    value: string;
    label: string;
    color?: string;
}

interface DynamicToolbarProps {
    /** Cấu hình DataSource để tạo sort options động */
    dataSource?: DataSource;
    /** ChartStyle để lấy labels */
    chartStyle?: ChartStyle;

    /** Filter text state */
    filterText: string;
    onFilterTextChange: (text: string) => void;

    /** Sort state */
    sortKey: string;
    onSortKeyChange: (key: string) => void;
    sortDir: "asc" | "desc";
    onSortDirChange: (dir: "asc" | "desc") => void;

    /** Custom sort options (override auto-generated) */
    customSortOptions?: SortOption[];

    /** Filter buttons */
    filterButtons?: FilterButton[];
    activeFilter?: string;
    onFilterChange?: (filter: string) => void;

    /** Placeholder cho search */
    searchPlaceholder?: string;

    /** Hiển thị date range picker */
    showDateFilter?: boolean;
    dateRange?: { from?: Date; to?: Date };
    onDateRangeChange?: (range: { from?: Date; to?: Date }) => void;

    /** Custom className */
    className?: string;

    /** Sticky position */
    sticky?: boolean;
}

/**
 * DynamicToolbar - Toolbar với filter/sort options động
 * Dựa trên design từ example.tsx
 */
export function DynamicToolbar({
    dataSource,
    chartStyle,
    filterText,
    onFilterTextChange,
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
    customSortOptions,
    filterButtons,
    activeFilter = "all",
    onFilterChange,
    searchPlaceholder,
    showDateFilter,
    dateRange,
    onDateRangeChange,
    className,
    sticky = true,
}: DynamicToolbarProps) {

    // Tạo sort options động từ DataSource
    const sortOptions = useMemo(() => {
        if (customSortOptions?.length) return customSortOptions;

        const opts: SortOption[] = [];

        if (dataSource?.xAxis) {
            opts.push({
                value: dataSource.xAxis,
                label: chartStyle?.xAxisLabel || dataSource.xAxis,
            });
        }

        dataSource?.yAxis?.forEach((field) => {
            opts.push({
                value: field,
                label: chartStyle?.yAxisFieldLabels?.[field] || field,
            });
        });

        // Add groupBy fields
        if (dataSource?.groupBy) {
            const groupFields = Array.isArray(dataSource.groupBy)
                ? dataSource.groupBy
                : [dataSource.groupBy];

            groupFields.forEach((field) => {
                if (!opts.find(o => o.value === field)) {
                    opts.push({ value: field, label: field });
                }
            });
        }

        return opts;
    }, [dataSource, chartStyle, customSortOptions]);

    const placeholder = searchPlaceholder ||
        (dataSource?.xAxis ? `Tìm theo ${dataSource.xAxis}...` : "Tìm kiếm...");

    return (
        <div
            className={cn(
                "bg-white border border-slate-200 p-4 shadow-sm",
                "flex flex-col md:flex-row justify-between items-center gap-4",
                sticky && "sticky top-16 z-20",
                className
            )}
        >
            {/* Search Input */}
            <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-none bg-slate-50 focus:bg-white"
                    value={filterText}
                    onChange={(e) => onFilterTextChange(e.target.value)}
                />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">

                {/* Filter Buttons */}
                {filterButtons && filterButtons.length > 0 && onFilterChange && (
                    <>
                        <div className="flex bg-slate-100 p-1 rounded-none">
                            {filterButtons.map((btn) => (
                                <button
                                    key={btn.value}
                                    onClick={() => onFilterChange(btn.value)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold transition-all",
                                        activeFilter === btn.value
                                            ? "bg-white shadow"
                                            : "text-slate-500 hover:text-slate-700",
                                        activeFilter === btn.value && btn.color
                                    )}
                                    style={activeFilter === btn.value && btn.color
                                        ? { color: btn.color }
                                        : undefined
                                    }
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
                    </>
                )}

                {/* Sort Controls */}
                {sortOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-1">
                            Sắp xếp:
                        </span>

                        <Select value={sortKey} onValueChange={onSortKeyChange}>
                            <SelectTrigger className="h-8 w-auto min-w-[120px] text-sm border-slate-300 rounded-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {sortOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
                            className="p-1.5 h-8 w-8 border-slate-300 rounded-none"
                        >
                            {sortDir === "desc" ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronUp size={16} />
                            )}
                        </Button>
                    </div>
                )}

                {/* Date Filter (Optional) */}
                {showDateFilter && (
                    <>
                        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-none border-slate-300"
                        >
                            <Calendar size={14} className="mr-1" />
                            Chọn ngày
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export default DynamicToolbar;
