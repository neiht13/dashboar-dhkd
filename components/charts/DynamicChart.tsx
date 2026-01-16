"use client";

import React from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ScatterChart,
    Scatter,
    ComposedChart,
    FunnelChart,
    Funnel,
    LabelList,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Label,
} from "recharts";
import { icons } from "lucide-react";
import type { ChartConfig } from "@/types";
import { getChartColor } from "@/lib/utils";
import { MapChart } from "./MapChart";

interface DynamicChartProps {
    config: ChartConfig;
    data: Record<string, unknown>[];
    width?: number | string;
    height?: number | string;
}

// Vietnamese labels for legend and tooltip
const VI_LABELS: Record<string, string> = {
    ptm: "Phát triển mới",
    khoiphuc: "Khôi phục",
    thanhly: "Thanh lý",
    tamngung_yc: "Tạm ngưng YC",
    tamngung_nc: "Tạm ngưng NC",
    dichchuyen: "Dịch chuyển",
    quahan: "Quá hạn",
    dungthu: "Dùng thử",
    dungthat: "Dùng thật",
    value: "Giá trị",
    name: "Tên",
};

const getLabel = (key: string): string => VI_LABELS[key] || key;

// Modern color palette with gradients
const MODERN_COLORS = [
    "#0066FF", // Primary Blue
    "#8B5CF6", // Purple
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#14B8A6", // Teal
];

// Custom Dark Tooltip Component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-[#0F172A] text-white px-3 py-2 shadow-xl border-0" style={{ borderRadius: '4px' }}>
            <p className="text-xs font-medium text-[#94A3B8] mb-1">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <span
                        className="w-2 h-2"
                        style={{ backgroundColor: entry.color, borderRadius: '2px' }}
                    />
                    <span className="text-[#E2E8F0]">{getLabel(entry.name)}:</span>
                    <span className="font-semibold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// Custom Light Tooltip Component
const CustomTooltipLight = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-white text-[#0F172A] px-3 py-2 shadow-lg border border-[#E2E8F0]" style={{ borderRadius: '6px' }}>
            <p className="text-xs font-medium text-[#64748B] mb-1">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <span
                        className="w-2 h-2"
                        style={{ backgroundColor: entry.color, borderRadius: '2px' }}
                    />
                    <span className="text-[#64748B]">{getLabel(entry.name)}:</span>
                    <span className="font-semibold text-[#0F172A]">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// Custom Legend Component - receives custom colors via wrapperStyle
const CustomLegend = ({
    payload,
    fieldColors,
    fieldLabels
}: {
    payload?: Array<{ value: string; color: string }>;
    fieldColors?: Record<string, string>;
    fieldLabels?: Record<string, string>;
}) => {
    if (!payload?.length) return null;

    const getLabel = (key: string): string => fieldLabels?.[key] || VI_LABELS[key] || key;

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                    <span
                        className="w-3 h-3"
                        style={{
                            backgroundColor: fieldColors?.[entry.value] || entry.color,
                            borderRadius: '2px'
                        }}
                    />
                    <span className="text-[#64748B] font-medium">{getLabel(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

export function DynamicChart({ config, data, width = "100%", height = "100%" }: DynamicChartProps) {
    const { type, dataSource, style } = config;
    const colors = style?.colors?.length ? style.colors : MODERN_COLORS;
    const showDataLabels = style?.showDataLabels ?? false;
    const dataLabelPosition = style?.dataLabelPosition || 'top';
    const dataLabelFormat = style?.dataLabelFormat || 'full';
    const dataLabelColor = style?.dataLabelColor || '#1E293B';
    const dataLabelFontSize = style?.dataLabelFontSize || 10;
    const tooltipTheme = style?.tooltipTheme || 'light';
    const xAxisExclude = style?.xAxisExclude || [];
    const legendPosition = style?.legendPosition || 'bottom';
    const composedFieldTypes = style?.composedFieldTypes || {};
    const yAxisFieldLabels = style?.yAxisFieldLabels || {};
    const yAxisFieldColors = style?.yAxisFieldColors || {};

    // Get display label for a field (custom or original)
    const getFieldLabel = (field: string): string => yAxisFieldLabels[field] || getLabel(field);

    // Get color for a field (custom or from palette)
    const getFieldColor = (field: string, index: number): string =>
        yAxisFieldColors[field] || colors[index] || getChartColor(index);

    // Filter data by xAxisExclude
    const filteredData = xAxisExclude.length > 0 && dataSource?.xAxis
        ? data.filter(item => !xAxisExclude.includes(String(item[dataSource.xAxis])))
        : data;

    // Select tooltip component based on theme
    const TooltipComponent = tooltipTheme === 'light' ? CustomTooltipLight : CustomTooltip;

    // Format data label with unit abbreviation
    const formatDataLabel = (value: number | string): string => {
        if (typeof value !== 'number') return String(value);

        switch (dataLabelFormat) {
            case 'k':
                return value >= 1000
                    ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
                    : value.toLocaleString();
            case 'tr':
                return value >= 1000000
                    ? `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}tr`
                    : value >= 1000
                        ? `${(value / 1000).toFixed(0)}k`
                        : value.toLocaleString();
            case 'ty':
                return value >= 1000000000
                    ? `${(value / 1000000000).toFixed(1)}tỷ`
                    : value >= 1000000
                        ? `${(value / 1000000).toFixed(0)}tr`
                        : value >= 1000
                            ? `${(value / 1000).toFixed(0)}k`
                            : value.toLocaleString();
            case 'full':
            default:
                return value.toLocaleString();
        }
    };

    // Animation config - enhanced for growing line effect
    const animationProps = {
        isAnimationActive: style?.animation !== false,
        animationDuration: 1200,
        animationEasing: "ease-out" as const,
        animationBegin: 0,
    };

    // Subtle growing animation for lines
    const lineAnimationProps = {
        isAnimationActive: true,
        animationDuration: 2000,
        animationEasing: "ease-in-out" as const,
        onAnimationStart: () => console.log('Animation start'),
        onAnimationEnd: () => console.log('Animation end'),
    };

    // Custom data label with halo effect for better readability
    const renderCustomLabel = (props: any) => {
        const { x, y, value, stroke, index, name } = props;
        // Handle value formatting
        const formattedValue = formatDataLabel(value);

        // Adjust dy based on dataLabelPosition for better placement
        let dyOffset = -10; // Default for 'top'
        if (dataLabelPosition === 'center') {
            dyOffset = 5; // Center for stacked bars
        } else if (dataLabelPosition === 'bottom') {
            dyOffset = 15; // Below the element
        }

        return (
            <text
                x={x}
                y={y}
                dy={dyOffset}
                fill={dataLabelColor || stroke || "#1E293B"}
                fontSize={dataLabelFontSize}
                fontWeight={500}
                textAnchor="middle"
                style={{
                    paintOrder: "stroke",
                    stroke: "#fff",
                    strokeWidth: "2px",
                    strokeLinecap: "butt",
                    strokeLinejoin: "miter",
                }}
            >
                {formattedValue}
            </text>
        );
    };

    // Y-axis tick formatter - uses same format as data labels
    const formatYAxisTick = (value: number | string): string => {
        if (typeof value !== 'number') return String(value);
        return formatDataLabel(value);
    };

    // Build color map for legend using custom field colors
    const buildLegendColorMap = (): Record<string, string> => {
        const colorMap: Record<string, string> = {};
        (dataSource?.yAxis || []).forEach((field, index) => {
            colorMap[field] = getFieldColor(field, index);
        });
        return colorMap;
    };

    // Render legend with custom colors
    const renderLegend = () => (
        <CustomLegend
            fieldColors={buildLegendColorMap()}
            fieldLabels={yAxisFieldLabels}
        />
    );

    const renderChart = () => {
        switch (type) {
            case "card":
                const firstYAxis = dataSource?.yAxis?.[0];
                const cardValue = filteredData.reduce((acc, curr) => {
                    if (!firstYAxis) return acc;
                    const val = Number(curr[firstYAxis]);
                    return isNaN(val) ? acc : acc + val;
                }, 0);

                // Card Styles
                const fontSizeMap = {
                    sm: "text-2xl",
                    md: "text-4xl",
                    lg: "text-6xl",
                    xl: "text-8xl"
                };
                const fontSizeClass = fontSizeMap[style?.cardFontSize || 'lg'] || "text-6xl";
                const textColor = style?.cardColor || undefined;

                // Icon
                const IconComponent = style?.showCardIcon && style?.cardIcon && (icons as any)[style.cardIcon]
                    ? (icons as any)[style.cardIcon]
                    : null;

                return (
                    <div
                        className="flex flex-col items-center justify-center h-full w-full rounded-lg transition-colors"
                        style={{ backgroundColor: style?.cardBackgroundColor || 'transparent' }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {IconComponent && (
                                <IconComponent
                                    className={fontSizeClass}
                                    style={{ width: '1em', height: '1em', color: textColor }} // match text size and color
                                />
                            )}
                            <div
                                className={`font-bold ${!textColor ? "bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600" : ""}`}
                                style={{ color: textColor }}
                            >
                                <span className={fontSizeClass}>{formatDataLabel(cardValue)}</span>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                            {firstYAxis ? getFieldLabel(firstYAxis) : "Giá trị"}
                        </div>
                    </div>
                );

            case "line":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={filteredData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                            <defs>
                                {/* Glow filter for line effect */}
                                <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                {(dataSource?.yAxis || []).map((field, index) => (
                                    <linearGradient key={field} id={`line-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getFieldColor(field, index)} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={getFieldColor(field, index)} stopOpacity={0.3} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />}
                            <XAxis
                                dataKey={dataSource?.xAxis || 'name'}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                                height={style?.xAxisLabel ? 40 : 30}
                            >
                                {style?.xAxisLabel && <Label value={style.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />}
                            </XAxis>
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            >
                                {style?.yAxisLabel && <Label value={style.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} />}
                            </YAxis>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {(dataSource?.yAxis || []).map((field, index) => (
                                <Line
                                    key={field}
                                    type="monotone"
                                    dataKey={field}
                                    name={field}
                                    stroke={getFieldColor(field, index)}
                                    strokeWidth={2.5}
                                    dot={{ fill: "#fff", stroke: getFieldColor(field, index), strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: getFieldColor(field, index), stroke: "#fff", strokeWidth: 2 }}
                                    filter="url(#line-glow)"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    {...lineAnimationProps}
                                >
                                    {showDataLabels && (
                                        <LabelList
                                            dataKey={field}
                                            position={dataLabelPosition}
                                            content={renderCustomLabel}
                                        />
                                    )}
                                </Line>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={filteredData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => (
                                    <linearGradient key={field} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getFieldColor(field, index)} stopOpacity={1} />
                                        <stop offset="100%" stopColor={getFieldColor(field, index)} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />}
                            <XAxis
                                dataKey={dataSource?.xAxis || 'name'}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                                height={style?.xAxisLabel ? 40 : 30}
                            >
                                {style?.xAxisLabel && <Label value={style.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />}
                            </XAxis>
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            >
                                {style?.yAxisLabel && <Label value={style.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} />}
                            </YAxis>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {(dataSource?.yAxis || []).map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    fill={`url(#bar-gradient-${index})`}
                                    radius={[4, 4, 0, 0]}
                                    {...animationProps}
                                >
                                    {showDataLabels && (
                                        <LabelList
                                            dataKey={field}
                                            position={dataLabelPosition}
                                            content={renderCustomLabel}
                                        />
                                    )}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "stackedBar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={filteredData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => (
                                    <linearGradient key={field} id={`stacked-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getFieldColor(field, index)} stopOpacity={1} />
                                        <stop offset="100%" stopColor={getFieldColor(field, index)} stopOpacity={0.8} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" vertical={false} />}
                            <XAxis
                                dataKey={dataSource?.xAxis}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                                height={style?.xAxisLabel ? 40 : 30}
                            >
                                {style?.xAxisLabel && <Label value={style.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />}
                            </XAxis>
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            >
                                {style?.yAxisLabel && <Label value={style.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} />}
                            </YAxis>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {dataSource.yAxis.map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    stackId="stack"
                                    fill={`url(#stacked-gradient-${index})`}
                                    {...animationProps}
                                >
                                    {showDataLabels && <LabelList dataKey={field} position="center" fill="#fff" fontSize={10} fontWeight={600} formatter={formatDataLabel} />}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "horizontalBar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={filteredData} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => (
                                    <linearGradient key={field} id={`hbar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={getFieldColor(field, index)} stopOpacity={0.7} />
                                        <stop offset="100%" stopColor={getFieldColor(field, index)} stopOpacity={1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" horizontal={false} />}
                            <XAxis
                                type="number"
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey={dataSource?.xAxis}
                                type="category"
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {dataSource.yAxis.map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    fill={`url(#hbar-gradient-${index})`}
                                    radius={[0, 2, 2, 0]}
                                    {...animationProps}
                                >
                                    {showDataLabels && <LabelList dataKey={field} position="right" fontSize={10} fill="#64748B" formatter={formatDataLabel} />}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "area":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <AreaChart data={filteredData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => {
                                    const color = getFieldColor(field, index);
                                    return (
                                        <React.Fragment key={field}>
                                            <linearGradient
                                                id={`area-gradient-${index}`}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor={color}
                                                    stopOpacity={0.4}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor={color}
                                                    stopOpacity={0}
                                                />
                                            </linearGradient>
                                            <pattern
                                                id={`area-hatch-${index}`}
                                                x="0"
                                                y="0"
                                                width="6.81"
                                                height="6.81"
                                                patternUnits="userSpaceOnUse"
                                                patternTransform="rotate(-45)"
                                                overflow="visible"
                                            >
                                                <g overflow="visible" style={{ willChange: 'transform' }}>
                                                    <animateTransform
                                                        attributeName="transform"
                                                        type="translate"
                                                        from="0 0"
                                                        to="6 0"
                                                        dur="1s"
                                                        repeatCount="indefinite"
                                                    />
                                                    <rect width="10" height="10" opacity={0.05} fill={color} />
                                                    <rect width="1" height="10" fill={color} />
                                                </g>
                                            </pattern>
                                        </React.Fragment>
                                    );
                                })}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />}
                            <XAxis
                                dataKey={dataSource?.xAxis || 'name'}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                                height={style?.xAxisLabel ? 40 : 30}
                            >
                                {style?.xAxisLabel && <Label value={style.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />}
                            </XAxis>
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            >
                                {style?.yAxisLabel && <Label value={style.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} />}
                            </YAxis>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {(dataSource?.yAxis || []).map((field, index) => (
                                <Area
                                    key={field}
                                    type="natural"
                                    dataKey={field}
                                    name={field}
                                    stroke={getFieldColor(field, index)}
                                    strokeWidth={2}
                                    fill={`url(#area-hatch-${index})`}
                                    fillOpacity={0.8}
                                    {...animationProps}
                                >
                                    {showDataLabels && (
                                        <LabelList
                                            dataKey={field}
                                            position={dataLabelPosition}
                                            fontSize={dataLabelFontSize}
                                            fill={dataLabelColor}
                                            fontWeight={500}
                                            formatter={formatDataLabel}
                                        />
                                    )}
                                </Area>
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case "sizedPie":
            case "pie":
                if (type === 'sizedPie' || style?.pieVariant === 'sized') {
                    // Sized Pie Chart: sort by value and use concentric rings with increasing radius
                    const yAxisKey = dataSource?.yAxis?.[0] || '';
                    const sortedSizedData = [...filteredData]
                        .map((item: any, idx) => ({ ...item, __originalIndex: idx }))
                        .sort((a: any, b: any) => (Number(a[yAxisKey]) || 0) - (Number(b[yAxisKey]) || 0));

                    const numericWidth = typeof width === 'number' ? width : 500;
                    const numericHeight = typeof height === 'number' ? height : 300;
                    const BASE_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.3;
                    const MAX_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.95;
                    const totalValue = sortedSizedData.reduce((acc, curr) => acc + (Number(curr[yAxisKey]) || 0), 0);
                    const maxValue = Math.max(...sortedSizedData.map(d => Number(d[yAxisKey]) || 0));

                    let currentAngle = 0;

                    return (
                        <ResponsiveContainer width="100%" height={height}>
                            <PieChart>
                                {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                                {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                                {sortedSizedData.map((entry, index) => {
                                    const value = Number(entry[yAxisKey]) || 0;
                                    const percentage = totalValue ? value / totalValue : 0;
                                    const startAngle = 90 - (currentAngle * 360);
                                    const endAngle = 90 - ((currentAngle + percentage) * 360);
                                    currentAngle += percentage;

                                    // Clean up radius calculation to be value-based
                                    const radiusRange = MAX_RADIUS - BASE_RADIUS;
                                    const valueRatio = maxValue ? value / maxValue : 0;
                                    const outerRadius = BASE_RADIUS + (valueRatio * radiusRange);

                                    return (
                                        <Pie
                                            key={`sized-pie-${index}`}
                                            dataKey={yAxisKey}
                                            nameKey={dataSource?.xAxis || ''}
                                            cx="50%"
                                            cy="50%"
                                            startAngle={startAngle}
                                            endAngle={endAngle}
                                            innerRadius={30}
                                            outerRadius={outerRadius}
                                            cornerRadius={4}
                                            paddingAngle={0}
                                            stroke="none"
                                            data={[{ ...entry, fill: getFieldColor(String(entry.__originalIndex), entry.__originalIndex) }]}
                                            {...animationProps}
                                        >
                                            <Cell
                                                fill={getFieldColor(String(entry.__originalIndex), entry.__originalIndex)}
                                                stroke="none"
                                            />
                                            {showDataLabels && (
                                                <LabelList
                                                    dataKey={yAxisKey}
                                                    position="outside"
                                                    content={renderCustomLabel}
                                                    stroke="none"
                                                />
                                            )}
                                        </Pie>
                                    );
                                })}
                            </PieChart>
                        </ResponsiveContainer>
                    );
                }

                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            <Pie
                                data={filteredData}
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={80}
                                dataKey={dataSource.yAxis[0]}
                                nameKey={dataSource.xAxis}
                                paddingAngle={2}
                                {...animationProps}
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getFieldColor(dataSource.xAxis, index)} strokeWidth={1} />
                                ))}
                                {showDataLabels && (
                                    <LabelList
                                        dataKey={dataSource.yAxis[0]}
                                        position="outside"
                                        content={renderCustomLabel}
                                        stroke="none"
                                    />
                                )}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                );

            case "donut":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            <Pie
                                data={filteredData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                dataKey={dataSource.yAxis[0]}
                                nameKey={dataSource.xAxis}
                                paddingAngle={2}
                                {...animationProps}
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getFieldColor(dataSource.xAxis, index)} strokeWidth={1} />
                                ))}
                                {showDataLabels && (
                                    <LabelList
                                        dataKey={dataSource.yAxis[0]}
                                        position="outside"
                                        content={renderCustomLabel}
                                        stroke="none"
                                    />
                                )}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                );

            case "map":
                return <MapChart data={filteredData} config={config} width={width} height={height} />;

            case "radar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <RadarChart data={filteredData}>
                            <PolarGrid stroke="#E2E8F0" />
                            <PolarAngleAxis
                                dataKey={dataSource.xAxis}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            />
                            <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {dataSource.yAxis.map((field, index) => (
                                <Radar
                                    key={field}
                                    name={field}
                                    dataKey={field}
                                    stroke={getFieldColor(field, index)}
                                    fill={getFieldColor(field, index)}
                                    fillOpacity={0.25}
                                    strokeWidth={2}
                                    {...animationProps}
                                />
                            ))}
                        </RadarChart>
                    </ResponsiveContainer>
                );

            case "scatter":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            {style?.showGrid && <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" />}
                            <XAxis
                                dataKey={dataSource.xAxis}
                                name={dataSource.xAxis}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey={dataSource?.yAxis[0]}
                                name={dataSource?.yAxis[0]}
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={50}
                            />
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            <Scatter
                                data={filteredData}
                                fill={getFieldColor(dataSource?.yAxis[0] || '', 0)}
                                {...animationProps}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case "composed":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <ComposedChart data={filteredData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => (
                                    <linearGradient key={field} id={`composed-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getFieldColor(field, index)} stopOpacity={1} />
                                        <stop offset="100%" stopColor={getFieldColor(field, index)} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {style?.showGrid && <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" vertical={false} />}
                            <XAxis
                                dataKey={dataSource.xAxis}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={{ stroke: "#E2E8F0" }}
                                tickLine={false}
                                height={style?.xAxisLabel ? 40 : 30}
                            >
                                {style?.xAxisLabel && <Label value={style.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />}
                            </XAxis>
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            >
                                {style?.yAxisLabel && <Label value={style.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} />}
                            </YAxis>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {/* Bars first to stay behind lines */}
                            {dataSource.yAxis
                                .filter(field => (composedFieldTypes[field] || (dataSource.yAxis.indexOf(field) % 2 === 0 ? 'bar' : 'line')) === 'bar')
                                .map((field, index) => {
                                    const originalIndex = dataSource.yAxis.indexOf(field);
                                    return (
                                        <Bar
                                            key={field}
                                            dataKey={field}
                                            name={field}
                                            fill={`url(#composed-gradient-${originalIndex})`}
                                            radius={[4, 4, 0, 0]}
                                            {...animationProps}
                                        >
                                            {showDataLabels && (
                                                <LabelList
                                                    dataKey={field}
                                                    position={dataLabelPosition}
                                                    content={renderCustomLabel}
                                                />
                                            )}
                                        </Bar>
                                    );
                                })}

                            {/* Lines second to stay on top */}
                            {dataSource.yAxis
                                .filter(field => (composedFieldTypes[field] || (dataSource.yAxis.indexOf(field) % 2 === 0 ? 'bar' : 'line')) !== 'bar')
                                .map((field, index) => {
                                    const originalIndex = dataSource.yAxis.indexOf(field);
                                    return (
                                        <Line
                                            key={field}
                                            type="monotone"
                                            dataKey={field}
                                            name={field}
                                            stroke={getFieldColor(field, originalIndex)}
                                            strokeWidth={3}
                                            dot={{ fill: "#fff", stroke: getFieldColor(field, originalIndex), strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, fill: getFieldColor(field, originalIndex), stroke: "#fff", strokeWidth: 2 }}
                                            filter="url(#line-glow)"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            {...lineAnimationProps}
                                        >
                                            {showDataLabels && (
                                                <LabelList
                                                    dataKey={field}
                                                    position={dataLabelPosition}
                                                    content={renderCustomLabel}
                                                />
                                            )}
                                        </Line>
                                    );
                                })}
                        </ComposedChart>
                    </ResponsiveContainer>
                );

            case "funnel":
                const funnelData = data.map((item, index) => ({
                    name: item[dataSource?.xAxis || 'name'] as string,
                    value: item[dataSource?.yAxis?.[0] || 'value'] as number,
                    fill: colors[index % colors.length] || getChartColor(index),
                }));

                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <FunnelChart>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} />}
                            <Funnel
                                dataKey="value"
                                data={funnelData}
                                {...animationProps}
                            >
                                {showDataLabels && <LabelList position="center" fill="#fff" stroke="none" dataKey="name" fontSize={11} fontWeight={600} />}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                );

            default:
                return (
                    <div className="flex items-center justify-center h-full text-[#64748B]">
                        Loại biểu đồ không được hỗ trợ: {type}
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-full animate-fade-in">
            {style?.title && (
                <h3
                    className="font-semibold text-[#0F172A] mb-3"
                    style={{
                        fontSize: style.titleFontSize || 14,
                        color: style.titleColor || '#0F172A'
                    }}
                >
                    {style.title}
                </h3>
            )}
            {renderChart()}
        </div>
    );
}
