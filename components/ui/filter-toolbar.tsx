"use client";

import React from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
    value: string;
    label: string;
}

interface SortOption {
    value: string;
    label: string;
}

interface FilterToolbarProps {
    // Search
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    // Status Filter
    filterOptions?: FilterOption[];
    filterValue?: string;
    onFilterChange?: (value: string) => void;

    // Sort
    sortOptions?: SortOption[];
    sortValue?: string;
    onSortChange?: (value: string) => void;
    sortDirection?: "asc" | "desc";
    onSortDirectionChange?: (dir: "asc" | "desc") => void;

    className?: string;
    sticky?: boolean;
}

export function FilterToolbar({
    searchValue = "",
    onSearchChange,
    searchPlaceholder = "Tìm kiếm...",
    filterOptions = [],
    filterValue = "all",
    onFilterChange,
    sortOptions = [],
    sortValue = "",
    onSortChange,
    sortDirection = "desc",
    onSortDirectionChange,
    className,
    sticky = true,
}: FilterToolbarProps) {
    return (
        <div
            className={cn(
                "bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4",
                sticky && "sticky top-16 z-20",
                className
            )}
        >
            {/* Search Input */}
            {onSearchChange && (
                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 focus:border-blue-500 focus:ring-0 rounded-none bg-slate-50 focus:bg-white transition-colors outline-none"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                {/* Status Filter Buttons */}
                {filterOptions.length > 0 && onFilterChange && (
                    <div className="flex bg-slate-100 p-1 rounded-none">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onFilterChange(option.value)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold transition-all",
                                    filterValue === option.value
                                        ? "bg-white shadow text-slate-800"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Divider */}
                {filterOptions.length > 0 && sortOptions.length > 0 && (
                    <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
                )}

                {/* Sort Controls */}
                {sortOptions.length > 0 && onSortChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-1">
                            Sắp xếp:
                        </span>
                        <select
                            className="text-sm border border-slate-300 py-1.5 px-3 bg-white outline-none focus:border-blue-500 rounded-none"
                            value={sortValue}
                            onChange={(e) => onSortChange(e.target.value)}
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {onSortDirectionChange && (
                            <button
                                onClick={() =>
                                    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
                                }
                                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-none"
                            >
                                {sortDirection === "desc" ? (
                                    <ChevronDown size={16} />
                                ) : (
                                    <ChevronUp size={16} />
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
