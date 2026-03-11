"use client";

import React from "react";
import {
    AreaChartComponent,
    BarChartComponent,
    ComposedChartComponent,
    LineChartComponent,
    RadarChartComponent,
    ScatterChartComponent,
} from "@/components/charts/types";
import type { ChartType } from "@/types";
import type { ChartRendererProps } from "@/components/charts/registry/types";

function buildChartClickHandler(
    onDataPointClick: ChartRendererProps["onDataPointClick"],
    xAxisKey: string
) {
    return (payload: Record<string, unknown>) => {
        onDataPointClick?.(payload, xAxisKey);
    };
}

export function CartesianChartRenderer(props: ChartRendererProps) {
    const {
        config,
        data,
        width,
        height,
        xAxisKey,
        yAxisKeys,
        styleProps,
        yAxisFieldLabels,
        yAxisFieldColors,
        onDataPointClick,
    } = props;

    const type = config.type as ChartType;
    const onChartClick = React.useMemo(
        () => buildChartClickHandler(onDataPointClick, xAxisKey),
        [onDataPointClick, xAxisKey]
    );

    if (type === "line") {
        return (
            <LineChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "bar") {
        return (
            <BarChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "stackedBar") {
        return (
            <BarChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                stacked
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "horizontalBar") {
        return (
            <BarChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                horizontal
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "area") {
        return (
            <AreaChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "radar") {
        return (
            <RadarChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "scatter") {
        return (
            <ScatterChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    if (type === "composed") {
        const style = config.style;
        return (
            <ComposedChartComponent
                data={data}
                config={config}
                width={width}
                height={height}
                xAxisKey={xAxisKey}
                yAxisKeys={yAxisKeys}
                styleProps={styleProps}
                yAxisFieldLabels={yAxisFieldLabels}
                yAxisFieldColors={yAxisFieldColors}
                composedFieldTypes={style?.composedFieldTypes}
                secondaryYAxis={style?.secondaryYAxis}
                secondaryYAxisLabel={style?.secondaryYAxisLabel}
                secondaryYAxisFields={style?.secondaryYAxisFields}
                zoomSlider={style?.zoomSlider}
                showMarkers={style?.showMarkers}
                markerSize={style?.markerSize}
                shadeArea={style?.shadeArea}
                shadeAreaOpacity={style?.shadeAreaOpacity}
                plotAreaBackground={style?.plotAreaBackground}
                onChartClick={onDataPointClick ? onChartClick : undefined}
            />
        );
    }

    return null;
}
