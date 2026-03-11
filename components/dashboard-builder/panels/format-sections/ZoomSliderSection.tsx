"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import type { ChartStyle } from "@/types";

interface ZoomSliderSectionProps {
    style: ChartStyle;
    onStyleChange: (updates: Partial<ChartStyle>) => void;
}

export function ZoomSliderSection({ style, onStyleChange }: ZoomSliderSectionProps) {
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Thanh kéo zoom trục X</span>
                <Switch
                    checked={style.zoomSlider ?? false}
                    onCheckedChange={(checked) => onStyleChange({ zoomSlider: checked })}
                />
            </div>
            {style.zoomSlider && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Kéo thanh trượt bên dưới biểu đồ để phóng to/thu nhỏ vùng dữ liệu trên trục X.
                </p>
            )}
        </div>
    );
}
