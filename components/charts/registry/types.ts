"use client";

import type React from "react";
import type { ChartConfig } from "@/types";
import type { ChartStyleProps } from "@/types/chart";

export interface ChartRendererProps {
    config: ChartConfig;
    data: Record<string, unknown>[];
    width?: number | string;
    height?: number | string;
    xAxisKey: string;
    yAxisKeys: string[];
    styleProps: ChartStyleProps;
    yAxisFieldLabels: Record<string, string>;
    yAxisFieldColors: Record<string, string>;
    formatDataLabel: (value: number | string) => string;
    onDataPointClick?: (data: Record<string, unknown>, field?: string) => void;
}

export type ChartRendererComponent = React.ComponentType<ChartRendererProps>;
