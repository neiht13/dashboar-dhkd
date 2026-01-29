"use client";

import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

export interface WaterfallDataPoint {
    name: string;
    value: number;
    type: "start" | "increase" | "decrease" | "total";
}

interface WaterfallChartProps {
    data: WaterfallDataPoint[];
    colors?: {
        start?: string;
        increase?: string;
        decrease?: string;
        total?: string;
    };
    showGrid?: boolean;
    showTooltip?: boolean;
    showLabels?: boolean;
    showConnectors?: boolean;
    animated?: boolean;
    className?: string;
    height?: number | string;
    valueFormatter?: (value: number) => string;
    horizontal?: boolean;
}

const DEFAULT_COLORS = {
    start: "#64748b",    // Slate
    increase: "#22c55e", // Green
    decrease: "#ef4444", // Red
    total: "#3b82f6",    // Blue
};

// Process data to calculate running totals and positions
function processWaterfallData(data: WaterfallDataPoint[]) {
    let runningTotal = 0;

    return data.map((item, index) => {
        let start = runningTotal;
        let end = runningTotal;
        let displayValue = item.value;

        if (item.type === "start") {
            start = 0;
            end = item.value;
            runningTotal = item.value;
        } else if (item.type === "increase") {
            start = runningTotal;
            end = runningTotal + item.value;
            runningTotal = end;
        } else if (item.type === "decrease") {
            // Value is already negative
            const absValue = Math.abs(item.value);
            start = runningTotal - absValue;
            end = runningTotal;
            runningTotal = start;
            displayValue = item.value; // Keep negative for display
        } else if (item.type === "total") {
            start = 0;
            end = runningTotal;
            displayValue = runningTotal;
        }

        return {
            ...item,
            start: Math.min(start, end),
            end: Math.max(start, end),
            displayValue,
            runningTotal,
            barHeight: Math.abs(end - start),
            isNegative: item.value < 0,
        };
    });
}

const CustomTooltip = ({ active, payload, valueFormatter }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formattedValue = valueFormatter
            ? valueFormatter(data.displayValue)
            : data.displayValue?.toLocaleString("vi-VN");

        const typeLabels: Record<string, string> = {
            start: "Giá trị ban đầu",
            increase: "Tăng",
            decrease: "Giảm",
            total: "Tổng cộng",
        };

        return (
            <div className="bg-popover border rounded-lg shadow-lg p-3">
                <p className="font-medium text-sm">{data.name}</p>
                <p className="text-muted-foreground text-xs mb-1">
                    {typeLabels[data.type]}
                </p>
                <p className="text-sm">
                    Giá trị:{" "}
                    <span className={cn(
                        "font-medium",
                        data.type === "increase" && "text-green-600",
                        data.type === "decrease" && "text-red-600"
                    )}>
                        {data.type === "increase" && "+"}
                        {formattedValue}
                    </span>
                </p>
                {data.type !== "total" && data.type !== "start" && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Lũy kế: {valueFormatter
                            ? valueFormatter(data.runningTotal)
                            : data.runningTotal.toLocaleString("vi-VN")}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

export function WaterfallChartComponent({
    data,
    colors = DEFAULT_COLORS,
    showGrid = true,
    showTooltip = true,
    showLabels = true,
    showConnectors = true,
    animated = true,
    className,
    height = 400,
    valueFormatter,
    horizontal = false,
}: WaterfallChartProps) {
    const mergedColors = { ...DEFAULT_COLORS, ...colors };
    const processedData = processWaterfallData(data);

    // Calculate domain for Y axis
    const allValues = processedData.flatMap(d => [d.start, d.end]);
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;

    const getColor = (type: string) => {
        switch (type) {
            case "start": return mergedColors.start;
            case "increase": return mergedColors.increase;
            case "decrease": return mergedColors.decrease;
            case "total": return mergedColors.total;
            default: return mergedColors.start;
        }
    };

    const formatLabel = (value: number) => {
        if (valueFormatter) return valueFormatter(value);
        if (Math.abs(value) >= 1000000000) {
            return `${(value / 1000000000).toFixed(1)}B`;
        }
        if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }
        if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toLocaleString("vi-VN");
    };

    return (
        <div className={cn("w-full", className)}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={processedData}
                    layout={horizontal ? "vertical" : "horizontal"}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                            opacity={0.5}
                        />
                    )}

                    {horizontal ? (
                        <>
                            <XAxis
                                type="number"
                                domain={[minValue - padding, maxValue + padding]}
                                tickFormatter={formatLabel}
                                fontSize={12}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                fontSize={12}
                            />
                        </>
                    ) : (
                        <>
                            <XAxis
                                dataKey="name"
                                fontSize={11}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                domain={[minValue - padding, maxValue + padding]}
                                tickFormatter={formatLabel}
                                fontSize={12}
                            />
                        </>
                    )}

                    {showTooltip && (
                        <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
                    )}

                    <ReferenceLine y={0} stroke="var(--border)" />

                    {/* Invisible bar for positioning */}
                    <Bar
                        dataKey="start"
                        stackId="stack"
                        fill="transparent"
                        isAnimationActive={false}
                    />

                    {/* Visible waterfall bars */}
                    <Bar
                        dataKey="barHeight"
                        stackId="stack"
                        isAnimationActive={animated}
                        animationDuration={500}
                        radius={[4, 4, 0, 0]}
                    >
                        {processedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getColor(entry.type)}
                            />
                        ))}
                        {showLabels && (
                            <LabelList
                                dataKey="displayValue"
                                position="top"
                                formatter={(value: number) => {
                                    const prefix = value > 0 && processedData.find(d => d.displayValue === value)?.type === "increase" ? "+" : "";
                                    return `${prefix}${formatLabel(value)}`;
                                }}
                                fontSize={10}
                                fill="var(--foreground)"
                            />
                        )}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center text-sm">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: mergedColors.start }}
                    />
                    <span className="text-muted-foreground">Giá trị ban đầu</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: mergedColors.increase }}
                    />
                    <span className="text-muted-foreground">Tăng</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: mergedColors.decrease }}
                    />
                    <span className="text-muted-foreground">Giảm</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: mergedColors.total }}
                    />
                    <span className="text-muted-foreground">Tổng cộng</span>
                </div>
            </div>
        </div>
    );
}

export default WaterfallChartComponent;
