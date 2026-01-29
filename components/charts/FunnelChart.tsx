"use client";

import React from "react";
import {
    FunnelChart as RechartsFunnel,
    Funnel,
    LabelList,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export interface FunnelDataPoint {
    name: string;
    value: number;
    percentage?: number;
    fill?: string;
}

interface FunnelChartProps {
    data: FunnelDataPoint[];
    colors?: string[];
    showLabels?: boolean;
    showPercentage?: boolean;
    showTooltip?: boolean;
    animated?: boolean;
    className?: string;
    height?: number | string;
    labelPosition?: "left" | "right" | "inside" | "outside";
    gradientFill?: boolean;
}

const DEFAULT_COLORS = [
    "#8b5cf6", // Purple
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#0ea5e9", // Sky
    "#06b6d4", // Cyan
    "#14b8a6", // Teal
    "#10b981", // Emerald
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover border rounded-lg shadow-lg p-3">
                <p className="font-medium text-sm">{data.name}</p>
                <p className="text-muted-foreground text-sm">
                    Số lượng: <span className="font-medium text-foreground">
                        {data.value.toLocaleString("vi-VN")}
                    </span>
                </p>
                {data.percentage !== undefined && (
                    <p className="text-muted-foreground text-sm">
                        Tỷ lệ: <span className="font-medium text-foreground">
                            {data.percentage}%
                        </span>
                    </p>
                )}
            </div>
        );
    }
    return null;
};

export function FunnelChartComponent({
    data,
    colors = DEFAULT_COLORS,
    showLabels = true,
    showPercentage = true,
    showTooltip = true,
    animated = true,
    className,
    height = 400,
    labelPosition = "right",
    gradientFill = false,
}: FunnelChartProps) {
    // Calculate percentages if not provided
    const processedData = data.map((item, index) => ({
        ...item,
        percentage: item.percentage ?? (index === 0
            ? 100
            : Math.round((item.value / data[0].value) * 100)),
        fill: item.fill || colors[index % colors.length],
    }));

    // Calculate conversion rates between stages
    const conversionRates = processedData.map((item, index) => {
        if (index === 0) return null;
        const prevValue = processedData[index - 1].value;
        return prevValue > 0 ? Math.round((item.value / prevValue) * 100) : 0;
    });

    return (
        <div className={cn("w-full", className)}>
            <ResponsiveContainer width="100%" height={height}>
                <RechartsFunnel>
                    {gradientFill && (
                        <defs>
                            {processedData.map((entry, index) => (
                                <linearGradient
                                    key={`gradient-${index}`}
                                    id={`funnelGradient-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="0"
                                >
                                    <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                    )}
                    {showTooltip && <Tooltip content={<CustomTooltip />} />}
                    <Funnel
                        dataKey="value"
                        data={processedData}
                        isAnimationActive={animated}
                        animationDuration={800}
                    >
                        {processedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={gradientFill ? `url(#funnelGradient-${index})` : entry.fill}
                            />
                        ))}
                        {showLabels && (
                            <LabelList
                                position={labelPosition}
                                fill="#333"
                                stroke="none"
                                dataKey="name"
                                formatter={(value: string, entry: any, index: number) => {
                                    const item = processedData[index];
                                    if (showPercentage && item) {
                                        return `${value} (${item.percentage}%)`;
                                    }
                                    return value;
                                }}
                                className="text-xs font-medium fill-foreground"
                            />
                        )}
                    </Funnel>
                </RechartsFunnel>
            </ResponsiveContainer>

            {/* Conversion rates */}
            <div className="mt-4 space-y-2">
                {conversionRates.map((rate, index) => {
                    if (rate === null) return null;
                    return (
                        <div
                            key={index}
                            className="flex items-center justify-between text-sm px-2"
                        >
                            <span className="text-muted-foreground">
                                {processedData[index - 1].name} → {processedData[index].name}
                            </span>
                            <span
                                className={cn(
                                    "font-medium",
                                    rate >= 70 ? "text-green-600" :
                                        rate >= 40 ? "text-yellow-600" :
                                            "text-red-600"
                                )}
                            >
                                {rate}% chuyển đổi
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default FunnelChartComponent;
