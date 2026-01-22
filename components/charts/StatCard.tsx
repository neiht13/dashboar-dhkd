"use client";

import React from "react";
import * as icons from "lucide-react";
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StatCardMetric } from "@/types";

interface StatCardProps {
    title?: string;
    icon?: string; // Lucide icon name
    metrics?: StatCardMetric[]; // Nếu không có, sẽ tự động tạo từ data
    data?: any[]; // Dữ liệu gốc để tự động tạo metrics
    dataSource?: any; // Cấu hình data source
    backgroundColor?: string;
    accentColor?: string;
}

export function StatCard({
    title,
    icon,
    metrics: providedMetrics,
    data = [],
    dataSource,
    backgroundColor = "#ffffff",
    accentColor = "#0066FF"
}: StatCardProps) {
    // Tự động tạo metrics từ dữ liệu nếu không được cung cấp
    const metrics = React.useMemo(() => {
        if (providedMetrics && providedMetrics.length > 0) {
            return providedMetrics;
        }

        // Tự động tạo metrics từ data
        if (data.length === 0 || !dataSource?.yAxis) {
            return [];
        }

        const autoMetrics: StatCardMetric[] = [];
        const xAxis = dataSource.xAxis;
        const yAxis = dataSource.yAxis;

        // Nếu chỉ có một yAxis field, tạo một metric đơn giản
        if (yAxis.length === 1) {
            const field = yAxis[0];
            const totalValue = data.reduce((acc, curr) => {
                const val = Number(curr[field]);
                return isNaN(val) ? acc : acc + val;
            }, 0);

            autoMetrics.push({
                label: field,
                value: totalValue,
                type: 'number',
                color: accentColor
            });
        } else {
            // Nếu có nhiều yAxis fields, tạo metrics cho từng field
            yAxis.forEach((field, index) => {
                const totalValue = data.reduce((acc, curr) => {
                    const val = Number(curr[field]);
                    return isNaN(val) ? acc : acc + val;
                }, 0);

                autoMetrics.push({
                    label: field,
                    value: totalValue,
                    type: 'number',
                    color: accentColor
                });
            });
        }

        return autoMetrics;
    }, [providedMetrics, data, dataSource, accentColor]);

    // Icon component từ Lucide
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons] as React.ComponentType<{ className?: string }>
        : null;

    // Mini sparkline component
    const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
        const sparklineData = data.map((value, index) => ({ value, index }));

        return (
            <ResponsiveContainer width={60} height={20}>
                <LineChart data={sparklineData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // Mini donut chart
    const MiniDonut = ({ progress, color }: { progress: number; color: string }) => {
        const data = [
            { value: progress },
            { value: 100 - progress }
        ];

        return (
            <div className="relative w-4 h-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={6}
                            outerRadius={8}
                            paddingAngle={0}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                        >
                            <Cell fill={color} />
                            <Cell fill="#E2E8F0" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Mini gauge component
    const MiniGauge = ({ progress, color }: { progress: number; color: string }) => {
        const angle = (progress / 100) * 180; // 180 degrees arc
        const radian = (angle * Math.PI) / 180;
        const x = 10 + 8 * Math.cos(Math.PI - radian);
        const y = 10 + 8 * Math.sin(Math.PI - radian);

        return (
            <div className="relative w-5 h-3 flex items-center justify-center">
                <svg width="20" height="12" viewBox="0 0 20 12">
                    {/* Background arc */}
                    <path
                        d="M 2 10 A 8 8 0 0 1 18 10"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {/* Progress arc */}
                    <path
                        d={`M 2 10 A 8 8 0 0 ${progress > 50 ? 1 : 0} ${x} ${y}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {/* Pointer dot */}
                    <circle
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill={color}
                    />
                </svg>
            </div>
        );
    };

    // Format value
    const formatValue = (value: string | number): string => {
        if (typeof value === 'number') {
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}tr`;
            } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`;
            }
            return value.toLocaleString();
        }
        return value;
    };

    return (
        <div
            className="p-4 rounded-lg border shadow-sm"
            style={{ backgroundColor, borderColor: accentColor + '20' }}
        >
            {/* Header - only show if title is provided or icon exists */}
            {(title || IconComponent) && (
                <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: accentColor + '20' }}>
                    {IconComponent && (
                        <IconComponent
                            className="w-5 h-5"
                            style={{ color: accentColor }}
                        />
                    )}
                    {title && (
                        <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accentColor }}>
                            {title}
                        </h3>
                    )}
                </div>
            )}

            {/* Metrics */}
            <div className="space-y-3">
                {metrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                        {/* Metric Label */}
                        <span className="text-xs text-gray-600 font-medium">
                            {metric.label}
                        </span>

                        {/* Metric Value & Chart */}
                        <div className="flex items-center gap-2">
                            {/* Value */}
                            <span className="text-sm font-bold text-gray-800">
                                {formatValue(metric.value)}
                            </span>

                            {/* Mini Chart */}
                            {metric.type === 'sparkline' && metric.chartData && (
                                <MiniSparkline
                                    data={metric.chartData}
                                    color={metric.color || accentColor}
                                />
                            )}

                            {metric.type === 'donut' && metric.progress !== undefined && (
                                <MiniDonut
                                    progress={metric.progress}
                                    color={metric.color || accentColor}
                                />
                            )}

                            {metric.type === 'gauge' && metric.progress !== undefined && (
                                <MiniGauge
                                    progress={metric.progress}
                                    color={metric.color || accentColor}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}