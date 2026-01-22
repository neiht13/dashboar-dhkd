/**
 * Chart utility functions
 */

import { VI_CHART_LABELS, MODERN_CHART_COLORS } from '@/types/chart';
import { getChartColor } from '@/lib/utils';

/**
 * Format data label with unit abbreviation
 */
export function formatDataLabel(value: number | string, format: 'full' | 'k' | 'tr' | 'ty' = 'full'): string {
    if (typeof value !== 'number') return String(value);

    switch (format) {
        case 'k':
            return value >= 1000
                ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
                : value.toLocaleString();
        case 'tr':
            return value >= 1000000
                ? `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}tr`
                : value >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : value.toLocaleString();
        case 'ty':
            return value >= 1000000000
                ? `${(value / 1000000000).toFixed(1)}tỷ`
                : value >= 1000000
                    ? `${(value / 1000000).toFixed(0)}tr`
                    : value >= 1000
                        ? `${(value / 1000).toFixed(0)}k`
                        : value.toLocaleString();
        case 'full':
        default:
            return value.toLocaleString();
    }
}

/**
 * Get display label for a field
 */
export function getFieldLabel(field: string, customLabels?: Record<string, string>): string {
    return customLabels?.[field] || VI_CHART_LABELS[field] || field;
}

/**
 * Get color for a field
 */
export function getFieldColor(
    field: string, 
    index: number, 
    customColors?: Record<string, string>, 
    palette: string[] = [...MODERN_CHART_COLORS]
): string {
    return customColors?.[field] || palette[index % palette.length] || getChartColor(index);
}

/**
 * Default animation config for charts
 */
export const defaultAnimationConfig = {
    isAnimationActive: true,
    animationDuration: 1200,
    animationEasing: "ease-out" as const,
    animationBegin: 0,
};

/**
 * Line animation config with longer duration
 */
export const lineAnimationConfig = {
    isAnimationActive: true,
    animationDuration: 2000,
    animationEasing: "ease-in-out" as const,
};

/**
 * Build color map for legend
 */
export function buildLegendColorMap(
    yAxisFields: string[],
    customColors?: Record<string, string>,
    palette: string[] = [...MODERN_CHART_COLORS]
): Record<string, string> {
    const colorMap: Record<string, string> = {};
    yAxisFields.forEach((field, index) => {
        colorMap[field] = getFieldColor(field, index, customColors, palette);
    });
    return colorMap;
}

/**
 * Filter data by xAxis exclude values
 */
export function filterDataByXAxisExclude<T extends Record<string, unknown>>(
    data: T[],
    xAxisKey: string,
    excludeValues: string[]
): T[] {
    if (!excludeValues.length || !xAxisKey) return data;
    return data.filter(item => !excludeValues.includes(String(item[xAxisKey])));
}

/**
 * Extract style props from chart config
 */
export function extractStyleProps(style?: Record<string, unknown>, colors?: string[]) {
    const defaultColors = [...MODERN_CHART_COLORS];
    
    return {
        colors: (style?.colors as string[])?.length ? style.colors as string[] : colors?.length ? colors : defaultColors,
        showDataLabels: (style?.showDataLabels as boolean) ?? false,
        dataLabelPosition: (style?.dataLabelPosition as 'top' | 'center' | 'bottom') || 'top',
        dataLabelFormat: (style?.dataLabelFormat as 'full' | 'k' | 'tr' | 'ty') || 'full',
        dataLabelColor: (style?.dataLabelColor as string) || '#1E293B',
        dataLabelFontSize: (style?.dataLabelFontSize as number) || 10,
        tooltipTheme: (style?.tooltipTheme as 'light' | 'dark') || 'light',
        legendPosition: (style?.legendPosition as 'top' | 'bottom' | 'left' | 'right') || 'bottom',
        showGrid: style?.showGrid as boolean,
        showTooltip: style?.showTooltip as boolean,
        showLegend: style?.showLegend as boolean,
        xAxisLabel: style?.xAxisLabel as string | undefined,
        yAxisLabel: style?.yAxisLabel as string | undefined,
    };
}
