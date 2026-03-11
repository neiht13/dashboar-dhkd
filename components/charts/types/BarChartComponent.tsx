"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Label,
    LabelList,
    Brush,
} from 'recharts';
import type { CartesianChartProps } from '@/types/chart';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from '@/components/ui/chart';
import { createDataLabelRenderer } from '../shared/ChartDataLabel';
import {
    getFieldColor,
    formatDataLabel,
    formatXAxisTick,
    defaultAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

interface BarChartComponentProps extends CartesianChartProps {
    stacked?: boolean;
    horizontal?: boolean;
}

export function BarChartComponent({
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
    stacked = false,
    horizontal = false,
}: BarChartComponentProps) {
    const colors = styleProps.colors;
    const chartStyle = config.style;
    const zoomSlider = chartStyle?.zoomSlider ?? false;

    const chartConfig = React.useMemo(
        () => buildShadcnChartConfig(yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors),
        [yAxisKeys, yAxisFieldLabels, yAxisFieldColors, colors]
    );

    const renderDataLabel = createDataLabelRenderer({
        format: styleProps.dataLabelFormat,
        color: styleProps.dataLabelColor,
        fontSize: styleProps.dataLabelFontSize,
        position: styleProps.dataLabelPosition,
    });

    const handleChartClick = React.useCallback((event: unknown) => {
        if (!onChartClick) return;
        const payload = (event as { activePayload?: Array<{ payload?: Record<string, unknown> }> })?.activePayload?.[0]?.payload;
        if (payload) {
            onChartClick(payload);
        }
    }, [onChartClick]);

    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
                accessibilityLayer
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 8, right: 12, bottom: zoomSlider ? 32 : 20, left: 8 }}
                onClick={handleChartClick}
                style={onChartClick ? { cursor: "pointer" } : undefined}
                barCategoryGap="20%"
                barGap={2}
            >
                <defs>
                    {yAxisKeys.map((field, index) => {
                        const color = getFieldColor(field, index, yAxisFieldColors, colors);
                        return (
                            <linearGradient
                                key={field}
                                id={`bar-gradient-${index}`}
                                x1="0"
                                y1="0"
                                x2={horizontal ? "1" : "0"}
                                y2={horizontal ? "0" : "1"}
                            >
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                            </linearGradient>
                        );
                    })}
                </defs>

                {styleProps.showGrid && (
                    <CartesianGrid
                        strokeDasharray={stacked ? "0" : "3 3"}
                        vertical={horizontal}
                        horizontal={!horizontal}
                    />
                )}

                {horizontal ? (
                    <>
                        <XAxis
                            type="number"
                            tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        >
                            {styleProps.xAxisLabel && (
                                <Label
                                    value={styleProps.xAxisLabel}
                                    offset={-5}
                                    position="insideBottom"
                                    fill="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    fontWeight={600}
                                />
                            )}
                        </XAxis>
                        <YAxis
                            dataKey={xAxisKey}
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={80}
                        >
                            {styleProps.yAxisLabel && (
                                <Label
                                    value={styleProps.yAxisLabel}
                                    angle={-90}
                                    position="insideLeft"
                                    style={{ textAnchor: "middle" }}
                                />
                            )}
                        </YAxis>
                    </>
                ) : (
                    <>
                        <XAxis
                            dataKey={xAxisKey}
                            tickFormatter={(v) => formatXAxisTick(v, styleProps.xAxisTickFormat)}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            minTickGap={10}
                            height={styleProps.xAxisLabel ? 50 : (styleProps.xAxisTickAngle ? 60 : 30)}
                        >
                            {styleProps.xAxisLabel && (
                                <Label value={styleProps.xAxisLabel} offset={-5} position="insideBottom" fontSize={12} fontWeight={600} />
                            )}
                        </XAxis>
                        <YAxis
                            tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={80}
                        >
                            {styleProps.yAxisLabel && (
                                <Label
                                    value={styleProps.yAxisLabel}
                                    angle={-90}
                                    position="insideLeft"
                                    style={{ textAnchor: 'middle' }}
                                />
                            )}
                        </YAxis>
                    </>
                )}

                {styleProps.showTooltip && (
                    <ChartTooltip
                        cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }}
                        content={<ChartTooltipContent />}
                    />
                )}
                {styleProps.showLegend && (
                    <ChartLegend content={<ChartLegendContent />} />
                )}

                {/* Zoom slider */}
                {zoomSlider && !horizontal && data.length > 5 && (
                    <Brush
                        dataKey={xAxisKey}
                        height={24}
                        stroke="#94A3B8"
                        fill="#F1F5F9"
                        travellerWidth={8}
                        tickFormatter={() => ''}
                    />
                )}

                {yAxisKeys.map((field, index) => (
                    <Bar
                        key={field}
                        dataKey={field}
                        name={field}
                        stackId={stacked ? "stack" : undefined}
                        fill={`url(#bar-gradient-${index})`}
                        radius={horizontal ? [0, 4, 4, 0] : [6, 6, 0, 0]}
                        maxBarSize={60}
                        {...defaultAnimationConfig}
                        animationDuration={1400}
                    >
                        {styleProps.showDataLabels && (
                            stacked ? (
                                <LabelList
                                    dataKey={field}
                                    position="center"
                                    fill="#fff"
                                    fontSize={10}
                                    fontWeight={600}
                                    formatter={(v: number) => formatDataLabel(v, styleProps.dataLabelFormat)}
                                />
                            ) : (
                                <LabelList
                                    dataKey={field}
                                    position={horizontal ? "right" : styleProps.dataLabelPosition}
                                    content={horizontal ? undefined : renderDataLabel}
                                    fontSize={horizontal ? 10 : undefined}
                                    fill={horizontal ? "hsl(var(--muted-foreground))" : undefined}
                                    formatter={horizontal ? (v: number) => formatDataLabel(v, styleProps.dataLabelFormat) : undefined}
                                />
                            )
                        )}
                    </Bar>
                ))}
            </BarChart>
        </ChartContainer>
    );
}
