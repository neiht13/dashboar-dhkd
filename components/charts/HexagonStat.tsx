import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HexagonStatProps {
    label: string;
    value: string | number;
    subLabel?: string;
    trend?: number; // percent change
    icon?: React.ReactNode;
    color?: string;
    className?: string;
}

export function HexagonStat({
    label,
    value,
    subLabel,
    trend,
    icon,
    color = "#3b82f6",
    className
}: HexagonStatProps) {
    return (
        <div className={cn("relative flex items-center justify-center w-full h-full min-h-[160px]", className)}>
            {/* Hexagon SVG Background */}
            <svg
                viewBox="0 0 100 115"
                className="absolute w-full h-full drop-shadow-md"
                preserveAspectRatio="xMidYMid meet"
            >
                <path
                    d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z"
                    fill="white" // Dark mode: fill-slate-800
                    className="dark:fill-slate-800"
                    stroke={color}
                    strokeWidth="3"
                />
            </svg>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
                {/* Icon Circle */}
                {icon && (
                    <div className="mb-2 p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
                        {icon}
                    </div>
                )}

                {/* Value */}
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {value}
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight line-clamp-2 max-w-[80px]">
                    {label}
                </div>

                {/* Trend / SubLabel */}
                {(trend !== undefined || subLabel) && (
                    <div className={cn(
                        "flex items-center gap-1 mt-2 text-xs font-semibold",
                        trend && trend > 0 ? "text-emerald-500" : trend && trend < 0 ? "text-red-500" : "text-slate-500"
                    )}>
                        {trend !== undefined && (
                            <>
                                {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                <span>{Math.abs(trend)}%</span>
                            </>
                        )}
                        {subLabel && <span className="text-[10px] text-slate-400">{subLabel}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
