"use client";

import React from 'react';
import {
    ComposedChart,
    Line,
    Bar,
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
    defaultAnimationConfig,
    lineAnimationConfig,
    buildShadcnChartConfig,
} from '../utils/chart-utils';

interface ComposedChartComponentProps extends CartesianChartProps {
    composedFieldTypes?: Record<string, 'line' | 'bar' | 'area'>;
    secondaryYAxis?: boolean;
    secondaryYAxisLabel?: string;
    secondaryYAxisFields?: string[];
    zoomSlider?: boolean;
    showMarkers?: boolean;
    markerSize?: number;
    shadeArea?: boolean;
    shadeAreaOpacity?: number;
    plotAreaBackground?: string;
}

export function ComposedChartComponent({
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
    composedFieldTypes = {},
    secondaryYAxis = false,
    secondaryYAxisLabel,
    secondaryYAxisFields = [],
    zoomSlider = false,
    showMarkers = true,
    markerSize = 4,
    shadeArea = false,
    shadeAreaOpacity = 0.15,
}: ComposedChartComponentProps) {
    const colors = styleProps.colors;

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

    const getFieldType = (field: string): 'bar' | 'line' | 'area' => {
        if (composedFieldTypes[field]) return composedFieldTypes[field];
        if (secondaryYAxisFields.includes(field)) return 'line';
        return 'bar';
    };

    const barFields = yAxisKeys.filter((f) => getFieldType(f) === 'bar');
    const lineFields = yAxisKeys.filter((f) => getFieldType(f) === 'line');
    const areaFields = yAxisKeys.filter((f) => getFieldType(f) === 'area');

    const getYAxisId = (field: string): string => {
        if (secondaryYAxis && secondaryYAxisFields.includes(field)) return 'right';
        return 'left';
    };

    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart
                accessibilityLayer
                data={data}
                margin={{ top: 8, right: secondaryYAxis ? 40 : 12, bottom: zoomSlider ? 32 : 8, left: 8 }}
                onClick={handleChartClick}
                style={onChartClick ? { cursor: "pointer" } : undefined}
            >
                <defs>
                    <filter id="composed-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {yAxisKeys.map((field, index) => (
                        <React.Fragment key={field}>
                            <linearGradient id={`composed-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.85} />
                                <stop offset="100%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id={`composed-area-${index}`} x1="0" y1="0" x2="0" y2="1">
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
                    yAxisId="left"
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

                {secondaryYAxis && (
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={70}
                    >
                        {secondaryYAxisLabel && (
                            <Label
                                value={secondaryYAxisLabel}
                                angle={90}
                                position="insideRight"
                                style={{ textAnchor: 'middle' }}
                            />
                        )}
                    </YAxis>
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

                {barFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    return (
                        <Bar
                            key={field}
                            dataKey={field}
                            name={field}
                            yAxisId={getYAxisId(field)}
                            fill={`url(#composed-gradient-${originalIndex})`}
                            radius={[4, 4, 0, 0]}
                            {...defaultAnimationConfig}
                        >
                            {styleProps.showDataLabels && (
                                <LabelList
                                    dataKey={field}
                                    position={styleProps.dataLabelPosition}
                                    content={renderDataLabel}
                                />
                            )}
                        </Bar>
                    );
                })}

                {shadeArea && lineFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    return (
                        <Area
                            key={`shade-${field}`}
                            type="monotone"
                            dataKey={field}
                            name={`${field}_shade`}
                            yAxisId={getYAxisId(field)}
                            fill={`url(#composed-area-${originalIndex})`}
                            stroke="none"
                            legendType="none"
                            tooltipType="none"
                            {...defaultAnimationConfig}
                        />
                    );
                })}

                {areaFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    return (
                        <Area
                            key={field}
                            type="monotone"
                            dataKey={field}
                            name={field}
                            yAxisId={getYAxisId(field)}
                            fill={`url(#composed-area-${originalIndex})`}
                            stroke={getFieldColor(field, originalIndex, yAxisFieldColors, colors)}
                            strokeWidth={2}
                            {...defaultAnimationConfig}
                        >
                            {styleProps.showDataLabels && (
                                <LabelList
                                    dataKey={field}
                                    position={styleProps.dataLabelPosition}
                                    content={renderDataLabel}
                                />
                            )}
                        </Area>
                    );
                })}

                {lineFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    const fieldColor = getFieldColor(field, originalIndex, yAxisFieldColors, colors);
                    return (
                        <Line
                            key={field}
                            type="monotone"
                            dataKey={field}
                            name={field}
                            yAxisId={getYAxisId(field)}
                            stroke={fieldColor}
                            strokeWidth={3}
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
                            filter="url(#composed-line-glow)"
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
            </ComposedChart>
        </ChartContainer>
    );
}
