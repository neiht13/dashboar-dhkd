"use client";

import React from 'react';
import {
    AreaChart,
    Area,
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
import { 
    getFieldColor, 
    formatDataLabel, 
    defaultAnimationConfig,
    buildLegendColorMap 
} from '../utils/chart-utils';

export function AreaChartComponent({
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

    return (
        <ResponsiveContainer width={width} height={height}>
            <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                <defs>
                    {yAxisKeys.map((field, index) => {
                        const color = getFieldColor(field, index, yAxisFieldColors, colors);
                        return (
                            <React.Fragment key={field}>
                                <linearGradient
                                    id={`area-gradient-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                                <pattern
                                    id={`area-hatch-${index}`}
                                    x="0"
                                    y="0"
                                    width="6.81"
                                    height="6.81"
                                    patternUnits="userSpaceOnUse"
                                    patternTransform="rotate(-45)"
                                    overflow="visible"
                                >
                                    <g overflow="visible" style={{ willChange: 'transform' }}>
                                        <animateTransform
                                            attributeName="transform"
                                            type="translate"
                                            from="0 0"
                                            to="6 0"
                                            dur="1s"
                                            repeatCount="indefinite"
                                        />
                                        <rect width="10" height="10" opacity={0.05} fill={color} />
                                        <rect width="1" height="10" fill={color} />
                                    </g>
                                </pattern>
                            </React.Fragment>
                        );
                    })}
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
                    <Area
                        key={field}
                        type="natural"
                        dataKey={field}
                        name={field}
                        stroke={getFieldColor(field, index, yAxisFieldColors, colors)}
                        strokeWidth={2}
                        fill={`url(#area-hatch-${index})`}
                        fillOpacity={0.8}
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
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
