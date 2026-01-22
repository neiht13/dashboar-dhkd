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
 * Custom data label with halo effect for better readability
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

    const formattedValue = formatDataLabel(value as number, format);

    // Adjust dy based on position
    let dyOffset = -10; // Default for 'top'
    if (position === 'center') {
        dyOffset = 5;
    } else if (position === 'bottom') {
        dyOffset = 15;
    }

    return (
        <text
            x={x}
            y={y}
            dy={dyOffset}
            fill={color || stroke || "#1E293B"}
            fontSize={fontSize}
            fontWeight={500}
            textAnchor="middle"
            style={{
                paintOrder: "stroke",
                stroke: "#fff",
                strokeWidth: "2px",
                strokeLinecap: "butt",
                strokeLinejoin: "miter",
            }}
        >
            {formattedValue}
        </text>
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
