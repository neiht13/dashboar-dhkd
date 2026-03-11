/**
 * Chart Types and Interfaces
 * Centralized type definitions for all chart-related components
 */

import type { ChartConfig, ChartStyle, DataSource, ChartType, AggregationType } from './index';

// ===========================================
// CHART DATA TYPES
// ===========================================

export interface ChartDataPoint {
    [key: string]: string | number | null | undefined;
}

export type ChartData = ChartDataPoint[];

// ===========================================
// CHART PROPS
// ===========================================

export interface BaseChartProps {
    data: ChartData;
    config: ChartConfig;
    width?: number | string;
    height?: number | string;
    onChartClick?: (payload: ChartDataPoint) => void;
}

export interface ChartStyleProps {
    colors: string[];
    showDataLabels: boolean;
    dataLabelPosition: 'top' | 'center' | 'bottom';
    dataLabelFormat: 'full' | 'k' | 'tr' | 'ty';
    dataLabelColor: string;
    dataLabelFontSize: number;
    tooltipTheme: 'light' | 'dark';
    legendPosition: 'top' | 'bottom' | 'left' | 'right';
    showGrid: boolean;
    showTooltip: boolean;
    showLegend: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
}

export interface CartesianChartProps extends BaseChartProps {
    xAxisKey: string;
    yAxisKeys: string[];
    styleProps: ChartStyleProps;
    yAxisFieldLabels: Record<string, string>;
    yAxisFieldColors: Record<string, string>;
}

export interface PieChartProps extends BaseChartProps {
    nameKey: string;
    valueKey: string;
    styleProps: ChartStyleProps;
    innerRadius?: number;
    pieVariant?: 'default' | 'sized' | 'donut';
}

export interface CardChartProps {
    data: ChartData;
    valueKey: string;
    style?: ChartStyle;
    formatValue: (value: number) => string;
    getFieldLabel: (field: string) => string;
}

// ===========================================
// TOOLTIP PROPS
// ===========================================

export interface TooltipPayload {
    name: string;
    value: number;
    color: string;
}

export interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}

// ===========================================
// LEGEND PROPS
// ===========================================

export interface LegendPayload {
    value: string;
    color: string;
}

export interface CustomLegendProps {
    payload?: LegendPayload[];
    fieldColors?: Record<string, string>;
    fieldLabels?: Record<string, string>;
}

// ===========================================
// DATA LABEL PROPS
// ===========================================

export interface DataLabelProps {
    x?: number;
    y?: number;
    value?: number | string;
    stroke?: string;
    index?: number;
    name?: string;
}

// ===========================================
// CHART ANIMATION CONFIG
// ===========================================

export interface ChartAnimationConfig {
    isAnimationActive: boolean;
    animationDuration: number;
    animationEasing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    animationBegin?: number;
}

// ===========================================
// COLOR CONSTANTS
// ===========================================

export const MODERN_CHART_COLORS = [
    "#3B82F6", // Blue 500
    "#8B5CF6", // Violet 500
    "#10B981", // Emerald 500
    "#F59E0B", // Amber 500
    "#EF4444", // Red 500
    "#06B6D4", // Cyan 500
    "#EC4899", // Pink 500
    "#14B8A6", // Teal 500
    "#F97316", // Orange 500
    "#6366F1", // Indigo 500
    "#84CC16", // Lime 500
    "#A855F7", // Purple 500
    "#22D3EE", // Cyan 400
    "#FB923C", // Orange 400
    "#34D399", // Emerald 400
    "#C084FC", // Purple 400
] as const;

// Gradient pairs for each color (from, to)
export const CHART_GRADIENT_PAIRS: [string, string][] = [
    ["#3B82F6", "#1D4ED8"], // Blue
    ["#8B5CF6", "#6D28D9"], // Violet
    ["#10B981", "#059669"], // Emerald
    ["#F59E0B", "#D97706"], // Amber
    ["#EF4444", "#DC2626"], // Red
    ["#06B6D4", "#0891B2"], // Cyan
    ["#EC4899", "#DB2777"], // Pink
    ["#14B8A6", "#0D9488"], // Teal
    ["#F97316", "#EA580C"], // Orange
    ["#6366F1", "#4F46E5"], // Indigo
];

// ===========================================
// VIETNAMESE LABELS
// ===========================================

export const VI_CHART_LABELS: Record<string, string> = {
    ptm: "Phát triển mới",
    khoiphuc: "Khôi phục",
    thanhly: "Thanh lý",
    tamngung_yc: "Tạm ngưng YC",
    tamngung_nc: "Tạm ngưng NC",
    dichchuyen: "Dịch chuyển",
    quahan: "Quá hạn",
    dungthu: "Dùng thử",
    dungthat: "Dùng thật",
    value: "Giá trị",
    name: "Tên",
};

// ===========================================
// CHART UTILS
// ===========================================

export interface ChartUtils {
    formatDataLabel: (value: number | string, format: 'full' | 'k' | 'tr' | 'ty') => string;
    getFieldLabel: (field: string, customLabels?: Record<string, string>) => string;
    getFieldColor: (field: string, index: number, customColors?: Record<string, string>, palette?: string[]) => string;
}
