"use client";

import React from "react";
import { FunnelChartComponent } from "@/components/charts/types";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function FunnelChartRenderer({
    config,
    data,
    width,
    height,
    xAxisKey,
    yAxisKeys,
    styleProps,
    onDataPointClick,
}: ChartRendererProps) {
    return (
        <FunnelChartComponent
            data={data}
            config={config}
            width={width}
            height={height}
            nameKey={xAxisKey}
            valueKey={yAxisKeys[0] || "value"}
            colors={styleProps.colors}
            styleProps={{
                showDataLabels: styleProps.showDataLabels,
                showTooltip: styleProps.showTooltip,
                showLegend: styleProps.showLegend,
                tooltipTheme: styleProps.tooltipTheme,
            }}
            onChartClick={onDataPointClick ? (payload) => onDataPointClick(payload, xAxisKey) : undefined}
        />
    );
}
