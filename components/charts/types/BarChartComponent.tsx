"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Label,
    LabelList,
} from 'recharts';
import type { CartesianChartProps } from '@/types/chart';
import { getTooltipComponent } from '../shared/ChartTooltip';
import { createLegendRenderer } from '../shared/ChartLegend';
import { createDataLabelRenderer } from '../shared/ChartDataLabel';
import { 
    getFieldColor, 
    formatDataLabel, 
    defaultAnimationConfig,
    buildLegendColorMap 
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
    xAxisKey,
    yAxisKeys,
    styleProps,
    yAxisFieldLabels,
    yAxisFieldColors,
    stacked = false,
    horizontal = false,
}: BarChartComponentProps) {
    const colors = styleProps.colors;
    const TooltipComponent = getTooltipComponent(styleProps.tooltipTheme);
    const renderLegend = createLegendRenderer(
        buildLegendColorMap(yAxisKeys, yAxisFieldColors, colors),
        yAxisFieldLabels
    );
    const renderDataLabel = createDataLabelRenderer({
        format: styleProps.dataLabelFormat,
        color: styleProps.dataLabelColor,
        fontSize: styleProps.dataLabelFontSize,
        position: styleProps.dataLabelPosition,
    });

    // Generate gradients
    const gradients = yAxisKeys.map((field, index) => (
        <linearGradient 
            key={field} 
            id={`bar-gradient-${index}`} 
            x1="0" 
            y1="0" 
            x2={horizontal ? "1" : "0"} 
            y2={horizontal ? "0" : "1"}
        >
            <stop 
                offset="0%" 
                stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} 
                stopOpacity={horizontal ? 0.7 : 1} 
            />
            <stop 
                offset="100%" 
                stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} 
                stopOpacity={horizontal ? 1 : 0.7} 
            />
        </linearGradient>
    ));

    return (
        <ResponsiveContainer width={width} height={height}>
            <BarChart 
                data={data} 
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
            >
                <defs>{gradients}</defs>
                
                {styleProps.showGrid && (
                    <CartesianGrid 
                        strokeDasharray={stacked ? "0" : "3 3"} 
                        stroke="#E2E8F0" 
                        vertical={horizontal} 
                        horizontal={!horizontal}
                    />
                )}
                
                {horizontal ? (
                    <>
                        <XAxis
                            type="number"
                            tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                            tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            axisLine={{ stroke: "#E2E8F0" }}
                            tickLine={false}
                        />
                        <YAxis
                            dataKey={xAxisKey}
                            type="category"
                            tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                        />
                    </>
                ) : (
                    <>
                        <XAxis
                            dataKey={xAxisKey}
                            tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            axisLine={{ stroke: "#E2E8F0" }}
                            tickLine={false}
                            height={styleProps.xAxisLabel ? 40 : 30}
                        >
                            {styleProps.xAxisLabel && (
                                <Label value={styleProps.xAxisLabel} offset={-5} position="insideBottom" fill="#64748B" fontSize={12} />
                            )}
                        </XAxis>
                        <YAxis
                            tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                            tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                        >
                            {styleProps.yAxisLabel && (
                                <Label 
                                    value={styleProps.yAxisLabel} 
                                    angle={-90} 
                                    position="insideLeft" 
                                    style={{ textAnchor: 'middle', fill: '#64748B', fontSize: 12 }} 
                                />
                            )}
                        </YAxis>
                    </>
                )}
                
                {styleProps.showTooltip && (
                    <Tooltip 
                        content={<TooltipComponent />} 
                        cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }} 
                    />
                )}
                {styleProps.showLegend && (
                    <Legend 
                        content={renderLegend} 
                        verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                    />
                )}
                
                {yAxisKeys.map((field, index) => (
                    <Bar
                        key={field}
                        dataKey={field}
                        name={field}
                        stackId={stacked ? "stack" : undefined}
                        fill={`url(#bar-gradient-${index})`}
                        radius={horizontal ? [0, 2, 2, 0] : [4, 4, 0, 0]}
                        {...defaultAnimationConfig}
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
                                    fill={horizontal ? "#64748B" : undefined}
                                    formatter={horizontal ? (v: number) => formatDataLabel(v, styleProps.dataLabelFormat) : undefined}
                                />
                            )
                        )}
                    </Bar>
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
