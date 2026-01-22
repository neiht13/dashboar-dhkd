"use client";

import React from 'react';
import type { CustomLegendProps } from '@/types/chart';
import { getFieldLabel } from '../utils/chart-utils';
import { VI_CHART_LABELS } from '@/types/chart';

/**
 * Custom legend component for charts
 */
export function ChartLegend({
    payload,
    fieldColors,
    fieldLabels
}: CustomLegendProps) {
    if (!payload?.length) return null;

    const getLabelText = (key: string): string => {
        return fieldLabels?.[key] || VI_CHART_LABELS[key] || key;
    };

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                    <span
                        className="w-3 h-3 rounded-sm"
                        style={{
                            backgroundColor: fieldColors?.[entry.value] || entry.color,
                        }}
                    />
                    <span className="text-[#64748B] font-medium">
                        {getLabelText(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * Create legend renderer with custom colors
 */
export function createLegendRenderer(
    fieldColors?: Record<string, string>,
    fieldLabels?: Record<string, string>
) {
    return function LegendRenderer(props: CustomLegendProps) {
        return (
            <ChartLegend
                {...props}
                fieldColors={fieldColors}
                fieldLabels={fieldLabels}
            />
        );
    };
}
