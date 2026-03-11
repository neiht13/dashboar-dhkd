"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface DataLabelsSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

const LABEL_POSITIONS = [
    { value: "top", label: "Trên" },
    { value: "center", label: "Giữa" },
    { value: "bottom", label: "Dưới" },
] as const;

const LABEL_FORMATS = [
    { value: "full", label: "Đầy đủ" },
    { value: "k", label: "K (nghìn)" },
    { value: "tr", label: "Tr (triệu)" },
    { value: "ty", label: "Tỷ" },
] as const;

export function DataLabelsSection({ style, onStyleChange }: DataLabelsSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Hiển thị</span>
                <Switch
                    checked={style.showDataLabels ?? false}
                    onCheckedChange={(checked) => onStyleChange({ showDataLabels: checked })}
                />
            </div>

            {style.showDataLabels && (
                <>
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Vị trí</label>
                        <div className="grid grid-cols-3 gap-1">
                            {LABEL_POSITIONS.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => onStyleChange({ dataLabelPosition: value })}
                                    className={`text-[10px] py-1 rounded border transition-colors ${
                                        (style.dataLabelPosition || "top") === value
                                            ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400"
                                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Định dạng</label>
                        <div className="grid grid-cols-4 gap-1">
                            {LABEL_FORMATS.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => onStyleChange({ dataLabelFormat: value })}
                                    className={`text-[10px] py-1 rounded border transition-colors ${
                                        (style.dataLabelFormat || "full") === value
                                            ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400"
                                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Màu</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="color"
                                    value={style.dataLabelColor || "#1E293B"}
                                    onChange={(e) => onStyleChange({ dataLabelColor: e.target.value })}
                                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                />
                                <Input
                                    value={style.dataLabelColor || "#1E293B"}
                                    onChange={(e) => onStyleChange({ dataLabelColor: e.target.value })}
                                    className="h-7 text-[10px] flex-1"
                                />
                            </div>
                        </div>
                        <div className="w-16">
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Cỡ chữ</label>
                            <Input
                                type="number"
                                value={style.dataLabelFontSize || 10}
                                onChange={(e) => onStyleChange({ dataLabelFontSize: parseInt(e.target.value) || 10 })}
                                className="h-7 text-[11px]"
                                min={6}
                                max={24}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
