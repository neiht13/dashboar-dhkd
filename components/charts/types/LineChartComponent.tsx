"use client";

import React from 'react';
import {
    LineChart,
    Line,
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
import { createDataLabelRenderer } from '../shared/ChartDataLabel';
import {
    getFieldColor,
    formatDataLabel,
    formatXAxisTick,
    lineAnimationConfig,
    defaultAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

export function LineChartComponent({
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
    const style = config.style;
    const showMarkers = style?.showMarkers ?? true;
    const markerSize = style?.markerSize ?? 4;
    const shadeArea = style?.shadeArea ?? false;
    const shadeAreaOpacity = style?.shadeAreaOpacity ?? 0.15;
    const zoomSlider = style?.zoomSlider ?? false;

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
            <LineChart
                accessibilityLayer
                data={data}
                margin={{ top: 8, right: 12, bottom: zoomSlider ? 32 : 8, left: 8 }}
                onClick={handleChartClick}
                style={onChartClick ? { cursor: "pointer" } : undefined}
            >
                <defs>
                    <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {yAxisKeys.map((field, index) => (
                        <React.Fragment key={field}>
                            <linearGradient id={`line-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id={`line-area-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={shadeAreaOpacity} />
                                <stop offset="100%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.02} />
                            </linearGradient>
                        </React.Fragment>
                    ))}
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

                {shadeArea && yAxisKeys.map((field, index) => (
                    <Area
                        key={`shade-${field}`}
                        type="monotone"
                        dataKey={field}
                        name={`${field}_shade`}
                        fill={`url(#line-area-${index})`}
                        stroke="none"
                        legendType="none"
                        tooltipType="none"
                        {...defaultAnimationConfig}
                    />
                ))}

                {yAxisKeys.map((field, index) => {
                    const fieldColor = getFieldColor(field, index, yAxisFieldColors, colors);
                    return (
                        <Line
                            key={field}
                            type="monotone"
                            dataKey={field}
                            name={field}
                            stroke={fieldColor}
                            strokeWidth={2.5}
                            dot={showMarkers ? {
                                fill: "#fff",
                                stroke: fieldColor,
                                strokeWidth: 2,
                                r: markerSize
                            } : false}
                            activeDot={{
                                r: markerSize + 2,
                                fill: fieldColor,
                                stroke: "#fff",
                                strokeWidth: 2
                            }}
                            filter="url(#line-glow)"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            {...lineAnimationConfig}
                        >
                            {styleProps.showDataLabels && (
                                <LabelList
                                    dataKey={field}
                                    position={styleProps.dataLabelPosition}
                                    content={renderDataLabel}
                                />
                            )}
                        </Line>
                    );
                })}
            </LineChart>
        </ChartContainer>
    );
}
