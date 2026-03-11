"use client";

import React from "react";
import { MapChart } from "@/components/charts/MapChart.lazy";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function MapChartRenderer({ config, data, width, height }: ChartRendererProps) {
    return <MapChart data={data} config={config} width={width} height={height} />;
}
