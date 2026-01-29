"use client";

import React from "react";
import { Search, ArrowUpDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/types";

interface SortOption {
    value: string;
    label: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface DynamicToolbarProps {
    dataSource?: DataSource;
    // Search
    searchValue?: string;
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    // Sort
    sortOptions?: SortOption[];
    sortValue?: string;
    sortDirection?: "asc" | "desc";
    onSortChange?: (value: string) => void;
    onSortDirectionToggle?: () => void;
    // Filter
    filterOptions?: FilterOption[];
    filterValue?: string;
    onFilterChange?: (value: string) => void;
    // Style
    className?: string;
    sticky?: boolean;
}

/**
 * DynamicToolbar - Toolbar với sort options động từ DataSource
 * Từ example.tsx pattern - filter buttons configurable và sticky positioning
 */
export function DynamicToolbar({
    dataSource,
    searchValue = "",
    searchPlaceholder = "Tìm kiếm...",
    onSearchChange,
    sortOptions,
    sortValue,
    sortDirection = "desc",
    onSortChange,
    onSortDirectionToggle,
    filterOptions,
    filterValue = "all",
    onFilterChange,
    className,
    sticky = false,
}: DynamicToolbarProps) {
    // Auto-generate sort options from DataSource if not provided
    const effectiveSortOptions = React.useMemo(() => {
        if (sortOptions && sortOptions.length > 0) return sortOptions;
        if (!dataSource) return [];

        const options: SortOption[] = [];

        // Add xAxis as option
        if (dataSource.xAxis) {
            options.push({ value: dataSource.xAxis, label: dataSource.xAxis });
        }

        // Add yAxis fields as options
        if (dataSource.yAxis && Array.isArray(dataSource.yAxis)) {
            dataSource.yAxis.forEach((field) => {
                options.push({ value: field, label: field });
            });
        }

        // Add orderBy if different
        if (
            dataSource.orderBy &&
            !options.find((o) => o.value === dataSource.orderBy)
        ) {
            options.push({ value: dataSource.orderBy, label: dataSource.orderBy });
        }

        return options;
    }, [sortOptions, dataSource]);

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-3 p-3 bg-slate-50 border-b border-slate-200",
                sticky && "sticky top-0 z-10",
                className
            )}
        >
            {/* Search */}
            {onSearchChange && (
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9 rounded-none border-slate-200 focus:border-slate-400 h-9"
                    />
                </div>
            )}

            {/* Filter Buttons */}
            {filterOptions && filterOptions.length > 0 && onFilterChange && (
                <div className="flex gap-1">
                    {filterOptions.map((option) => (
                        <Button
                            key={option.value}
                            size="sm"
                            variant={filterValue === option.value ? "default" : "outline"}
                            onClick={() => onFilterChange(option.value)}
                            className={cn(
                                "rounded-none h-8 text-xs font-bold",
                                filterValue === option.value
                                    ? "bg-slate-800 text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            )}

            <div className="flex-1" />

            {/* Sort */}
            {effectiveSortOptions.length > 0 && onSortChange && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Sắp xếp:</span>
                    <Select value={sortValue} onValueChange={onSortChange}>
                        <SelectTrigger className="w-32 h-8 rounded-none text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {effectiveSortOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {onSortDirectionToggle && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onSortDirectionToggle}
                            className="h-8 w-8 p-0 rounded-none"
                            title={sortDirection === "asc" ? "Tăng dần" : "Giảm dần"}
                        >
                            <ArrowUpDown
                                className={cn(
                                    "h-4 w-4 transition-transform",
                                    sortDirection === "asc" && "rotate-180"
                                )}
                            />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default DynamicToolbar;
