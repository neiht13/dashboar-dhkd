"use client";

import React from 'react';
import { icons } from 'lucide-react';
import type { CardChartProps } from '@/types/chart';

export function CardChartComponent({
    data,
    valueKey,
    style,
    formatValue,
    getFieldLabel,
}: CardChartProps) {
    // Calculate total value
    const cardValue = data.reduce((acc, curr) => {
        const val = Number(curr[valueKey]);
        return isNaN(val) ? acc : acc + val;
    }, 0);

    // Card Styles
    const fontSizeMap = {
        sm: "text-2xl",
        md: "text-4xl",
        lg: "text-6xl",
        xl: "text-8xl"
    };
    const fontSizeClass = fontSizeMap[style?.cardFontSize || 'lg'] || "text-6xl";
    const textColor = style?.cardColor || undefined;

    // Icon
    const IconComponent = style?.showCardIcon && style?.cardIcon && (icons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[style.cardIcon]
        ? (icons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[style.cardIcon]
        : null;

    return (
        <div
            className="flex flex-col items-center justify-center h-full w-full rounded-lg transition-colors"
            style={{ backgroundColor: style?.cardBackgroundColor || 'transparent' }}
        >
            <div className="flex items-center gap-3 mb-2">
                {IconComponent && (
                    <IconComponent
                        className={fontSizeClass}
                        style={{ width: '1em', height: '1em', color: textColor }}
                    />
                )}
                <div
                    className={`font-bold ${!textColor ? "bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600" : ""}`}
                    style={{ color: textColor }}
                >
                    <span className={fontSizeClass}>{formatValue(cardValue)}</span>
                </div>
            </div>
            <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                {valueKey ? getFieldLabel(valueKey) : "Giá trị"}
            </div>
        </div>
    );
}
