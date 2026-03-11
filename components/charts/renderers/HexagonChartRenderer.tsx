"use client";

import React from "react";
import * as icons from "lucide-react";
import { HexagonStat } from "@/components/charts/HexagonStat";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function HexagonChartRenderer({
    config,
    data,
    yAxisKeys,
    styleProps,
}: ChartRendererProps) {
    const valueKey = yAxisKeys[0] || "value";
    const currentValue = data[0]?.[valueKey] ?? 0;
    const trend = data[0]?.trend || data[0]?.growth;

    const iconName = config.style?.cardIcon as keyof typeof icons;
    const IconComponent = iconName && icons[iconName] ? icons[iconName] : undefined;

    return (
        <div className="flex items-center justify-center w-full h-full p-4">
            <HexagonStat
                label={config.style?.title || valueKey}
                value={typeof currentValue === "number" ? currentValue.toLocaleString() : String(currentValue)}
                trend={typeof trend === "number" ? Number(trend) : undefined}
                color={styleProps.colors[0] || "#3b82f6"}
                icon={IconComponent ? React.createElement(IconComponent as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" }) : undefined}
            />
        </div>
    );
}
