"use client";

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
} from 'recharts';
import type { PieChartProps } from '@/types/chart';
import { getTooltipComponent } from '../shared/ChartTooltip';
import { createLegendRenderer } from '../shared/ChartLegend';
import { createDataLabelRenderer } from '../shared/ChartDataLabel';
import { 
    getFieldColor, 
    defaultAnimationConfig,
} from '../utils/chart-utils';

export function PieChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    nameKey,
    valueKey,
    styleProps,
    innerRadius = 0,
    pieVariant = 'default',
}: PieChartProps) {
    const colors = styleProps.colors;
    const TooltipComponent = getTooltipComponent(styleProps.tooltipTheme);
    const renderLegend = createLegendRenderer();
    const renderDataLabel = createDataLabelRenderer({
        format: styleProps.dataLabelFormat,
        color: styleProps.dataLabelColor,
        fontSize: styleProps.dataLabelFontSize,
    });

    // Sized Pie Chart variant
    if (pieVariant === 'sized') {
        const sortedData = [...data]
            .map((item, idx) => ({ ...item, __originalIndex: idx }))
            .sort((a, b) => (Number(a[valueKey]) || 0) - (Number(b[valueKey]) || 0));

        const numericWidth = typeof width === 'number' ? width : 500;
        const numericHeight = typeof height === 'number' ? height : 300;
        const BASE_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.3;
        const MAX_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.95;
        const totalValue = sortedData.reduce((acc, curr) => acc + (Number(curr[valueKey]) || 0), 0);
        const maxValue = Math.max(...sortedData.map(d => Number(d[valueKey]) || 0));

        let currentAngle = 0;

        return (
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                    {styleProps.showLegend && (
                        <Legend 
                            content={renderLegend} 
                            verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                        />
                    )}
                    {sortedData.map((entry, index) => {
                        const value = Number(entry[valueKey]) || 0;
                        const percentage = totalValue ? value / totalValue : 0;
                        const startAngle = 90 - (currentAngle * 360);
                        const endAngle = 90 - ((currentAngle + percentage) * 360);
                        currentAngle += percentage;

                        const radiusRange = MAX_RADIUS - BASE_RADIUS;
                        const valueRatio = maxValue ? value / maxValue : 0;
                        const outerRadius = BASE_RADIUS + (valueRatio * radiusRange);
                        const originalIndex = (entry as any).__originalIndex;

                        return (
                            <Pie
                                key={`sized-pie-${index}`}
                                dataKey={valueKey}
                                nameKey={nameKey}
                                cx="50%"
                                cy="50%"
                                startAngle={startAngle}
                                endAngle={endAngle}
                                innerRadius={30}
                                outerRadius={outerRadius}
                                cornerRadius={4}
                                paddingAngle={0}
                                stroke="none"
                                data={[entry]}
                                {...defaultAnimationConfig}
                            >
                                <Cell
                                    fill={getFieldColor(String(originalIndex), originalIndex, undefined, colors)}
                                    stroke="none"
                                />
                                {styleProps.showDataLabels && (
                                    <LabelList
                                        dataKey={valueKey}
                                        position="outside"
                                        content={renderDataLabel}
                                        stroke="none"
                                    />
                                )}
                            </Pie>
                        );
                    })}
                </PieChart>
            </ResponsiveContainer>
        );
    }

    // Standard Pie or Donut Chart
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                {styleProps.showLegend && (
                    <Legend 
                        content={renderLegend} 
                        verticalAlign={styleProps.legendPosition as 'top' | 'bottom'} 
                    />
                )}
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={80}
                    dataKey={valueKey}
                    nameKey={nameKey}
                    paddingAngle={2}
                    {...defaultAnimationConfig}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={getFieldColor(nameKey, index, undefined, colors)} 
                            strokeWidth={1} 
                        />
                    ))}
                    {styleProps.showDataLabels && (
                        <LabelList
                            dataKey={valueKey}
                            position="outside"
                            content={renderDataLabel}
                            stroke="none"
                        />
                    )}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}
