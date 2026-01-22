/**
 * Widget Types and Interfaces
 * Type definitions for dashboard widgets
 */

import type { ChartConfig, LayoutItem } from './index';

// ===========================================
// WIDGET TYPE ENUMS
// ===========================================

export type WidgetType = 'chart' | 'kpi' | 'table' | 'text' | 'stats' | 'image' | 'iframe';

// ===========================================
// WIDGET CONFIG TYPES
// ===========================================

export interface TextWidgetConfig {
    content: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
}

export interface ImageWidgetConfig {
    url: string;
    alt?: string;
    title?: string;
    objectFit?: 'contain' | 'cover' | 'fill';
}

export interface IframeWidgetConfig {
    url: string;
    title?: string;
    allowFullscreen?: boolean;
}

export interface KPIWidgetConfig {
    title: string;
    value: number | string;
    format?: 'number' | 'currency' | 'percent';
    color?: string;
    icon?: string;
}

export interface StatsWidgetConfig {
    title: string;
    value: number | string;
    trend?: string;
    trendUp?: boolean;
    color?: string;
}

export interface TableWidgetConfig {
    title: string;
    table?: string;
    columns?: string[];
    pageSize?: number;
    showPagination?: boolean;
}

// Union type for all widget configs
export type WidgetConfig = 
    | ChartConfig 
    | TextWidgetConfig 
    | ImageWidgetConfig 
    | IframeWidgetConfig 
    | KPIWidgetConfig 
    | StatsWidgetConfig 
    | TableWidgetConfig;

// ===========================================
// WIDGET INTERFACE
// ===========================================

export interface Widget {
    id: string;
    type: WidgetType;
    config: WidgetConfig;
    layout: LayoutItem;
}

// ===========================================
// TYPE GUARDS
// ===========================================

export function isChartConfig(config: WidgetConfig): config is ChartConfig {
    return 'type' in config && 'dataSource' in config;
}

export function isTextConfig(config: WidgetConfig): config is TextWidgetConfig {
    return 'content' in config && !('url' in config);
}

export function isImageConfig(config: WidgetConfig): config is ImageWidgetConfig {
    return 'url' in config && 'objectFit' in config;
}

export function isIframeConfig(config: WidgetConfig): config is IframeWidgetConfig {
    return 'url' in config && 'allowFullscreen' in config;
}

export function isKPIConfig(config: WidgetConfig): config is KPIWidgetConfig {
    return 'title' in config && 'value' in config && !('trend' in config);
}

export function isStatsConfig(config: WidgetConfig): config is StatsWidgetConfig {
    return 'title' in config && 'value' in config && 'trend' in config;
}

export function isTableConfig(config: WidgetConfig): config is TableWidgetConfig {
    return 'title' in config && ('columns' in config || 'table' in config);
}

// ===========================================
// SIZE PRESETS
// ===========================================

export const WIDGET_SIZE_PRESETS = {
    small: { w: 3, h: 3, label: "Nhỏ" },
    medium: { w: 6, h: 4, label: "Vừa" },
    large: { w: 9, h: 5, label: "Lớn" },
    full: { w: 12, h: 6, label: "Toàn bộ" },
} as const;

export type WidgetSizePreset = keyof typeof WIDGET_SIZE_PRESETS;

// ===========================================
// GRID CONSTANTS
// ===========================================

export const GRID_CONSTANTS = {
    COLS: 12,
    CELL_HEIGHT: 60,
    GAP: 16,
    MIN_WIDTH: 2,
    MIN_HEIGHT: 2,
} as const;
