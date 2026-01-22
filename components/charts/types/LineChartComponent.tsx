"use client";

import React from 'react';
import {
    LineChart,
    Line,
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
    lineAnimationConfig,
    buildLegendColorMap 
} from '../utils/chart-utils';

export function LineChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    xAxisKey,
    yAxisKeys,
    styleProps,
    yAxisFieldLabels,
    yAxisFieldColors,
}: CartesianChartProps) {
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

    return (
        <ResponsiveContainer width={width} height={height}>
            <LineChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                <defs>
                    {/* Glow filter for line effect */}
                    <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {yAxisKeys.map((field, index) => (
                        <linearGradient key={field} id={`line-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.3} />
                        </linearGradient>
                    ))}
                </defs>
                
                {styleProps.showGrid && (
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                )}
                
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
                
                {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                {styleProps.showLegend && (
                    <Legend 
                        content={renderLegend} 
                        verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                    />
                )}
                
                {yAxisKeys.map((field, index) => (
                    <Line
                        key={field}
                        type="monotone"
                        dataKey={field}
                        name={field}
                        stroke={getFieldColor(field, index, yAxisFieldColors, colors)}
                        strokeWidth={2.5}
                        dot={{ 
                            fill: "#fff", 
                            stroke: getFieldColor(field, index, yAxisFieldColors, colors), 
                            strokeWidth: 2, 
                            r: 4 
                        }}
                        activeDot={{ 
                            r: 6, 
                            fill: getFieldColor(field, index, yAxisFieldColors, colors), 
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
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
