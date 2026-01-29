"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface GaugeThreshold {
    value: number;
    color: string;
    label?: string;
}

interface SemiCircleGaugeProps {
    value: number;
    min?: number;
    max?: number;
    label?: string;
    unit?: string;
    thresholds?: GaugeThreshold[];
    size?: "sm" | "md" | "lg";
    showValue?: boolean;
    showMinMax?: boolean;
    showNeedle?: boolean;
    animated?: boolean;
    className?: string;
    colors?: {
        background?: string;
        needle?: string;
        text?: string;
    };
}

const DEFAULT_THRESHOLDS: GaugeThreshold[] = [
    { value: 33, color: "#ef4444", label: "Thấp" },    // Red
    { value: 66, color: "#f59e0b", label: "Trung bình" }, // Amber  
    { value: 100, color: "#22c55e", label: "Cao" },   // Green
];

const SIZE_CONFIG = {
    sm: { width: 150, height: 90, fontSize: 20, labelSize: 11 },
    md: { width: 200, height: 120, fontSize: 28, labelSize: 13 },
    lg: { width: 280, height: 160, fontSize: 36, labelSize: 15 },
};

export function SemiCircleGauge({
    value,
    min = 0,
    max = 100,
    label,
    unit = "%",
    thresholds = DEFAULT_THRESHOLDS,
    size = "md",
    showValue = true,
    showMinMax = true,
    showNeedle = true,
    animated = true,
    className,
    colors = {},
}: SemiCircleGaugeProps) {
    const config = SIZE_CONFIG[size];
    const clampedValue = Math.max(min, Math.min(max, value));
    const percentage = ((clampedValue - min) / (max - min)) * 100;

    // Calculate which threshold zone the value falls into
    const currentThreshold = useMemo(() => {
        for (const threshold of thresholds) {
            if (percentage <= threshold.value) {
                return threshold;
            }
        }
        return thresholds[thresholds.length - 1];
    }, [percentage, thresholds]);

    // Generate pie data for the gauge background segments
    const gaugeData = useMemo(() => {
        const segments = [];
        let prevValue = 0;

        for (const threshold of thresholds) {
            segments.push({
                name: threshold.label || `segment-${threshold.value}`,
                value: threshold.value - prevValue,
                color: threshold.color,
            });
            prevValue = threshold.value;
        }

        return segments;
    }, [thresholds]);

    // Data for the filled portion
    const fillData = [
        { name: "filled", value: percentage },
        { name: "empty", value: 100 - percentage },
    ];

    // Calculate needle angle (0 = left, 180 = right for semicircle)
    const needleAngle = (percentage / 100) * 180;
    const needleLength = config.width * 0.35;
    const centerX = config.width / 2;
    const centerY = config.height - 10;

    // Calculate needle end point
    const angleRad = ((180 - needleAngle) * Math.PI) / 180;
    const needleX = centerX + needleLength * Math.cos(angleRad);
    const needleY = centerY - needleLength * Math.sin(angleRad);

    return (
        <div className={cn("relative inline-flex flex-col items-center", className)}>
            <div
                className="relative"
                style={{ width: config.width, height: config.height }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {/* Background segments */}
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="60%"
                            outerRadius="100%"
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={false}
                        >
                            {gaugeData.map((entry, index) => (
                                <Cell
                                    key={`bg-cell-${index}`}
                                    fill={entry.color}
                                    opacity={0.2}
                                />
                            ))}
                        </Pie>

                        {/* Filled portion */}
                        <Pie
                            data={fillData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="60%"
                            outerRadius="100%"
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={animated}
                            animationDuration={1000}
                        >
                            <Cell fill={currentThreshold.color} />
                            <Cell fill="transparent" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Needle */}
                {showNeedle && (
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={config.width}
                        height={config.height}
                        style={{ overflow: "visible" }}
                    >
                        {/* Needle line */}
                        <line
                            x1={centerX}
                            y1={centerY}
                            x2={needleX}
                            y2={needleY}
                            stroke={colors.needle || "#1f2937"}
                            strokeWidth={3}
                            strokeLinecap="round"
                            style={{
                                transition: animated ? "all 0.5s ease-out" : "none",
                            }}
                        />
                        {/* Center circle */}
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={8}
                            fill={colors.needle || "#1f2937"}
                        />
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={4}
                            fill={currentThreshold.color}
                        />
                    </svg>
                )}

                {/* Value display */}
                {showValue && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ bottom: 0 }}
                    >
                        <div
                            className="font-bold"
                            style={{
                                fontSize: config.fontSize,
                                color: colors.text || currentThreshold.color,
                            }}
                        >
                            {clampedValue.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
                            <span className="text-muted-foreground" style={{ fontSize: config.fontSize * 0.5 }}>
                                {unit}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Label */}
            {label && (
                <div
                    className="text-muted-foreground text-center mt-1"
                    style={{ fontSize: config.labelSize }}
                >
                    {label}
                </div>
            )}

            {/* Min/Max labels */}
            {showMinMax && (
                <div
                    className="flex justify-between w-full text-muted-foreground mt-1"
                    style={{ fontSize: config.labelSize - 2 }}
                >
                    <span>{min}{unit}</span>
                    <span>{max}{unit}</span>
                </div>
            )}

            {/* Threshold legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {thresholds.map((threshold, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-1 text-xs"
                    >
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: threshold.color }}
                        />
                        <span className="text-muted-foreground">
                            {threshold.label || `≤${threshold.value}${unit}`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Preset configurations for common telecom KPIs
export const GAUGE_PRESETS = {
    uptime: {
        thresholds: [
            { value: 95, color: "#ef4444", label: "Critical" },
            { value: 99, color: "#f59e0b", label: "Warning" },
            { value: 100, color: "#22c55e", label: "Good" },
        ],
        unit: "%",
    },
    callDropRate: {
        thresholds: [
            { value: 1, color: "#22c55e", label: "Excellent" },
            { value: 3, color: "#f59e0b", label: "Acceptable" },
            { value: 100, color: "#ef4444", label: "Poor" },
        ],
        unit: "%",
        min: 0,
        max: 5,
    },
    networkLoad: {
        thresholds: [
            { value: 60, color: "#22c55e", label: "Normal" },
            { value: 80, color: "#f59e0b", label: "High" },
            { value: 100, color: "#ef4444", label: "Critical" },
        ],
        unit: "%",
    },
    signalStrength: {
        thresholds: [
            { value: -100, color: "#ef4444", label: "Weak" },
            { value: -85, color: "#f59e0b", label: "Fair" },
            { value: -70, color: "#22c55e", label: "Good" },
            { value: -50, color: "#3b82f6", label: "Excellent" },
        ],
        unit: "dBm",
        min: -110,
        max: -50,
    },
};

export default SemiCircleGauge;
