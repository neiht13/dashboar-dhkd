"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DataTileProps {
    /** Mã/Code hiển thị (VD: "CBE", "MTH") */
    code: string;
    /** Tên đầy đủ (VD: "Cái Bè", "Mỹ Tho") */
    name?: string;
    /** Label cho metric chính */
    metricLabel?: string;
    /** Giá trị % của metric chính */
    percentValue: number;
    /** Giá trị thực hiện */
    actualValue: number;
    /** Giá trị kế hoạch */
    planValue: number;
    /** Ngưỡng để xác định "đạt" (mặc định 100) */
    threshold?: number;
    /** Đang được chọn */
    isSelected?: boolean;
    /** Handler khi click */
    onClick?: () => void;
    /** Custom className */
    className?: string;
    /** Custom màu chính */
    accentColor?: string;
}

/**
 * DataTile - Grid tile component cho dashboard
 * Dựa trên UnitTile từ example.tsx
 */
export function DataTile({
    code,
    name,
    metricLabel = "Tỷ lệ",
    percentValue,
    actualValue,
    planValue,
    threshold = 100,
    isSelected = false,
    onClick,
    className,
    accentColor = "#3b82f6",
}: DataTileProps) {
    const isHighPerformance = percentValue >= threshold;
    const progressPercent = Math.min(percentValue, 100);

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative p-3 border-2 cursor-pointer transition-all duration-200",
                "hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-28 group",
                isSelected
                    ? "border-blue-600 bg-blue-50/10 z-10"
                    : "border-slate-100 bg-white hover:border-blue-300",
                className
            )}
        >
            {/* Header: Code + Status Diamond */}
            <div className="flex justify-between items-start">
                <div>
                    <span className={cn(
                        "font-black text-sm uppercase",
                        isSelected ? "text-blue-700" : "text-slate-700"
                    )}>
                        {code}
                    </span>
                    {name && (
                        <span className="block text-[9px] text-slate-400 truncate max-w-[80px]">
                            {name}
                        </span>
                    )}
                </div>

                {/* Diamond shape cho high performers */}
                {isHighPerformance && (
                    <div className="w-2 h-2 bg-emerald-500 rotate-45" />
                )}
            </div>

            {/* Metric Display */}
            <div className="mt-2">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {metricLabel}
                    </span>
                    <span className={cn(
                        "text-xl",
                        isHighPerformance ? "text-emerald-600 font-bold" : "text-slate-800 font-light"
                    )}>
                        {percentValue.toFixed(1)}%
                    </span>
                </div>

                {/* Progress Bar Mini */}
                <div className="w-full bg-slate-100 h-1.5 mt-1 overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            isHighPerformance ? "bg-emerald-500" : "bg-blue-500"
                        )}
                        style={{
                            width: `${progressPercent}%`,
                            backgroundColor: isHighPerformance ? undefined : accentColor
                        }}
                    />
                </div>
            </div>

            {/* Footer: Actual vs Plan */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>TH: <b className="text-slate-700">{actualValue.toLocaleString()}</b></span>
                <span>KH: {planValue.toLocaleString()}</span>
            </div>
        </div>
    );
}

/**
 * DataTileGrid - Container grid cho DataTile
 */
interface DataTileGridProps {
    children: React.ReactNode;
    className?: string;
    columns?: 2 | 3 | 4 | 6 | 8;
}

export function DataTileGrid({
    children,
    className,
    columns = 4
}: DataTileGridProps) {
    const gridCols = {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-2 md:grid-cols-4",
        6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
        8: "grid-cols-2 md:grid-cols-4 lg:grid-cols-8",
    };

    return (
        <div className={cn("grid gap-3", gridCols[columns], className)}>
            {children}
        </div>
    );
}

export default DataTile;
