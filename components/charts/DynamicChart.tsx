"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Sector,
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
import * as icons from "lucide-react";
import type { ChartConfig, Filter } from "@/types";
import { getChartColor } from "@/lib/utils";
import { MapChart } from "./MapChart";
import { HexagonStat } from "./HexagonStat";
import { StatCard } from "./StatCard";
import { FilterBuilder } from "@/components/ui/FilterBuilder";
import type { StatCardMetric, Filter } from "@/types";

interface DynamicChartProps {
    config: ChartConfig;
    data: Record<string, unknown>[];
    width?: number | string;
    height?: number | string;
    // Drill-down & Cross-filter support
    onDataPointClick?: (data: Record<string, unknown>, field?: string) => void;
    enableDrillDown?: boolean;
    onDrillDown?: (filters: Array<{ field: string; operator: string; value: string | number }>) => Promise<any>;
    enableCrossFilter?: boolean;
    chartId?: string;
    // Filter support
    enableFilter?: boolean;
    onFilterChange?: (filters: any[]) => void;
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

export function DynamicChart({
    config,
    data,
    width = "100%",
    height = "100%",
    onDataPointClick,
    enableDrillDown = false,
    enableCrossFilter = false,
    chartId,
    enableFilter = false,
    onFilterChange,
}: DynamicChartProps) {
    const { type, dataSource, style } = config;

    // Filter state
    const [chartFilters, setChartFilters] = useState<Filter[]>([]);

    // Handle chart element click for drill-down/cross-filter
    const handleChartClick = (chartData: Record<string, unknown> | null, field?: string) => {
        if (!chartData) return;
        if (onDataPointClick) {
            onDataPointClick(chartData, field || dataSource?.xAxis);
        }
    };

    // Handle filter changes
    const handleFilterChange = useCallback((filters: Filter[]) => {
        setChartFilters(filters);
        if (onFilterChange) {
            onFilterChange(filters);
        }
    }, [onFilterChange]);

    // Get available fields for filtering
    const availableFields = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]).filter(field =>
            data.some(item => item[field] !== null && item[field] !== undefined)
        );
    }, [data]);


    // Cursor style when drill-down or cross-filter is enabled
    const clickableCursor = (enableDrillDown || enableCrossFilter || onDataPointClick)
        ? { cursor: 'pointer' }
        : {};
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

    // First filter by chart filters
    const chartFilteredData = React.useMemo(() => {
        if (chartFilters.length === 0) return data;

        return data.filter(item => {
            return chartFilters.every(filter => {
                const fieldValue = item[filter.field];
                const filterValue = filter.value;

                // Simple equality filter for now
                return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
            });
        });
    }, [data, chartFilters]);

    // Then filter by xAxisExclude
    const filteredData = xAxisExclude.length > 0 && dataSource?.xAxis
        ? chartFilteredData.filter(item => !xAxisExclude.includes(String(item[dataSource.xAxis])))
        : chartFilteredData;

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
            case "statCard":
                // Unified card component - supports both simple and metric cards
                const cardTitle = style?.title || (type === 'statCard' ? "Thống kê" : undefined);
                const cardIcon = style?.cardIcon;
                const cardMetrics = (config.dataSource as any)?.metrics || [];
                const cardBackgroundColor = style?.cardBackgroundColor || "#ffffff";
                const cardAccentColor = colors[0] || "#0066FF";

                return (
                    <StatCard
                        title={cardTitle || (type === 'statCard' ? "Thống kê" : undefined)}
                        icon={cardIcon}
                        metrics={cardMetrics.length > 0 ? cardMetrics : undefined}
                        data={filteredData}
                        dataSource={dataSource}
                        backgroundColor={cardBackgroundColor}
                        accentColor={cardAccentColor}
                    />
                );

            case "line":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <LineChart
                            data={filteredData}
                            margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                            {/* Pass 1: Draw lines */}
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
                                />
                            ))}
                            {/* Pass 2: Draw labels */}
                            {showDataLabels && (dataSource?.yAxis || []).map((field, index) => (
                                <Line
                                    key={`label-${field}`}
                                    type="monotone"
                                    dataKey={field}
                                    stroke="transparent"
                                    strokeWidth={0}
                                    dot={false}
                                    activeDot={false}
                                    isAnimationActive={false}
                                    legendType="none"
                                    tooltipType="none"
                                >
                                    <LabelList
                                        dataKey={field}
                                        position={dataLabelPosition}
                                        content={renderCustomLabel}
                                    />
                                </Line>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart
                            data={filteredData}
                            margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                            {/* Pass 1: Draw bars */}
                            {(dataSource?.yAxis || []).map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    fill={`url(#bar-gradient-${index})`}
                                    radius={[4, 4, 0, 0]}
                                    {...animationProps}
                                />
                            ))}
                            {/* Pass 2: Draw labels */}
                            {showDataLabels && (dataSource?.yAxis || []).map((field, index) => (
                                <Bar
                                    key={`label-${field}`}
                                    dataKey={field}
                                    fill="transparent"
                                    isAnimationActive={false}
                                    legendType="none"
                                    tooltipType="none"
                                >
                                    <LabelList
                                        dataKey={field}
                                        position={dataLabelPosition}
                                        content={renderCustomLabel}
                                    />
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "stackedBar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart
                            data={filteredData}
                            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                            {/* Pass 1: Draw stacked bars with labels (must stay in same pass for stack alignment) */}
                            {dataSource?.yAxis.map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    stackId="stack"
                                    fill={`url(#stacked-gradient-${index})`}
                                    {...animationProps}
                                >
                                    {showDataLabels && (
                                        <LabelList
                                            dataKey={field}
                                            position="center"
                                            fill="#fff"
                                            fontSize={10}
                                            fontWeight={600}
                                            formatter={formatDataLabel}
                                        />
                                    )}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "horizontalBar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart
                            data={filteredData}
                            layout="vertical"
                            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                            {/* Pass 1: Draw horizontal bars */}
                            {dataSource?.yAxis.map((field, index) => (
                                <Bar
                                    key={field}
                                    dataKey={field}
                                    name={field}
                                    fill={`url(#hbar-gradient-${index})`}
                                    radius={[0, 2, 2, 0]}
                                    {...animationProps}
                                />
                            ))}
                            {/* Pass 2: Draw labels */}
                            {showDataLabels && dataSource?.yAxis.map((field, index) => (
                                <Bar
                                    key={`label-${field}`}
                                    dataKey={field}
                                    fill="transparent"
                                    isAnimationActive={false}
                                    legendType="none"
                                    tooltipType="none"
                                >
                                    <LabelList dataKey={field} position="right" fontSize={10} fill="#64748B" formatter={formatDataLabel} />
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "area":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <AreaChart
                            data={filteredData}
                            margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
                            <defs>
                                {(dataSource?.yAxis || []).map((field, index) => {
                                    const color = getFieldColor(field, index);
                                    return (
                                        <React.Fragment key={field}>
                                            {/* Gradient for default state */}
                                            <linearGradient
                                                id={`area-gradient-${index}`}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                            </linearGradient>
                                            {/* Animated hatch pattern for hover state */}
                                            <pattern
                                                id={`area-hatch-${index}`}
                                                x="0"
                                                y="0"
                                                width="8"
                                                height="8"
                                                patternUnits="userSpaceOnUse"
                                                patternTransform="rotate(-45)"
                                            >
                                                <g className="area-hatch-animation">
                                                    <animateTransform
                                                        attributeName="transform"
                                                        type="translate"
                                                        from="0 0"
                                                        to="8 0"
                                                        dur="0.5s"
                                                        repeatCount="indefinite"
                                                    />
                                                    <rect width="12" height="12" fill={color} opacity="0.15" />
                                                    <rect width="2" height="12" fill={color} opacity="0.5" />
                                                </g>
                                            </pattern>
                                        </React.Fragment>
                                    );
                                })}
                            </defs>
                            <style>
                                {`
                                    .recharts-area-area:hover {
                                        fill: url(#area-hatch-0) !important;
                                    }
                                `}
                            </style>
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
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {/* Pass 1: Draw areas */}
                            {(dataSource?.yAxis || []).map((field, index) => (
                                <Area
                                    key={field}
                                    type="monotone"
                                    dataKey={field}
                                    name={field}
                                    stroke={getFieldColor(field, index)}
                                    strokeWidth={3}
                                    fill={`url(#area-gradient-${index})`}
                                    fillOpacity={1}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                    className="transition-all duration-300 hover:fill-[url(#area-hatch-0)]"
                                    {...animationProps}
                                />
                            ))}
                            {/* Pass 2: Draw labels */}
                            {showDataLabels && (dataSource?.yAxis || []).map((field, index) => (
                                <Area
                                    key={`label-${field}`}
                                    type="monotone"
                                    dataKey={field}
                                    stroke="transparent"
                                    fill="transparent"
                                    isAnimationActive={false}
                                    legendType="none"
                                    tooltipType="none"
                                >
                                    <LabelList
                                        dataKey={field}
                                        position="top"
                                        offset={10}
                                        fontSize={10}
                                        fill={dataLabelColor}
                                        fontWeight={600}
                                        formatter={formatDataLabel}
                                    />
                                </Area>
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case "sizedPie": // Legacy: now accessed via pieVariant: 'sized'
            case "donut":
            case "pie":
                // Consolidated Pie/Donut/Sized logic (sizedPie accessed via pieVariant: 'sized')
                const isSized = type === 'sizedPie' || style?.pieVariant === 'sized';
                const isDonut = type === 'donut' || style?.pieVariant === 'donut';
                const yAxisKey = dataSource?.yAxis?.[0] || 'value';
                const xAxisKey = dataSource?.xAxis || 'name';

                // Sort for sized pie to make it look organized
                const processedPieData = isSized
                    ? [...filteredData].sort((a: any, b: any) => (Number(a[yAxisKey]) || 0) - (Number(b[yAxisKey]) || 0))
                    : filteredData;

                // Value calculation for sized radius
                const maxValue = isSized ? Math.max(...processedPieData.map((d: any) => Number(d[yAxisKey]) || 0)) : 0;
                const totalValue = processedPieData.reduce((acc: number, curr: any) => acc + (Number(curr[yAxisKey]) || 0), 0);

                // Sized Pie radius calculations
                const numericWidth = typeof width === 'number' ? width : 500;
                const numericHeight = typeof height === 'number' ? height : 300;
                const BASE_RADIUS = Math.min(numericWidth, numericHeight) * 0.30;
                const MAX_RADIUS = Math.min(numericWidth, numericHeight) * 0.60;
                const radiusRange = MAX_RADIUS - BASE_RADIUS;

                // Custom label with connector line (always visible)
                const renderPieLabelWithLine = (props: any) => {
                    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
                    const RADIAN = Math.PI / 180;

                    // Calculate positions
                    const sin = Math.sin(-midAngle * RADIAN);
                    const cos = Math.cos(-midAngle * RADIAN);

                    // Start point (on the pie edge)
                    const sx = cx + outerRadius * cos;
                    const sy = cy + outerRadius * sin;

                    // Middle point (elbow)
                    const mx = cx + (outerRadius + 20) * cos;
                    const my = cy + (outerRadius + 20) * sin;

                    // End point (horizontal extension)
                    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
                    const ey = my;

                    const textAnchor = cos >= 0 ? 'start' : 'end';
                    const formattedValue = formatDataLabel(value);

                    if (!value) return null;

                    return (
                        <g>
                            {/* Connector line */}
                            <path
                                d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                                stroke={fill || "#94A3B8"}
                                fill="none"
                                strokeWidth={1}
                            />
                            {/* Dot at the end */}
                            <circle cx={ex} cy={ey} r={2} fill={fill || "#94A3B8"} />
                            {/* Label text */}
                            <text
                                x={ex + (cos >= 0 ? 1 : -1) * 6}
                                y={ey}
                                textAnchor={textAnchor}
                                fill={dataLabelColor || "#1E293B"}
                                fontSize={10}
                                fontWeight={500}
                                dominantBaseline="central"
                            >
                                {`${name}: ${formattedValue}`}
                            </text>
                        </g>
                    );
                };

                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart style={clickableCursor}>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {isSized ? (
                                // Sized Pie: Render each slice as a separate Pie component for unique radii
                                (processedPieData.reduce((acc: any[], entry: any, index: number) => {
                                    const value = Number(entry[yAxisKey]) || 0;
                                    const percentage = totalValue ? value / totalValue : 0;
                                    const startAngle = 90 - (acc.length > 0 ? acc[acc.length - 1].nextAngle : 0) * 360;
                                    const endAngle = 90 - ((acc.length > 0 ? acc[acc.length - 1].nextAngle : 0) + percentage) * 360;
                                    const nextAngle = (acc.length > 0 ? acc[acc.length - 1].nextAngle : 0) + percentage;

                                    const valueRatio = maxValue ? value / maxValue : 0;
                                    const outerRadius = BASE_RADIUS + (valueRatio * radiusRange);

                                    // Pass 1: Visual Segment (provides Legend)
                                    acc.push({
                                        nextAngle,
                                        component: (
                                            <Pie
                                                key={`sized-seg-${index}`}
                                                data={[entry]}
                                                dataKey={yAxisKey}
                                                nameKey={xAxisKey}
                                                cx="50%"
                                                cy="50%"
                                                startAngle={startAngle}
                                                endAngle={endAngle}
                                                innerRadius={isDonut ? 30 : 0}
                                                outerRadius={outerRadius}
                                                fill={getFieldColor(entry[xAxisKey] || String(index), index)}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                onClick={() => handleChartClick(entry)}
                                                label={renderPieLabelWithLine}
                                                labelLine={false}
                                                {...animationProps}
                                            />
                                        )
                                    });

                                    return acc;
                                }, []).map(item => item.component))
                            ) : (
                                <Pie
                                    data={processedPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isDonut ? "55%" : 0}
                                    outerRadius="75%"
                                    dataKey={yAxisKey}
                                    nameKey={xAxisKey}
                                    paddingAngle={2}
                                    onClick={(data) => data && handleChartClick(data.payload || data)}
                                    label={renderPieLabelWithLine}
                                    labelLine={false}
                                    {...animationProps}
                                >
                                    {processedPieData.map((entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getFieldColor(entry[xAxisKey] || String(index), index)}
                                            stroke="#fff"
                                            strokeWidth={2}
                                            style={{ outline: 'none' }}
                                        />
                                    ))}
                                </Pie>
                            )}
                        </PieChart>
                    </ResponsiveContainer>
                );

            case "map":
                return <MapChart data={filteredData} config={config} width={width} height={height} />;

            case "radar":
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <RadarChart
                            data={filteredData}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
                            <PolarGrid stroke="#E2E8F0" />
                            <PolarAngleAxis
                                dataKey={dataSource.xAxis}
                                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            />
                            <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} verticalAlign={legendPosition as 'top' | 'bottom'} />}
                            {dataSource?.yAxis.map((field, index) => (
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
                        <ScatterChart
                            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                        <ComposedChart
                            data={filteredData}
                            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            onClick={(e) => e?.activePayload?.[0]?.payload && handleChartClick(e.activePayload[0].payload)}
                            style={clickableCursor}
                        >
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
                            {/* Pass 1: Bars first to stay behind lines */}
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
                                        />
                                    );
                                })}

                            {/* Pass 2: Lines second to stay on top of bars */}
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
                                        />
                                    );
                                })}

                            {/* Pass 3: All Labels last to stay on top of everything */}
                            {showDataLabels && dataSource.yAxis.map((field, index) => {
                                const type = composedFieldTypes[field] || (dataSource.yAxis.indexOf(field) % 2 === 0 ? 'bar' : 'line');
                                const originalIndex = dataSource.yAxis.indexOf(field);

                                if (type === 'bar') {
                                    return (
                                        <Bar
                                            key={`label-${field}`}
                                            dataKey={field}
                                            fill="transparent"
                                            isAnimationActive={false}
                                            legendType="none"
                                            tooltipType="none"
                                        >
                                            <LabelList
                                                dataKey={field}
                                                position={dataLabelPosition}
                                                content={renderCustomLabel}
                                            />
                                        </Bar>
                                    );
                                } else {
                                    return (
                                        <Line
                                            key={`label-${field}`}
                                            type="monotone"
                                            dataKey={field}
                                            stroke="transparent"
                                            strokeWidth={0}
                                            dot={false}
                                            isAnimationActive={false}
                                            legendType="none"
                                            tooltipType="none"
                                        >
                                            <LabelList
                                                dataKey={field}
                                                position={dataLabelPosition}
                                                content={renderCustomLabel}
                                            />
                                        </Line>
                                    );
                                }
                            })}
                        </ComposedChart>
                    </ResponsiveContainer>
                );

            case "funnel":
                const funnelData = data.map((item, index) => ({
                    ...item,
                    name: item[dataSource?.xAxis || 'name'] as string,
                    value: item[dataSource?.yAxis?.[0] || 'value'] as number,
                    fill: colors[index % colors.length] || getChartColor(index),
                }));

                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <FunnelChart style={clickableCursor}>
                            {style?.showTooltip && <Tooltip content={<TooltipComponent />} />}
                            {style?.showLegend && <Legend content={renderLegend()} />}
                            <Funnel
                                dataKey="value"
                                data={funnelData}
                                onClick={(data) => data && handleChartClick(data.payload || data)}
                                {...animationProps}
                            >
                                {showDataLabels && <LabelList position="center" fill="#fff" stroke="none" dataKey="name" fontSize={11} fontWeight={600} />}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                );




            case "hexagon":
                // Get the first available numeric value from filteredData
                const hexYField = dataSource?.yAxis?.[0] || 'value';
                const hexValue = filteredData[0]?.[hexYField] ?? 0;
                const hexTrend = filteredData[0]?.['trend'] || filteredData[0]?.['growth'];

                // Get icon from Lucide icons if specified
                const HexIcon = style?.cardIcon && icons[style.cardIcon as keyof typeof icons]
                    ? icons[style.cardIcon as keyof typeof icons]
                    : undefined;

                return (
                    <div className="flex items-center justify-center w-full h-full p-4">
                        <HexagonStat
                            label={style?.title || getLabel(hexYField)}
                            value={typeof hexValue === 'number' ? hexValue.toLocaleString() : String(hexValue)}
                            trend={typeof hexTrend === 'number' ? Number(hexTrend) : undefined}
                            color={colors[0] || "#3b82f6"}
                            icon={HexIcon ? React.createElement(HexIcon as any, { className: "w-6 h-6" }) : undefined}
                        />
                    </div>
                );

            case "statCard":
                // StatCard uses custom metrics from config data
                const statCardConfig = config.dataSource || {};
                const statCardMetrics = (statCardConfig as any).metrics || [];

                // If no metrics configured, show placeholder
                if (statCardMetrics.length === 0) {
                    return (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <div className="text-2xl mb-2">📊</div>
                                <p className="text-sm">Chưa cấu hình metrics</p>
                                <p className="text-xs">Vào tab "Kiểu dáng" để thêm metrics</p>
                            </div>
                        </div>
                    );
                }

                return (
                    <StatCard
                        title={style?.title || "Stat Card"}
                        icon={style?.cardIcon}
                        metrics={statCardMetrics}
                        backgroundColor={style?.cardBackgroundColor || "#ffffff"}
                        accentColor={colors[0] || "#0066FF"}
                    />
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
        <div className="w-full h-full animate-fade-in relative">
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

            {/* Chart Filter */}
            {enableFilter && (
                <div className="absolute top-2 right-2 z-10">
                <FilterBuilder
                    data={data}
                    availableFields={availableFields}
                    filters={chartFilters}
                    onChange={handleFilterChange}
                    onApplyFilters={() => {}}
                    className="shadow-lg"
                />
                </div>
            )}

            {renderChart()}
        </div>
    );
}
