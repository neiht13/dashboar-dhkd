"use client";

import React from "react";
import { PieChartComponent } from "@/components/charts/types";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function PieChartRenderer({
    config,
    data,
    width,
    height,
    xAxisKey,
    yAxisKeys,
    styleProps,
    onDataPointClick,
}: ChartRendererProps) {
    const pieVariant =
        config.type === "sizedPie"
            ? "sized"
            : config.type === "donut"
                ? "donut"
                : config.style?.pieVariant === "sized"
                    ? "sized"
                    : config.style?.pieVariant === "donut"
                        ? "donut"
                        : "default";

    return (
        <PieChartComponent
            data={data}
            config={config}
            width={width}
            height={height}
            nameKey={xAxisKey}
            valueKey={yAxisKeys[0] || "value"}
            styleProps={styleProps}
            innerRadius={config.style?.innerRadius}
            pieVariant={pieVariant}
            onChartClick={onDataPointClick ? (payload) => onDataPointClick(payload, xAxisKey) : undefined}
        />
    );
}
