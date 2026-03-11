"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import type { ChartStyle, ChartConfig } from "@/types";

interface AxisSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
    axis: "x" | "y" | "secondary";
}

export function AxisSection({ style, onStyleChange, axis }: AxisSectionProps) {
    const [newExcludeValue, setNewExcludeValue] = useState("");

    // Get current chart data X values for exclude picker
    const { selectedWidgetId, currentDashboard } = useDashboardStore(
        useShallow((s) => ({
            selectedWidgetId: s.selectedWidgetId,
            currentDashboard: s.currentDashboard,
        }))
    );

    const chartConfig = useMemo(() => {
        const widget = currentDashboard?.widgets.find(w => w.id === selectedWidgetId);
        return widget?.type === "chart" ? widget.config as ChartConfig : null;
    }, [selectedWidgetId, currentDashboard]);

    if (axis === "x") {
        const excludeValues = style.xAxisExclude || [];

        const addExcludeValue = () => {
            if (!newExcludeValue.trim()) return;
            const updated = [...excludeValues, newExcludeValue.trim()];
            onStyleChange({ xAxisExclude: updated });
            setNewExcludeValue("");
        };

        const removeExcludeValue = (val: string) => {
            onStyleChange({ xAxisExclude: excludeValues.filter(v => v !== val) });
        };

        return (
            <div className="space-y-3 p-3">
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Nhãn trục X</label>
                    <Input
                        value={style.xAxisLabel || ""}
                        onChange={(e) => onStyleChange({ xAxisLabel: e.target.value })}
                        placeholder="Nhập nhãn..."
                        className="h-7 text-[11px]"
                    />
                </div>

                {/* Tick rotation */}
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Góc xoay nhãn</label>
                    <select
                        value={style.xAxisTickAngle ?? 0}
                        onChange={(e) => onStyleChange({ xAxisTickAngle: parseInt(e.target.value) } as Partial<ChartStyle>)}
                        className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                    >
                        <option value={0}>Ngang (0°)</option>
                        <option value={-30}>Nghiêng (-30°)</option>
                        <option value={-45}>Nghiêng (-45°)</option>
                        <option value={-90}>Dọc (-90°)</option>
                    </select>
                </div>

                {/* Tick format */}
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Định dạng giá trị</label>
                    <select
                        value={style.xAxisTickFormat ?? "auto"}
                        onChange={(e) => onStyleChange({ xAxisTickFormat: e.target.value } as Partial<ChartStyle>)}
                        className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                    >
                        <option value="auto">Tự động</option>
                        <option value="truncate">Cắt ngắn (10 ký tự)</option>
                        <option value="short">Viết tắt (5 ký tự)</option>
                    </select>
                </div>

                {/* Hide/Show specific X values */}
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">
                        Ẩn giá trị trục X
                    </label>
                    <div className="flex gap-1 mb-1">
                        <Input
                            value={newExcludeValue}
                            onChange={(e) => setNewExcludeValue(e.target.value)}
                            placeholder="Nhập giá trị cần ẩn..."
                            className="h-6 text-[10px] flex-1"
                            onKeyDown={(e) => { if (e.key === "Enter") addExcludeValue(); }}
                        />
                        <button
                            onClick={addExcludeValue}
                            className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                    {excludeValues.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {excludeValues.map((val) => (
                                <span
                                    key={val}
                                    className="inline-flex items-center gap-0.5 text-[9px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-800"
                                >
                                    {val}
                                    <button onClick={() => removeExcludeValue(val)} className="hover:text-red-800">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (axis === "y") {
        return (
            <div className="space-y-3 p-3">
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Nhãn trục Y</label>
                    <Input
                        value={style.yAxisLabel || ""}
                        onChange={(e) => onStyleChange({ yAxisLabel: e.target.value })}
                        placeholder="Nhập nhãn..."
                        className="h-7 text-[11px]"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Định dạng số</label>
                    <select
                        value={style.dataLabelFormat || "full"}
                        onChange={(e) => onStyleChange({ dataLabelFormat: e.target.value as ChartStyle["dataLabelFormat"] })}
                        className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                    >
                        <option value="full">Đầy đủ (1,000,000)</option>
                        <option value="k">Nghìn (1,000k)</option>
                        <option value="tr">Triệu (1tr)</option>
                        <option value="ty">Tỷ (1tỷ)</option>
                    </select>
                </div>
            </div>
        );
    }

    // Secondary Y-axis
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Bật trục Y phụ</span>
                <Switch
                    checked={style.secondaryYAxis || false}
                    onCheckedChange={(checked) => onStyleChange({ secondaryYAxis: checked })}
                />
            </div>
            {style.secondaryYAxis && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Nhãn trục Y phụ</label>
                    <Input
                        value={style.secondaryYAxisLabel || ""}
                        onChange={(e) => onStyleChange({ secondaryYAxisLabel: e.target.value })}
                        placeholder="Nhập nhãn..."
                        className="h-7 text-[11px]"
                    />
                </div>
            )}
        </div>
    );
}
