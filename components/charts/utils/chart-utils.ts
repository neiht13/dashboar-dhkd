/**
 * Chart utility functions
 */

import { VI_CHART_LABELS, MODERN_CHART_COLORS } from '@/types/chart';
import { getChartColor } from '@/lib/utils';
import type { ChartConfig as ShadcnChartConfig } from '@/components/ui/chart';

/**
 * Build a shadcn ChartConfig from dynamic field keys
 */
export function buildShadcnChartConfig(
    keys: string[],
    fieldLabels?: Record<string, string>,
    fieldColors?: Record<string, string>,
    palette: string[] = [...MODERN_CHART_COLORS],
): ShadcnChartConfig {
    const cfg: ShadcnChartConfig = {};
    keys.forEach((key, index) => {
        cfg[key] = {
            label: fieldLabels?.[key] || VI_CHART_LABELS[key] || key,
            color: getFieldColor(key, index, fieldColors, palette),
        };
    });
    return cfg;
}

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
        // Mặc định bật nhãn dữ liệu & legend/tooltip
        showDataLabels: (style?.showDataLabels as boolean) ?? true,
        dataLabelPosition: (style?.dataLabelPosition as 'top' | 'center' | 'bottom') || 'top',
        dataLabelFormat: (style?.dataLabelFormat as 'full' | 'k' | 'tr' | 'ty') || 'full',
        dataLabelColor: (style?.dataLabelColor as string) || '#1E293B',
        dataLabelFontSize: (style?.dataLabelFontSize as number) || 10,
        tooltipTheme: (style?.tooltipTheme as 'light' | 'dark') || 'light',
        legendPosition: (style?.legendPosition as 'top' | 'bottom' | 'left' | 'right') || 'bottom',
        showGrid: (style?.showGrid as boolean) ?? true,
        showTooltip: (style?.showTooltip as boolean) ?? true,
        showLegend: (style?.showLegend as boolean) ?? true,
        xAxisLabel: style?.xAxisLabel as string | undefined,
        yAxisLabel: style?.yAxisLabel as string | undefined,
        xAxisTickAngle: (style?.xAxisTickAngle as number) ?? 0,
        xAxisTickFormat: (style?.xAxisTickFormat as 'auto' | 'truncate' | 'short') || 'auto',
    };
}

/**
 * Format X-axis tick text based on format setting
 */
export function formatXAxisTick(value: string | number, format: 'auto' | 'truncate' | 'short' = 'auto'): string {
    const str = String(value);
    switch (format) {
        case 'truncate':
            return str.length > 10 ? str.slice(0, 10) + '…' : str;
        case 'short':
            return str.length > 5 ? str.slice(0, 5) + '…' : str;
        default:
            // Auto: truncate if very long
            return str.length > 15 ? str.slice(0, 15) + '…' : str;
    }
}
