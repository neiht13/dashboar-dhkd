"use client";

import React from "react";
import type { ChartStyle } from "@/types";
import { MODERN_CHART_COLORS } from "@/types/chart";

interface ColorsSectionProps {
    style: ChartStyle;
    yAxisKeys: string[];
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

const PRESET_PALETTES = [
    { name: "Mặc định", colors: ["#0066FF", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"] },
    { name: "Ocean", colors: ["#0077B6", "#00B4D8", "#90E0EF", "#023E8A", "#48CAE4", "#ADE8F4"] },
    { name: "Sunset", colors: ["#F94144", "#F3722C", "#F8961E", "#F9844A", "#F9C74F", "#90BE6D"] },
    { name: "Forest", colors: ["#2D6A4F", "#40916C", "#52B788", "#74C69D", "#95D5B2", "#B7E4C7"] },
    { name: "Corporate", colors: ["#003F5C", "#2F4B7C", "#665191", "#A05195", "#D45087", "#F95D6A"] },
    { name: "Pastel", colors: ["#BDB2FF", "#FFC6FF", "#CAFFBF", "#FDFFB6", "#A0C4FF", "#FFD6A5"] },
];

export function ColorsSection({ style, yAxisKeys, onStyleChange }: ColorsSectionProps) {
    const currentColors = style.colors || [...MODERN_CHART_COLORS];
    const fieldColors = style.yAxisFieldColors || {};

    return (
        <div className="space-y-3 p-3">
            {/* Preset palettes */}
            <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1.5">Bảng màu</label>
                <div className="space-y-1">
                    {PRESET_PALETTES.map((palette) => (
                        <button
                            key={palette.name}
                            onClick={() => onStyleChange({ colors: palette.colors })}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex gap-0.5">
                                {palette.colors.slice(0, 6).map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-4 h-4 rounded-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{palette.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Per-field color overrides */}
            {yAxisKeys.length > 0 && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1.5">Màu theo trường</label>
                    <div className="space-y-1">
                        {yAxisKeys.map((field, index) => (
                            <div key={field} className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={fieldColors[field] || currentColors[index % currentColors.length] || "#0066FF"}
                                    onChange={(e) => {
                                        onStyleChange({
                                            yAxisFieldColors: {
                                                ...fieldColors,
                                                [field]: e.target.value,
                                            },
                                        });
                                    }}
                                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                />
                                <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate flex-1">
                                    {field}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
