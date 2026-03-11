"use client";

import React from "react";
import { UnitTileGrid } from "@/components/charts/UnitTileGrid";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function DataTileGridRenderer({ config, data, xAxisKey, yAxisKeys }: ChartRendererProps) {
    return (
        <div className="h-full overflow-auto custom-scrollbar">
            <UnitTileGrid
                data={data}
                labelField={xAxisKey}
                valueField={config.style?.tileActualField || yAxisKeys[0] || "value"}
                targetField={config.style?.tileTargetField}
                actualField={config.style?.tileActualField}
                columns={config.style?.tileGridColumns || 4}
                className="p-1"
            />
        </div>
    );
}
