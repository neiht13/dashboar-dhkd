"use client";

import React from 'react';
import {
    AreaChart,
    Area,
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
import {
    getFieldColor,
    formatDataLabel,
    formatXAxisTick,
    defaultAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

export function AreaChartComponent({
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
    const zoomSlider = chartStyle?.zoomSlider ?? false;
    const showMarkers = chartStyle?.showMarkers ?? false;
    const markerSize = chartStyle?.markerSize ?? 4;

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
            <AreaChart
                accessibilityLayer
                data={data}
                margin={{ top: 8, right: 12, bottom: zoomSlider ? 32 : 8, left: 8 }}
                onClick={handleChartClick}
                style={onChartClick ? { cursor: "pointer" } : undefined}
            >
                <defs>
                    {yAxisKeys.map((field, index) => {
                        const color = getFieldColor(field, index, yAxisFieldColors, colors);
                        return (
                            <linearGradient
                                key={field}
                                id={`area-gradient-${index}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                        );
                    })}
                </defs>

                {styleProps.showGrid && (
                    <CartesianGrid vertical={false} />
                )}

                <XAxis
                    dataKey={xAxisKey}
                    tickFormatter={(v) => formatXAxisTick(v, styleProps.xAxisTickFormat)}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval={0}
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

                {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                {styleProps.showLegend && (
                    <ChartLegend content={<ChartLegendContent />} />
                )}

                {zoomSlider && data.length > 5 && (
                    <Brush
                        dataKey={xAxisKey}
                        height={24}
                        stroke="#94A3B8"
                        fill="#F1F5F9"
                        travellerWidth={8}
                        tickFormatter={() => ''}
                    />
                )}

                {yAxisKeys.map((field, index) => {
                    const fieldColor = getFieldColor(field, index, yAxisFieldColors, colors);
                    return (
                        <Area
                            key={field}
                            type="natural"
                            dataKey={field}
                            name={field}
                            stroke={fieldColor}
                            strokeWidth={2}
                            fill={`url(#area-gradient-${index})`}
                            fillOpacity={0.8}
                            dot={showMarkers ? {
                                fill: "#fff",
                                stroke: fieldColor,
                                strokeWidth: 2,
                                r: markerSize,
                            } : false}
                            activeDot={{
                                r: markerSize + 2,
                                fill: fieldColor,
                                stroke: "#fff",
                                strokeWidth: 2,
                            }}
                            {...defaultAnimationConfig}
                        >
                            {styleProps.showDataLabels && (
                                <LabelList
                                    dataKey={field}
                                    position={styleProps.dataLabelPosition}
                                    fontSize={styleProps.dataLabelFontSize}
                                    fill={styleProps.dataLabelColor}
                                    fontWeight={500}
                                    formatter={(v: number) => formatDataLabel(v, styleProps.dataLabelFormat)}
                                />
                            )}
                        </Area>
                    );
                })}
            </AreaChart>
        </ChartContainer>
    );
}
