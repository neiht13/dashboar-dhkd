"use client";

import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';
import type { CartesianChartProps } from '@/types/chart';
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

export function ScatterChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    onChartClick,
    xAxisKey,
    yAxisKeys,
    styleProps,
    yAxisFieldLabels,
    yAxisFieldColors,
}: CartesianChartProps) {
    const colors = styleProps.colors;
    const chartStyle = config.style;
    const zAxisKey = chartStyle?.zAxisKey as string | undefined;

    const chartConfig = React.useMemo(
        () => buildShadcnChartConfig(yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors),
        [yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors]
    );

    const handleClick = React.useCallback((entry: unknown) => {
        if (!onChartClick) return;
        const payload = (entry as { payload?: Record<string, unknown> })?.payload || (entry as Record<string, unknown>);
        if (payload) onChartClick(payload);
    }, [onChartClick]);

    // Calculate average for reference lines
    const avgX = React.useMemo(() => {
        const values = data.map(d => Number(d[xAxisKey]) || 0);
        return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }, [data, xAxisKey]);

    const avgY = React.useMemo(() => {
        if (!yAxisKeys[0]) return 0;
        const values = data.map(d => Number(d[yAxisKeys[0]]) || 0);
        return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }, [data, yAxisKeys]);

    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <ScatterChart
                accessibilityLayer
                margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
            >
                {styleProps.showGrid && (
                    <CartesianGrid vertical={false} />
                )}

                <XAxis
                    dataKey={xAxisKey}
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                />
                <YAxis
                    dataKey={yAxisKeys[0]}
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={80}
                    tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                />
                {zAxisKey && (
                    <ZAxis dataKey={zAxisKey} range={[40, 400]} />
                )}

                {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                {styleProps.showLegend && (
                    <ChartLegend content={<ChartLegendContent />} />
                )}

                {/* Average reference lines */}
                <ReferenceLine x={avgX} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={avgY} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />

                {yAxisKeys.map((field, index) => {
                    const fieldColor = getFieldColor(field, index, yAxisFieldColors, colors);
                    return (
                        <Scatter
                            key={field}
                            name={field}
                            data={data}
                            fill={fieldColor}
                            onClick={handleClick}
                            style={onChartClick ? { cursor: "pointer" } : undefined}
                            {...defaultAnimationConfig}
                            shape={(props: Record<string, unknown>) => {
                                const { cx, cy, r } = props as { cx: number; cy: number; r: number };
                                return (
                                    <g>
                                        <circle cx={cx} cy={cy} r={r || 5} fill={fieldColor} fillOpacity={0.6} stroke={fieldColor} strokeWidth={1.5} />
                                    </g>
                                );
                            }}
                        />
                    );
                })}
            </ScatterChart>
        </ChartContainer>
    );
}
