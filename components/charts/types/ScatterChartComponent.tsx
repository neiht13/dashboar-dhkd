"use client";

import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
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

export function ScatterChartComponent({
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
    
    const yKey = yAxisKeys[0] || 'value';

    return (
        <ResponsiveContainer width={width} height={height}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                {styleProps.showGrid && (
                    <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" />
                )}
                
                <XAxis
                    dataKey={xAxisKey}
                    name={xAxisKey}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                />
                
                <YAxis
                    dataKey={yKey}
                    name={yKey}
                    tickFormatter={(v) => formatDataLabel(v, styleProps.dataLabelFormat)}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                />
                
                {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                {styleProps.showLegend && (
                    <Legend 
                        content={renderLegend} 
                        verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                    />
                )}
                
                <Scatter
                    data={data}
                    fill={getFieldColor(yKey, 0, yAxisFieldColors, colors)}
                    {...defaultAnimationConfig}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
}
