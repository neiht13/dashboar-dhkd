"use client";

import React from "react";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";

export function GlobalFilters() {
    const { globalFilters, setGlobalFilters } = useDashboardStore();

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setGlobalFilters({
            dateRange: {
                from: range?.from,
                to: range?.to
            }
        });
    };

    const handleClearFilters = () => {
        setGlobalFilters({
            dateRange: { from: undefined, to: undefined }
        });
    };

    const dateRangeValue: DateRange | undefined =
        globalFilters.dateRange.from || globalFilters.dateRange.to
            ? { from: globalFilters.dateRange.from, to: globalFilters.dateRange.to }
            : undefined;

    return (
        <div className="flex items-center gap-3 py-3 px-6 bg-white border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-sm text-[#64748B] font-medium">
                <CalendarIcon className="h-4 w-4" />
                <span>Bộ lọc:</span>
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                placeholder="Chọn khoảng thời gian"
            />

            {/* Clear Button */}
            {dateRangeValue && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[#64748B] hover:text-[#0F172A]"
                    onClick={handleClearFilters}
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Xóa lọc
                </Button>
            )}
        </div>
    );
}
