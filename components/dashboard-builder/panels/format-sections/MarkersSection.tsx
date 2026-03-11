"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { ChartStyle } from "@/types";

interface MarkersSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

export function MarkersSection({ style, onStyleChange }: MarkersSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Hiển thị điểm đánh dấu</span>
                <Switch
                    checked={style.showMarkers ?? true}
                    onCheckedChange={(checked) => onStyleChange({ showMarkers: checked })}
                />
            </div>
            {style.showMarkers !== false && (
                <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Kích thước</label>
                    <Input
                        type="number"
                        value={style.markerSize || 4}
                        onChange={(e) => onStyleChange({ markerSize: parseInt(e.target.value) || 4 })}
                        className="h-7 text-[11px]"
                        min={2}
                        max={12}
                    />
                </div>
            )}
        </div>
    );
}
