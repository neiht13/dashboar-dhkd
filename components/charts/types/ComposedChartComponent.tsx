"use client";

import React from 'react';
import {
    ComposedChart,
    Line,
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
    lineAnimationConfig,
    buildLegendColorMap 
} from '../utils/chart-utils';

interface ComposedChartComponentProps extends CartesianChartProps {
    composedFieldTypes?: Record<string, 'line' | 'bar'>;
}

export function ComposedChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    xAxisKey,
    yAxisKeys,
    styleProps,
    yAxisFieldLabels,
    yAxisFieldColors,
    composedFieldTypes = {},
}: ComposedChartComponentProps) {
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

    // Separate bars and lines
    const barFields = yAxisKeys.filter(field => 
        (composedFieldTypes[field] || (yAxisKeys.indexOf(field) % 2 === 0 ? 'bar' : 'line')) === 'bar'
    );
    const lineFields = yAxisKeys.filter(field => 
        (composedFieldTypes[field] || (yAxisKeys.indexOf(field) % 2 === 0 ? 'bar' : 'line')) !== 'bar'
    );

    return (
        <ResponsiveContainer width={width} height={height}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <defs>
                    {/* Glow filter for lines */}
                    <filter id="composed-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {yAxisKeys.map((field, index) => (
                        <linearGradient key={field} id={`composed-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={1} />
                            <stop offset="100%" stopColor={getFieldColor(field, index, yAxisFieldColors, colors)} stopOpacity={0.7} />
                        </linearGradient>
                    ))}
                </defs>
                
                {styleProps.showGrid && (
                    <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" vertical={false} />
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
                
                {/* Bars first to stay behind lines */}
                {barFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    return (
                        <Bar
                            key={field}
                            dataKey={field}
                            name={field}
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

                {/* Lines second to stay on top */}
                {lineFields.map((field) => {
                    const originalIndex = yAxisKeys.indexOf(field);
                    return (
                        <Line
                            key={field}
                            type="monotone"
                            dataKey={field}
                            name={field}
                            stroke={getFieldColor(field, originalIndex, yAxisFieldColors, colors)}
                            strokeWidth={3}
                            dot={{ 
                                fill: "#fff", 
                                stroke: getFieldColor(field, originalIndex, yAxisFieldColors, colors), 
                                strokeWidth: 2, 
                                r: 4 
                            }}
                            activeDot={{ 
                                r: 6, 
                                fill: getFieldColor(field, originalIndex, yAxisFieldColors, colors), 
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
        </ResponsiveContainer>
    );
}
