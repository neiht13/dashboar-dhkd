"use client";

import React from 'react';
import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
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
    defaultAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

export function RadarChartComponent({
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

    const chartConfig = React.useMemo(
        () => buildShadcnChartConfig(yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors),
        [yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors]
    );

    const handleChartClick = React.useCallback((event: unknown) => {
        if (!onChartClick) return;
        const payload = (event as { activePayload?: Array<{ payload?: Record<string, unknown> }> })?.activePayload?.[0]?.payload;
        if (payload) {
            onChartClick(payload);
        }
    }, [onChartClick]);

    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <RadarChart
                data={data}
                onClick={handleChartClick}
                style={onChartClick ? { cursor: "pointer" } : undefined}
            >
                <defs>
                    <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {styleProps.showGrid && <PolarGrid stroke="hsl(var(--border))" />}
                <PolarAngleAxis
                    dataKey={xAxisKey}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <PolarRadiusAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                />

                {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                {styleProps.showLegend && (
                    <ChartLegend content={<ChartLegendContent />} />
                )}

                {yAxisKeys.map((field, index) => {
                    const fieldColor = getFieldColor(field, index, yAxisFieldColors, colors);
                    return (
                        <Radar
                            key={field}
                            dataKey={field}
                            name={field}
                            stroke={fieldColor}
                            fill={fieldColor}
                            fillOpacity={0.2}
                            strokeWidth={2}
                            filter="url(#radar-glow)"
                            dot={{
                                fill: "#fff",
                                stroke: fieldColor,
                                strokeWidth: 2,
                                r: 3,
                            }}
                            {...defaultAnimationConfig}
                        />
                    );
                })}
            </RadarChart>
        </ChartContainer>
    );
}
