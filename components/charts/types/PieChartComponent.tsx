"use client";

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Sector,
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

    // State for active sector
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const renderActiveShape = (props: any) => {
        const RADIAN = Math.PI / 180;
        const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
        const sin = Math.sin(-midAngle * RADIAN);
        const cos = Math.cos(-midAngle * RADIAN);
        const sx = cx + (outerRadius + 10) * cos;
        const sy = cy + (outerRadius + 10) * sin;
        const mx = cx + (outerRadius + 30) * cos;
        const my = cy + (outerRadius + 30) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 6}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 8}
                    fill={fill}
                />
            </g>
        );
    };

    // Calculate total for center text
    const totalValue = React.useMemo(() => {
        return data.reduce((acc, curr) => acc + (Number(curr[valueKey]) || 0), 0);
    }, [data, valueKey]);

    // Sized Pie Chart variant
    if (pieVariant === 'sized') {
        const sortedData = [...data]
            .map((item, idx) => ({ ...item, __originalIndex: idx }))
            .sort((a, b) => (Number(a[valueKey]) || 0) - (Number(b[valueKey]) || 0));

        // ... existing sizing logic ...
        const numericWidth = typeof width === 'number' ? width : 500;
        const numericHeight = typeof height === 'number' ? height : 300;
        const BASE_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.3;
        const MAX_RADIUS = Math.min(numericWidth / 2, numericHeight / 2) * 0.95;
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
                        // ... existing sized pie logic ...
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
                                onMouseEnter={(e) => onPieEnter(e, index)}
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
    const isDonut = pieVariant === 'donut' || innerRadius > 0;
    const finalInnerRadius = isDonut ? (innerRadius || '55%') : 0;
    const finalOuterRadius = '80%';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                        innerRadius={finalInnerRadius}
                        outerRadius={finalOuterRadius}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        paddingAngle={2}
                        {...defaultAnimationConfig}
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={() => setActiveIndex(undefined)}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getFieldColor(nameKey, index, undefined, colors)}
                                strokeWidth={0}
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

            {/* Center Content for Donut */}
            {isDonut && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-bold text-foreground">
                        {totalValue.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Total
                    </span>
                </div>
            )}
        </div>
    );
}
