"use client";

import React from "react";
import { WaterfallChartComponent } from "@/components/charts/WaterfallChart";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function WaterfallChartRenderer({ config, data, xAxisKey, yAxisKeys, styleProps, formatDataLabel }: ChartRendererProps) {
    const valueKey = yAxisKeys[0] || "value";

    const waterfallData = data.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const itemType = (item.type as "start" | "increase" | "decrease" | "total" | undefined);
        const isTotal = Boolean(item.isTotal);

        let derivedType: "start" | "increase" | "decrease" | "total";
        if (itemType) {
            derivedType = itemType;
        } else if (isTotal) {
            derivedType = "total";
        } else if (index === 0) {
            derivedType = "start";
        } else if (value >= 0) {
            derivedType = "increase";
        } else {
            derivedType = "decrease";
        }

        return {
            name: String(item[xAxisKey] || `Item ${index + 1}`),
            value,
            type: derivedType,
        };
    });

    return (
        <WaterfallChartComponent
            data={waterfallData}
            colors={{
                start: styleProps.colors[2] || "#64748b",
                increase: config.style?.conditionalColoring?.aboveColor || styleProps.colors[0] || "#22c55e",
                decrease: config.style?.conditionalColoring?.belowColor || "#ef4444",
                total: styleProps.colors[1] || "#3b82f6",
            }}
            height={typeof config.style?.titleFontSize === "number" ? undefined : 400}
            showLabels={config.style?.showDataLabels !== false}
            showTooltip={config.style?.showTooltip !== false}
            showConnectors
            valueFormatter={(value) => formatDataLabel(value)}
        />
    );
}
