"use client";

import React from "react";
import { TreemapChartComponent } from "@/components/charts/TreemapChart";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function TreemapChartRenderer({ config, data, xAxisKey, yAxisKeys, styleProps, formatDataLabel, height }: ChartRendererProps) {
    const valueKey = yAxisKeys[0] || "value";
    const nameKey = xAxisKey || "name";

    const treemapData = data.map((item, index) => ({
        name: String(item[nameKey] || `Item ${index + 1}`),
        value: Number(item[valueKey] || 0),
        children: Array.isArray(item.children)
            ? (item.children as Record<string, unknown>[]).map((child, childIndex) => ({
                name: String(child[nameKey] || child.name || `Child ${childIndex + 1}`),
                value: Number(child[valueKey] || child.value || 0),
            }))
            : undefined,
    }));

    return (
        <TreemapChartComponent
            data={treemapData}
            colors={styleProps.colors}
            height={typeof height === "number" ? height : 400}
            showLabels={config.style?.showDataLabels !== false}
            showTooltip={config.style?.showTooltip !== false}
            enableDrillDown
            valueFormatter={(value) => formatDataLabel(value)}
        />
    );
}
