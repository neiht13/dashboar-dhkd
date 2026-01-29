"use client";

import React from "react";
import { DataTile } from "./DataTile";
import { cn } from "@/lib/utils";

interface UnitTileGridProps {
    data: any[];
    labelField: string;
    valueField: string;
    targetField?: string;
    actualField?: string;
    threshold?: number; // percent
    columns?: 2 | 4 | 6 | 8;
    onSelect?: (item: any) => void;
    selectedId?: string | number;
    className?: string;
}

export function UnitTileGrid({
    data,
    labelField,
    valueField,
    targetField,
    actualField,
    threshold = 100,
    columns = 4,
    onSelect,
    selectedId,
    className,
}: UnitTileGridProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Chưa có dữ liệu
            </div>
        );
    }

    const gridCols = {
        2: "grid-cols-1 sm:grid-cols-2",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        8: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8",
    }[columns];

    return (
        <div className={cn("grid gap-4", gridCols, className)}>
            {data.map((item, index) => {
                const label = item[labelField] || `Item ${index + 1}`;
                const value = item[valueField];
                // Use actualField if provided, otherwise use valueField for calculations
                const actual = actualField ? item[actualField] : value;
                const target = targetField ? item[targetField] : undefined;

                // Determine if achieved
                let isHighPerformer = false;
                if (target) {
                    const pct = (Number(actual) / Number(target)) * 100;
                    isHighPerformer = pct >= threshold;
                }

                return (
                    <DataTile
                        key={index}
                        label={String(label)}
                        value={Number(value).toLocaleString()} // Format value
                        target={target ? Number(target) : undefined}
                        isHighPerformer={isHighPerformer}
                        color={isHighPerformer ? "#10b981" : "#3b82f6"} // Green if achieved, otherwise Blue
                        showProgress={!!target}
                        onClick={() => onSelect?.(item)}
                        className={cn(
                            selectedId && item[labelField] === selectedId ? "ring-2 ring-blue-500" : ""
                        )}
                    />
                );
            })}
        </div>
    );
}
