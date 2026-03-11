"use client";

import React from "react";
import { NetworkCoverageMap } from "@/components/charts/NetworkCoverageMap";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function NetworkMapChartRenderer({ config, data, height }: ChartRendererProps) {
    const networkData =
        (config as { networkData?: unknown[] }).networkData ||
        (config.dataSource as { networkData?: unknown[] } | undefined)?.networkData ||
        data;

    return (
        <NetworkCoverageMap
            stations={Array.isArray(networkData) ? (networkData as never[]) : []}
            height={typeof height === "number" ? height : 500}
            enableLayers={config.style?.networkMapLayers !== undefined}
            enableClustering={config.style?.enableBTSClustering !== false}
        />
    );
}
