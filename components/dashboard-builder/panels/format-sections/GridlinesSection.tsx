"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface GridlinesSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

export function GridlinesSection({ style, onStyleChange }: GridlinesSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Hiển thị lưới</span>
                <Switch
                    checked={style.showGrid ?? true}
                    onCheckedChange={(checked) => onStyleChange({ showGrid: checked })}
                />
            </div>
            {style.showGrid !== false && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Màu lưới</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={style.gridColor || "#E2E8F0"}
                            onChange={(e) => onStyleChange({ gridColor: e.target.value })}
                            className="w-7 h-7 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                            value={style.gridColor || "#E2E8F0"}
                            onChange={(e) => onStyleChange({ gridColor: e.target.value })}
                            className="h-7 text-[11px] flex-1"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
