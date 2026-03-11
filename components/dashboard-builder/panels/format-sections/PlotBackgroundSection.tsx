"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface PlotBackgroundSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

const PRESET_BACKGROUNDS = [
    { value: "transparent", label: "Trong suốt" },
    { value: "#FFFFFF", label: "Trắng" },
    { value: "#F8FAFC", label: "Xám nhạt" },
    { value: "#F0FDF4", label: "Xanh nhạt" },
    { value: "#FEF3C7", label: "Vàng nhạt" },
    { value: "#FFF1F2", label: "Hồng nhạt" },
];

export function PlotBackgroundSection({ style, onStyleChange }: PlotBackgroundSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Màu nền vùng vẽ</label>
                <div className="grid grid-cols-6 gap-1 mb-2">
                    {PRESET_BACKGROUNDS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => onStyleChange({ plotAreaBackground: value })}
                            title={label}
                            className={`w-7 h-7 rounded border transition-all ${
                                (style.plotAreaBackground || "transparent") === value
                                    ? "ring-2 ring-blue-400 ring-offset-1"
                                    : "border-gray-200 dark:border-gray-600"
                            }`}
                            style={{ backgroundColor: value === "transparent" ? undefined : value }}
                        >
                            {value === "transparent" && (
                                <span className="text-[8px] text-gray-400">∅</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={style.plotAreaBackground || "#FFFFFF"}
                        onChange={(e) => onStyleChange({ plotAreaBackground: e.target.value })}
                        className="w-7 h-7 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                    />
                    <Input
                        value={style.plotAreaBackground || "transparent"}
                        onChange={(e) => onStyleChange({ plotAreaBackground: e.target.value })}
                        className="h-7 text-[11px] flex-1"
                        placeholder="transparent"
                    />
                </div>
            </div>
        </div>
    );
}
