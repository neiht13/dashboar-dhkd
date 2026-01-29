"use client";

import React from "react";
import * as icons from "lucide-react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StatCardMetric } from "@/types";
import { cn } from "@/lib/utils";
import { AngularGauge, getGaugeColor } from "@/components/charts/AngularGauge";

interface StatCardProps {
    title?: string;
    icon?: string; // Lucide icon name (global for card)
    metrics?: StatCardMetric[]; // Nếu không có, sẽ tự động tạo từ data
    data?: any[]; // Dữ liệu gốc để tự động tạo metrics
    dataSource?: any; // Cấu hình data source
    backgroundColor?: string;
    accentColor?: string;
    layout?: "list" | "grid" | "kpi"; // New: kpi layout với gauge
    gridCols?: 1 | 2 | 3 | 4; // New prop: responsive grid cols
    className?: string; // New prop: custom class
    // KPI Mode props
    showGauge?: boolean; // Hiển thị AngularGauge
    gaugeValue?: number; // Giá trị % cho gauge (0-100)
    planValue?: number | string; // Giá trị kế hoạch (KH)
    threshold?: number; // Ngưỡng để xác định "đạt" (mặc định 100)
    showCornerAccent?: boolean; // Hiển thị corner accent decoration
    showStatusBadge?: boolean; // Hiển thị status badge (Đạt KH / Cần nỗ lực)
}

export function StatCard({
    title,
    icon,
    metrics: providedMetrics,
    data = [],
    dataSource,
    backgroundColor = "#ffffff",
    accentColor = "#0066FF",
    layout = "list",
    gridCols = 1,
    className,
    showGauge = false,
    gaugeValue,
    planValue,
    threshold = 100,
    showCornerAccent = false,
    showStatusBadge = false,
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
        // Nếu layout là grid và có nhiều yAxis, tạo nhiều metric
        if (yAxis.length >= 1) {
            yAxis.forEach((field: string) => {
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

    // Helper to get Icon component
    const getIcon = (iconName?: string) => {
        if (!iconName) return null;
        // @ts-ignore
        const Icon = icons[iconName];
        return Icon ? Icon as React.ElementType : null;
    };

    const MainIcon = getIcon(icon);

    // Mini sparkline component
    const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
        const sparklineData = data.map((value, index) => ({ value, index }));

        return (
            <ResponsiveContainer width={80} height={32}>
                <LineChart data={sparklineData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
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
            <div className="relative w-8 h-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={10}
                            outerRadius={14}
                            paddingAngle={0}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                        >
                            <Cell fill={color} />
                            <Cell fill={color + "30"} />
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
        const x = 15 + 12 * Math.cos(Math.PI - radian);
        const y = 15 + 12 * Math.sin(Math.PI - radian);

        return (
            <div className="relative w-8 h-5 flex items-center justify-center">
                <svg width="30" height="18" viewBox="0 0 30 18">
                    <path
                        d="M 3 15 A 12 12 0 0 1 27 15"
                        fill="none"
                        stroke={color + "30"}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M 3 15 A 12 12 0 0 ${progress > 50 ? 1 : 0} ${x} ${y}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        );
    };

    // Format value
    const formatValue = (value: string | number): string => {
        if (typeof value === 'number') {
            if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}b`;
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return value.toLocaleString();
        }
        return value;
    };

    const renderMetricItem = (metric: StatCardMetric, index: number) => {
        const MetricIcon = getIcon(metric.icon);
        const isPositive = metric.isPositive;
        const trendColor = isPositive === true ? "text-emerald-600" : isPositive === false ? "text-red-600" : "text-muted-foreground";

        return (
            <div
                key={index}
                className={cn(
                    "flex flex-col gap-2 p-3 sm:p-4 rounded-xl border bg-card/50",
                    layout === 'list' && metrics.length > 1 ? "bg-card/50" : "border-0 shadow-none bg-transparent p-0"
                )}
            >
                {/* Header: Icon + Title */}
                <div className="flex items-center gap-2 text-muted-foreground">
                    {MetricIcon ? (
                        <MetricIcon className="size-4 shrink-0" />
                    ) : MainIcon && index === 0 && layout !== 'grid' ? (
                        <MainIcon className="size-4 shrink-0" style={{ color: accentColor }} />
                    ) : null}
                    <span className="text-xs sm:text-sm font-medium truncate">{metric.label}</span>
                </div>

                {/* Value */}
                <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-2xl font-semibold leading-none tracking-tight">
                        {formatValue(metric.value)}
                    </p>
                </div>

                {/* Footer: Trend or Mini Chart */}
                <div className="flex items-center gap-2 text-xs sm:text-sm h-6">
                    {metric.change ? (
                        <>
                            <span className={cn("font-medium", trendColor)}>
                                {metric.change}
                                {metric.changeValue && <span className="hidden sm:inline ml-1 text-muted-foreground/80 font-normal">{metric.changeValue}</span>}
                            </span>
                            {metric.description && <span className="text-muted-foreground hidden sm:inline truncate max-w-[100px]">{metric.description}</span>}
                        </>
                    ) : (
                        metric.description && <span className="text-muted-foreground truncate">{metric.description}</span>
                    )}

                    {/* Mini Charts pushed to right */}
                    <div className="ml-auto">
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
            </div>
        );
    };

    // KPI Layout với AngularGauge và status badge (từ example.tsx)
    if (layout === "kpi") {
        const displayValue = metrics[0]?.value || 0;
        const effectiveGaugeValue = gaugeValue ?? (typeof displayValue === 'number' ? displayValue : 0);
        const isAchieved = effectiveGaugeValue >= threshold;
        const gaugeColor = isAchieved ? '#10b981' : getGaugeColor(effectiveGaugeValue, threshold);

        return (
            <div
                className={cn(
                    "bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-none relative overflow-hidden",
                    className
                )}
            >
                {/* Corner accent decoration */}
                {showCornerAccent && (
                    <div
                        className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px]"
                        style={{ borderTopColor: accentColor, opacity: 0.1 }}
                    />
                )}

                <div className="p-5 flex justify-between items-center h-full">
                    {/* Left: Content */}
                    <div className="flex-1 flex flex-col justify-between h-full">
                        <div>
                            {/* Header: Icon + Title */}
                            <div className="flex items-center gap-2 mb-2">
                                {MainIcon && (
                                    <div className="p-1.5 rounded-none bg-slate-100 text-slate-600">
                                        <MainIcon size={16} />
                                    </div>
                                )}
                                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                                    {title || metrics[0]?.label}
                                </h3>
                            </div>

                            {/* Value */}
                            <div className="mt-1">
                                <span className="text-3xl font-black text-slate-800 tracking-tight block">
                                    {formatValue(displayValue)}
                                </span>
                                {planValue && (
                                    <span className="text-xs font-bold text-slate-400 block mt-1">
                                        KH: {typeof planValue === 'number' ? planValue.toLocaleString() : planValue}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        {showStatusBadge && (
                            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold">
                                {isAchieved ? (
                                    <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5">
                                        <CheckCircle size={10} /> Đạt KH
                                    </span>
                                ) : (
                                    <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5">
                                        <AlertCircle size={10} /> Cần nỗ lực
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: AngularGauge */}
                    {showGauge && (
                        <div className="ml-2 pt-2">
                            <AngularGauge
                                value={effectiveGaugeValue}
                                color={gaugeColor}
                                size={130}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (layout === "grid" || (metrics.length > 1 && !title)) {
        return (
            <div className={cn(
                "grid gap-4",
                gridCols === 1 && "grid-cols-1",
                gridCols === 2 && "grid-cols-1 sm:grid-cols-2",
                gridCols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                gridCols === 4 && "grid-cols-2 lg:grid-cols-4",
                className
            )}>
                {metrics.map((metric, index) => renderMetricItem(metric, index))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "p-4 rounded-xl border bg-card shadow-sm flex flex-col gap-4",
                className
            )}
            style={{
                borderColor: backgroundColor !== '#ffffff' ? accentColor + '20' : undefined,
                backgroundColor: backgroundColor !== '#ffffff' ? backgroundColor : undefined
            }}
        >
            {title && (
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: accentColor + '20' }}>
                    <div className="flex items-center gap-2">
                        {MainIcon && (
                            <MainIcon
                                className="w-5 h-5"
                                style={{ color: accentColor }}
                            />
                        )}
                        <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accentColor }}>
                            {title}
                        </h3>
                    </div>
                </div>
            )}

            <div className={cn("flex flex-col gap-4")}>
                {metrics.map((metric, index) => (
                    <React.Fragment key={index}>
                        {renderMetricItem(metric, index)}
                        {index < metrics.length - 1 && <div className="h-px bg-border/50" />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}