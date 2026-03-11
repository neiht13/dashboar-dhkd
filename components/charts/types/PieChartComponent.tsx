"use client";

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Sector,
} from 'recharts';
import type { PieChartProps } from '@/types/chart';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from '@/components/ui/chart';
import {
    getFieldColor,
    formatDataLabel,
    defaultAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

export function PieChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    onChartClick,
    nameKey,
    valueKey,
    styleProps,
    innerRadius = 0,
    pieVariant = 'default',
}: PieChartProps) {
    const colors = styleProps.colors;
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    // Build config from data entries (each data point is its own series in a pie)
    const chartConfig = React.useMemo(() => {
        const cfg: Record<string, { label: string; color: string }> = {};
        data.forEach((item, index) => {
            const key = String(item[nameKey] || index);
            cfg[key] = {
                label: key,
                color: getFieldColor(nameKey, index, undefined, colors),
            };
        });
        return cfg;
    }, [data, nameKey, colors]);

    const onPieEnter = (_: unknown, index: number) => setActiveIndex(index);
    const handlePieClick = React.useCallback((entry: unknown) => {
        if (!onChartClick) return;
        const payload = (entry as { payload?: Record<string, unknown> })?.payload || (entry as Record<string, unknown>);
        if (payload) onChartClick(payload);
    }, [onChartClick]);

    const totalValue = React.useMemo(() => {
        return data.reduce((acc, curr) => acc + (Number(curr[valueKey]) || 0), 0);
    }, [data, valueKey]);

    const renderActiveShape = (props: Record<string, unknown>) => {
        const {
            cx, cy, innerRadius: ir, outerRadius: or,
            startAngle, endAngle, fill,
        } = props as {
            cx: number; cy: number; innerRadius: number; outerRadius: number;
            startAngle: number; endAngle: number; fill: string;
        };

        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={ir}
                    outerRadius={(or || 0) + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    style={{ filter: `drop-shadow(0 4px 8px ${fill}50)` }}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={(or || 0) + 8}
                    outerRadius={(or || 0) + 11}
                    fill={fill}
                    opacity={0.4}
                />
            </g>
        );
    };

    const renderOuterLabel = (props: Record<string, unknown>) => {
        const RADIAN = Math.PI / 180;
        const {
            cx, cy, midAngle, outerRadius, fill, value, percent,
        } = props as {
            cx: number; cy: number; midAngle: number; outerRadius: number;
            fill: string; value: number; percent: number;
        };

        if (!percent || percent < 0.03) return null;

        const sin = Math.sin(-(midAngle || 0) * RADIAN);
        const cos = Math.cos(-(midAngle || 0) * RADIAN);
        const sx = cx + ((outerRadius || 0) + 4) * cos;
        const sy = cy + ((outerRadius || 0) + 4) * sin;
        const mx = cx + ((outerRadius || 0) + 20) * cos;
        const my = cy + ((outerRadius || 0) + 20) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 16;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <path
                    d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                    stroke={fill}
                    strokeWidth={1.5}
                    fill="none"
                    strokeOpacity={0.5}
                />
                <circle cx={sx} cy={sy} r={2} fill={fill} />
                <text
                    x={ex + (cos >= 0 ? 4 : -4)}
                    y={ey}
                    textAnchor={textAnchor}
                    fill="#334155"
                    fontSize={11}
                    fontWeight={700}
                    dominantBaseline="central"
                >
                    {formatDataLabel(value || 0, styleProps.dataLabelFormat)}
                </text>
                <text
                    x={ex + (cos >= 0 ? 4 : -4)}
                    y={ey + 14}
                    textAnchor={textAnchor}
                    fill="#94A3B8"
                    fontSize={9}
                    dominantBaseline="central"
                >
                    {((percent || 0) * 100).toFixed(1)}%
                </text>
            </g>
        );
    };

    // Sized Pie (special variant with varying outer radii)
    if (pieVariant === 'sized') {
        const sortedData = [...data]
            .map((item, idx) => ({ ...item, __originalIndex: idx }))
            .sort((a, b) => (Number(a[valueKey]) || 0) - (Number(b[valueKey]) || 0));

        const numericWidth = typeof width === 'number' ? width : 500;
        const numericHeight = typeof height === 'number' ? height : 300;
        const BASE_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.3;
        const MAX_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.95;
        const maxValue = Math.max(...sortedData.map(d => Number(d[valueKey]) || 0));

        let currentAngle = 0;

        return (
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                    {styleProps.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                    )}
                    {sortedData.map((entry, index) => {
                        const value = Number(entry[valueKey]) || 0;
                        const percentage = totalValue ? value / totalValue : 0;
                        const startAngle = 90 - (currentAngle * 360);
                        const endAngle = 90 - ((currentAngle + percentage) * 360);
                        currentAngle += percentage;

                        const radiusRange = MAX_RADIUS - BASE_RADIUS;
                        const valueRatio = maxValue ? value / maxValue : 0;
                        const outerRadius = BASE_RADIUS + (valueRatio * radiusRange);
                        const originalIndex = (entry as Record<string, unknown>).__originalIndex as number;

                        return (
                            <Pie
                                key={`sized-pie-${index}`}
                                dataKey={valueKey}
                                nameKey={nameKey}
                                cx="50%"
                                cy="50%"
                                startAngle={startAngle}
                                endAngle={endAngle}
                                innerRadius={30}
                                outerRadius={outerRadius}
                                cornerRadius={4}
                                paddingAngle={0}
                                stroke="none"
                                data={[entry]}
                                {...defaultAnimationConfig}
                                onClick={handlePieClick}
                            >
                                <Cell
                                    fill={getFieldColor(String(originalIndex), originalIndex, undefined, colors)}
                                    stroke="none"
                                />
                            </Pie>
                        );
                    })}
                </PieChart>
            </ResponsiveContainer>
        );
    }

    // Standard Pie or Donut
    const isDonut = pieVariant === 'donut' || innerRadius > 0;
    const finalInnerRadius = isDonut ? (innerRadius || '55%') : 0;
    const finalOuterRadius = '78%';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart>
                    <defs>
                        {data.map((_, index) => {
                            const color = getFieldColor(nameKey, index, undefined, colors);
                            return (
                                <linearGradient key={`pie-grad-${index}`} id={`pie-gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                                </linearGradient>
                            );
                        })}
                    </defs>

                    {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} />} />}
                    {styleProps.showLegend && (
                        <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
                    )}

                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={finalInnerRadius}
                        outerRadius={finalOuterRadius}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        paddingAngle={isDonut ? 3 : 1}
                        cornerRadius={isDonut ? 4 : 2}
                        {...defaultAnimationConfig}
                        animationDuration={1500}
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={() => setActiveIndex(undefined)}
                        onClick={handlePieClick}
                        label={styleProps.showDataLabels ? renderOuterLabel : undefined}
                        labelLine={false}
                    >
                        {data.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#pie-gradient-${index})`}
                                strokeWidth={0}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>

            {isDonut && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-foreground tracking-tight">
                        {totalValue.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                        Tổng
                    </span>
                </div>
            )}
        </div>
    );
}
