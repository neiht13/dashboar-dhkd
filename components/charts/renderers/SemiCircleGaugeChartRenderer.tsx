"use client";

import React from "react";
import { SemiCircleGauge } from "@/components/charts/SemiCircleGauge";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function SemiCircleGaugeChartRenderer({ config, data, yAxisKeys }: ChartRendererProps) {
    const valueKey = yAxisKeys[0] || "value";
    const gaugeValue = Number(data[0]?.[valueKey] || 0);

    return (
        <div className="flex items-center justify-center h-full py-4">
            <SemiCircleGauge
                value={gaugeValue}
                min={config.style?.gaugeMin ?? 0}
                max={config.style?.gaugeMax ?? 100}
                label={config.style?.title || valueKey}
                thresholds={config.style?.gaugeThresholds || [
                    { value: 50, color: "#ef4444", label: "Thấp" },
                    { value: 75, color: "#f59e0b", label: "TB" },
                    { value: 100, color: "#22c55e", label: "Tốt" },
                ]}
                showNeedle={config.style?.showGaugeNeedle !== false}
                size="lg"
            />
        </div>
    );
}
