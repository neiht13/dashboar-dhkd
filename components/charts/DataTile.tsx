"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DataTileProps {
    label: string;
    value: number | string;
    target?: number;
    unit?: string;
    color?: string;
    isHighPerformer?: boolean;
    showProgress?: boolean;
    className?: string;
    onClick?: () => void;
}

/**
 * DataTile component - Grid tile với progress bar mini và diamond indicator
 * Từ example.tsx pattern
 */
export function DataTile({
    label,
    value,
    target,
    unit = "",
    color = "#0066FF",
    isHighPerformer = false,
    showProgress = true,
    className,
    onClick,
}: DataTileProps) {
    const numericValue = typeof value === "number" ? value : parseFloat(value) || 0;
    const progress = target ? Math.min((numericValue / target) * 100, 100) : 0;
    const isAchieved = target ? numericValue >= target : false;

    return (
        <div
            className={cn(
                "relative p-4 bg-white border border-slate-200 transition-all duration-300",
                "hover:shadow-md hover:-translate-y-0.5 group cursor-pointer",
                className
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Diamond indicator for high performers */}
            {isHighPerformer && (
                <div
                    className="absolute -top-1 -right-1 w-4 h-4 rotate-45"
                    style={{ backgroundColor: color }}
                />
            )}

            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {label}
            </p>

            {/* Value */}
            <div className="flex items-baseline gap-1">
                <span
                    className="text-2xl font-black tracking-tight"
                    style={{ color: isAchieved ? "#10b981" : color }}
                >
                    {typeof value === "number" ? value.toLocaleString() : value}
                </span>
                {unit && (
                    <span className="text-xs text-slate-400 font-medium">{unit}</span>
                )}
            </div>

            {/* Mini Progress Bar */}
            {showProgress && target && (
                <div className="mt-3">
                    <div className="h-1 bg-slate-100 rounded-none overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{
                                width: `${progress}%`,
                                backgroundColor: isAchieved ? "#10b981" : color,
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-slate-400">
                            {progress.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-400">
                            KH: {target.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {/* Hover accent */}
            <div
                className="absolute left-0 top-0 h-full w-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: color }}
            />
        </div>
    );
}

export default DataTile;
