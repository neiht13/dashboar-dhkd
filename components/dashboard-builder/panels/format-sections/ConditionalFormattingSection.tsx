"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface ConditionalFormattingSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

export function ConditionalFormattingSection({ style, onStyleChange }: ConditionalFormattingSectionProps) {
    const cc = style.conditionalColoring || {
        enabled: false,
        targetValue: 0,
        belowColor: "#EF4444",
        aboveColor: "#10B981",
        equalColor: "#F59E0B",
    };

    const updateCC = (updates: Partial<typeof cc>) => {
        onStyleChange({
            conditionalColoring: { ...cc, ...updates },
        });
    };

    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Bật định dạng điều kiện</span>
                <Switch
                    checked={cc.enabled}
                    onCheckedChange={(checked) => updateCC({ enabled: checked })}
                />
            </div>

            {cc.enabled && (
                <>
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Giá trị mục tiêu</label>
                        <Input
                            type="number"
                            value={cc.targetValue ?? 0}
                            onChange={(e) => updateCC({ targetValue: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-[11px]"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Trường so sánh (tuỳ chọn)</label>
                        <Input
                            value={cc.targetField || ""}
                            onChange={(e) => updateCC({ targetField: e.target.value || undefined })}
                            className="h-7 text-[11px]"
                            placeholder="Để trống = dùng giá trị cố định"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Dưới</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="color"
                                    value={cc.belowColor || "#EF4444"}
                                    onChange={(e) => updateCC({ belowColor: e.target.value })}
                                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Bằng</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="color"
                                    value={cc.equalColor || "#F59E0B"}
                                    onChange={(e) => updateCC({ equalColor: e.target.value })}
                                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Trên</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="color"
                                    value={cc.aboveColor || "#10B981"}
                                    onChange={(e) => updateCC({ aboveColor: e.target.value })}
                                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
