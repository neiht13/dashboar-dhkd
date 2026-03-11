"use client";

import dynamic from "next/dynamic";
import type { ChartType } from "@/types";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { CartesianChartRenderer } from "@/components/charts/renderers/CartesianChartRenderer";
import { PieChartRenderer } from "@/components/charts/renderers/PieChartRenderer";
import { FunnelChartRenderer } from "@/components/charts/renderers/FunnelChartRenderer";
import { CardChartRenderer } from "@/components/charts/renderers/CardChartRenderer";
import { DataTileGridRenderer } from "@/components/charts/renderers/DataTileGridRenderer";
import { HexagonChartRenderer } from "@/components/charts/renderers/HexagonChartRenderer";
import { GaugeChartRenderer } from "@/components/charts/renderers/GaugeChartRenderer";
import { SemiCircleGaugeChartRenderer } from "@/components/charts/renderers/SemiCircleGaugeChartRenderer";
import { WaterfallChartRenderer } from "@/components/charts/renderers/WaterfallChartRenderer";
import type { ChartRendererComponent, ChartRendererProps } from "@/components/charts/registry/types";

const MapChartRenderer = dynamic(
    () => import("@/components/charts/renderers/MapChartRenderer").then((mod) => ({ default: mod.MapChartRenderer })),
    {
        ssr: false,
        loading: () => <ChartSkeleton />,
    }
) as ChartRendererComponent;

const NetworkMapChartRenderer = dynamic(
    () => import("@/components/charts/renderers/NetworkMapChartRenderer").then((mod) => ({ default: mod.NetworkMapChartRenderer })),
    {
        ssr: false,
        loading: () => <ChartSkeleton />,
    }
) as ChartRendererComponent;

const TreemapChartRenderer = dynamic(
    () => import("@/components/charts/renderers/TreemapChartRenderer").then((mod) => ({ default: mod.TreemapChartRenderer })),
    {
        ssr: false,
        loading: () => <ChartSkeleton />,
    }
) as ChartRendererComponent;

const chartRegistry: Partial<Record<ChartType, ChartRendererComponent>> = {
    line: CartesianChartRenderer,
    bar: CartesianChartRenderer,
    area: CartesianChartRenderer,
    stackedBar: CartesianChartRenderer,
    horizontalBar: CartesianChartRenderer,
    radar: CartesianChartRenderer,
    scatter: CartesianChartRenderer,
    composed: CartesianChartRenderer,

    pie: PieChartRenderer,
    donut: PieChartRenderer,
    sizedPie: PieChartRenderer,

    funnel: FunnelChartRenderer,

    card: CardChartRenderer,
    statCard: CardChartRenderer,
    dataTileGrid: DataTileGridRenderer,
    hexagon: HexagonChartRenderer,
    gauge: GaugeChartRenderer,
    semicircleGauge: SemiCircleGaugeChartRenderer,
    waterfall: WaterfallChartRenderer,

    map: MapChartRenderer,
    networkMap: NetworkMapChartRenderer,
    treemap: TreemapChartRenderer,
};

function UnsupportedChartRenderer({ config }: ChartRendererProps) {
    return (
        <div className="flex items-center justify-center h-full text-[#64748B]">
            Loại biểu đồ không được hỗ trợ: {config.type}
        </div>
    );
}

export function getChartRenderer(type: ChartType): ChartRendererComponent {
    return chartRegistry[type] || UnsupportedChartRenderer;
}

export function getRegisteredChartTypes(): ChartType[] {
    return Object.keys(chartRegistry) as ChartType[];
}
