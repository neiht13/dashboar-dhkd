"use client";

import React from 'react';
import {
    FunnelChart,
    Funnel,
    Tooltip,
    Legend,
    LabelList,
    ResponsiveContainer,
} from 'recharts';
import type { BaseChartProps } from '@/types/chart';
import { getTooltipComponent } from '../shared/ChartTooltip';
import { createLegendRenderer } from '../shared/ChartLegend';
import { getFieldColor, defaultAnimationConfig } from '../utils/chart-utils';
import { getChartColor } from '@/lib/utils';

interface FunnelChartComponentProps extends BaseChartProps {
    nameKey: string;
    valueKey: string;
    colors: string[];
    styleProps: {
        showDataLabels: boolean;
        showTooltip: boolean;
        showLegend: boolean;
        tooltipTheme: 'light' | 'dark';
    };
}

export function FunnelChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    nameKey,
    valueKey,
    colors,
    styleProps,
}: FunnelChartComponentProps) {
    const TooltipComponent = getTooltipComponent(styleProps.tooltipTheme);
    const renderLegend = createLegendRenderer();

    // Transform data for funnel chart
    const funnelData = data.map((item, index) => ({
        name: item[nameKey] as string,
        value: item[valueKey] as number,
        fill: colors[index % colors.length] || getChartColor(index),
    }));

    return (
        <ResponsiveContainer width={width} height={height}>
            <FunnelChart>
                {styleProps.showTooltip && <Tooltip content={<TooltipComponent />} />}
                {styleProps.showLegend && <Legend content={renderLegend} />}
                <Funnel
                    dataKey="value"
                    data={funnelData}
                    {...defaultAnimationConfig}
                >
                    {styleProps.showDataLabels && (
                        <LabelList 
                            position="center" 
                            fill="#fff" 
                            stroke="none" 
                            dataKey="name" 
                            fontSize={11} 
                            fontWeight={600} 
                        />
                    )}
                </Funnel>
            </FunnelChart>
        </ResponsiveContainer>
    );
}
