"use client";

import React from "react";
import { AngularGauge, getGaugeColor } from "@/components/charts/AngularGauge";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function GaugeChartRenderer({ config, data, yAxisKeys }: ChartRendererProps) {
    const valueKey = yAxisKeys[0] || "value";
    const gaugeValue = Number(data[0]?.[valueKey] || 0);
    const threshold = (config.style as { kpiThreshold?: number } | undefined)?.kpiThreshold || 100;

    return (
        <div className="flex items-center justify-center h-full py-4">
            <AngularGauge
                value={gaugeValue}
                color={getGaugeColor(gaugeValue, threshold)}
                label={config.style?.title || valueKey}
                size={150}
            />
        </div>
    );
}
