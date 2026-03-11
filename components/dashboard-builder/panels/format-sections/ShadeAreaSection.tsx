"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface ShadeAreaSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

export function ShadeAreaSection({ style, onStyleChange }: ShadeAreaSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Tô vùng dưới đường</span>
                <Switch
                    checked={style.shadeArea ?? false}
                    onCheckedChange={(checked) => onStyleChange({ shadeArea: checked })}
                />
            </div>
            {style.shadeArea && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Độ mờ (0-1)</label>
                    <Input
                        type="number"
                        value={style.shadeAreaOpacity || 0.15}
                        onChange={(e) => onStyleChange({ shadeAreaOpacity: parseFloat(e.target.value) || 0.15 })}
                        className="h-7 text-[11px]"
                        min={0}
                        max={1}
                        step={0.05}
                    />
                </div>
            )}
        </div>
    );
}
