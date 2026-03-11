"use client";

import React from 'react';
import type { DataLabelProps } from '@/types/chart';
import { formatDataLabel } from '../utils/chart-utils';

interface CustomDataLabelProps extends DataLabelProps {
    format?: 'full' | 'k' | 'tr' | 'ty';
    color?: string;
    fontSize?: number;
    position?: 'top' | 'center' | 'bottom';
}

/**
 * Enhanced data label with halo + shadow for readability over any background
 */
export function ChartDataLabel({
    x,
    y,
    value,
    stroke,
    format = 'full',
    color,
    fontSize = 10,
    position = 'top',
}: CustomDataLabelProps) {
    if (x === undefined || y === undefined || value === undefined) return null;
    if (typeof value === 'number' && value === 0) return null; // Skip zero values

    const formattedValue = formatDataLabel(value as number, format);

    let dyOffset = -12;
    if (position === 'center') dyOffset = 4;
    else if (position === 'bottom') dyOffset = 18;

    const fillColor = color || stroke || "#1E293B";

    return (
        <g>
            {/* White halo for contrast */}
            <text
                x={x}
                y={y}
                dy={dyOffset}
                fill="white"
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="middle"
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
            >
                {formattedValue}
            </text>
            {/* Main label */}
            <text
                x={x}
                y={y}
                dy={dyOffset}
                fill={fillColor}
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="middle"
                letterSpacing="0.02em"
            >
                {formattedValue}
            </text>
        </g>
    );
}

/**
 * Create a data label renderer with preset options
 */
export function createDataLabelRenderer(options: Omit<CustomDataLabelProps, 'x' | 'y' | 'value' | 'stroke'>) {
    return function DataLabelRenderer(props: DataLabelProps) {
        return <ChartDataLabel {...props} {...options} />;
    };
}
