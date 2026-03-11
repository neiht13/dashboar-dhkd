"use client";

import React from 'react';
import {
    FunnelChart,
    Funnel,
    LabelList,
    Cell,
} from 'recharts';
import type { BaseChartProps } from '@/types/chart';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from '@/components/ui/chart';
import { defaultAnimationConfig, formatDataLabel } from '../utils/chart-utils';
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
        dataLabelFormat?: 'full' | 'k' | 'tr' | 'ty';
    };
}

export function FunnelChartComponent({
    data,
    config,
    width = "100%",
    height = "100%",
    onChartClick,
    nameKey,
    valueKey,
    colors,
    styleProps,
}: FunnelChartComponentProps) {
    // Sort data descending and add colors + percentage
    const maxValue = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
    const funnelData = data
        .map((item, index) => ({
            name: item[nameKey] as string,
            value: Number(item[valueKey]) || 0,
            fill: colors[index % colors.length] || getChartColor(index),
            pct: ((Number(item[valueKey]) || 0) / maxValue * 100).toFixed(1),
        }))
        .sort((a, b) => b.value - a.value);

    // Build chart config from funnel data
    const chartConfig = React.useMemo(() => {
        const cfg: Record<string, { label: string; color: string }> = {};
        funnelData.forEach((item, index) => {
            cfg[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });
        return cfg;
    }, [funnelData]);

    // Custom label showing both name and value
    const renderCustomLabel = (props: Record<string, unknown>) => {
        const { x, y, width: w, height: h, value, name } = props as {
            x: number; y: number; width: number; height: number; value: number; name: string;
        };
        const cx = (x || 0) + (w || 0) / 2;
        const cy = (y || 0) + (h || 0) / 2;

        return (
            <g>
                <text
                    x={cx}
                    y={cy - 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight={700}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: '2px' }}
                >
                    {formatDataLabel(value, styleProps.dataLabelFormat || 'full')}
                </text>
                <text
                    x={cx}
                    y={cy + 8}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize={10}
                    fontWeight={500}
                >
                    {name}
                </text>
            </g>
        );
    };

    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <FunnelChart>
                <defs>
                    {funnelData.map((entry, index) => (
                        <linearGradient key={`funnel-grad-${index}`} id={`funnel-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={entry.fill} stopOpacity={0.85} />
                            <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                        </linearGradient>
                    ))}
                </defs>

                {styleProps.showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                {styleProps.showLegend && <ChartLegend content={<ChartLegendContent />} />}

                <Funnel
                    dataKey="value"
                    data={funnelData}
                    onClick={(entry) => {
                        if (!onChartClick) return;
                        const payload = (entry as { payload?: Record<string, unknown> })?.payload || (entry as Record<string, unknown>);
                        if (payload) onChartClick(payload);
                    }}
                    {...defaultAnimationConfig}
                    isAnimationActive={true}
                    animationDuration={1500}
                >
                    {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#funnel-gradient-${index})`} />
                    ))}
                    {styleProps.showDataLabels && (
                        <LabelList
                            position="center"
                            content={renderCustomLabel}
                        />
                    )}
                </Funnel>
            </FunnelChart>
        </ChartContainer>
    );
}
