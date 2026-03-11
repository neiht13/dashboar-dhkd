"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import type { ChartStyle } from "@/types";

interface LegendSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

const LEGEND_POSITIONS = [
    { value: "top", label: "Trên" },
    { value: "bottom", label: "Dưới" },
    { value: "left", label: "Trái" },
    { value: "right", label: "Phải" },
] as const;

export function LegendSection({ style, onStyleChange }: LegendSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Hiển thị</span>
                <Switch
                    checked={style.showLegend ?? true}
                    onCheckedChange={(checked) => onStyleChange({ showLegend: checked })}
                />
            </div>
            {style.showLegend !== false && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Vị trí</label>
                    <div className="grid grid-cols-4 gap-1">
                        {LEGEND_POSITIONS.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => onStyleChange({ legendPosition: value })}
                                className={`text-[10px] py-1 rounded border transition-colors ${
                                    (style.legendPosition || "bottom") === value
                                        ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400"
                                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
