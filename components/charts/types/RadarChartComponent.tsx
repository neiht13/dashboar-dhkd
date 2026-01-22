"use client";

import React from 'react';
import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { CartesianChartProps } from '@/types/chart';
import { getTooltipComponent } from '../shared/ChartTooltip';
import { createLegendRenderer } from '../shared/ChartLegend';
import { 
    getFieldColor, 
    defaultAnimationConfig,
    buildLegendColorMap 
} from '../utils/chart-utils';

export function RadarChartComponent({
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
            <RadarChart data={data}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis
                    dataKey={xAxisKey}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
                
                {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                {styleProps.showLegend && (
                    <Legend 
                        content={renderLegend} 
                        verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                    />
                )}
                
                {yAxisKeys.map((field, index) => (
                    <Radar
                        key={field}
                        name={field}
                        dataKey={field}
                        stroke={getFieldColor(field, index, yAxisFieldColors, colors)}
                        fill={getFieldColor(field, index, yAxisFieldColors, colors)}
                        fillOpacity={0.25}
                        strokeWidth={2}
                        {...defaultAnimationConfig}
                    />
                ))}
            </RadarChart>
        </ResponsiveContainer>
    );
}
