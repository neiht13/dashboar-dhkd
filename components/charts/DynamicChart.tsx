"use client";

import React from "react";
import type { ChartConfig } from "@/types";
import { processChartData } from "@/lib/chart-data-utils";
import {
    extractStyleProps,
    filterDataByXAxisExclude,
    formatDataLabel as formatDataLabelUtil,
} from "@/components/charts/utils/chart-utils";
import { getChartRenderer } from "@/components/charts/registry/chart-registry";

interface DynamicChartProps {
    config: ChartConfig;
    data: Record<string, unknown>[];
    width?: number | string;
    height?: number | string;
    // Drill-down & Cross-filter support
    onDataPointClick?: (data: Record<string, unknown>, field?: string) => void;
    enableDrillDown?: boolean;
    onDrillDown?: (filters: Array<{ field: string; operator: string; value: string | number }>) => Promise<unknown>;
    enableCrossFilter?: boolean;
    chartId?: string;
}

export function DynamicChart({
    config,
    data,
    width = "100%",
    height = "100%",
    onDataPointClick,
}: DynamicChartProps) {
    const chartHeight = typeof height === "number" ? Math.max(200, height) : height;
    const dataSource = config.dataSource;

    const xAxisKey = dataSource?.xAxis || "name";
    const yAxisKeys = dataSource?.yAxis || ["value"];

    const styleProps = React.useMemo(
        () => extractStyleProps(config.style, config.colors),
        [config.style, config.colors]
    );

    const yAxisFieldLabels = React.useMemo(
        () => config.style?.yAxisFieldLabels || {},
        [config.style?.yAxisFieldLabels]
    );

    const yAxisFieldColors = React.useMemo(
        () => config.style?.yAxisFieldColors || {},
        [config.style?.yAxisFieldColors]
    );

    const processedData = React.useMemo(() => {
        return processChartData(data, {
            xAxis: dataSource?.xAxis,
            yAxis: dataSource?.yAxis || [],
            aggregation: dataSource?.aggregation,
            groupBy: dataSource?.groupBy,
            orderBy: dataSource?.orderBy,
            orderDirection: dataSource?.orderDirection,
            limit: dataSource?.limit,
            drillDownLabelField: dataSource?.drillDownLabelField,
        });
    }, [
        data,
        dataSource?.xAxis,
        dataSource?.yAxis,
        dataSource?.aggregation,
        dataSource?.groupBy,
        dataSource?.orderBy,
        dataSource?.orderDirection,
        dataSource?.limit,
        dataSource?.drillDownLabelField,
    ]);

    const filteredData = React.useMemo(() => {
        const xAxisExclude = config.style?.xAxisExclude || [];
        return filterDataByXAxisExclude(processedData, xAxisKey, xAxisExclude);
    }, [processedData, config.style?.xAxisExclude, xAxisKey]);

    const formatDataLabel = React.useCallback(
        (value: number | string) => formatDataLabelUtil(value, styleProps.dataLabelFormat),
        [styleProps.dataLabelFormat]
    );

    const Renderer = React.useMemo(() => getChartRenderer(config.type), [config.type]);

    const handleDataPointClick = React.useCallback(
        (payload: Record<string, unknown>, field?: string) => {
            onDataPointClick?.(payload, field || xAxisKey);
        },
        [onDataPointClick, xAxisKey]
    );

    return (
        <div className="w-full h-full animate-fade-in relative">
            <Renderer
                config={config}
                data={filteredData}
                width={width}
                height={chartHeight}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                formatDataLabel={formatDataLabel}
                onDataPointClick={onDataPointClick ? handleDataPointClick : undefined}
            />
        </div>
    );
}
