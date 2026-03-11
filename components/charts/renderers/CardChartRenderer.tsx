"use client";

import React from "react";
import { CardChartComponent } from "@/components/charts/types";
import { StatCard } from "@/components/charts/StatCard";
import { VI_CHART_LABELS } from "@/types/chart";
import type { ChartRendererProps } from "@/components/charts/registry/types";

export function CardChartRenderer({
    config,
    data,
    yAxisKeys,
    styleProps,
    formatDataLabel,
}: ChartRendererProps) {
    const style = config.style;

    if (config.type === "statCard") {
        const metrics = (config.dataSource as { metrics?: unknown[] } | undefined)?.metrics;
        return (
            <StatCard
                title={style?.title || config.name}
                icon={style?.cardIcon}
                metrics={Array.isArray(metrics) ? metrics : undefined}
                data={data}
                dataSource={config.dataSource}
                backgroundColor={style?.cardBackgroundColor || "#ffffff"}
                accentColor={styleProps.colors[0] || "#0066FF"}
                layout={(style as { cardLayout?: "list" | "grid" | "kpi" } | undefined)?.cardLayout || "kpi"}
                showGauge={Boolean((style as { showGauge?: boolean } | undefined)?.showGauge)}
                gaugeValue={(style as { gaugeValue?: number } | undefined)?.gaugeValue}
                planValue={(style as { kpiPlanValue?: number } | undefined)?.kpiPlanValue}
                threshold={(style as { kpiThreshold?: number } | undefined)?.kpiThreshold || 100}
                showCornerAccent={Boolean((style as { showCornerAccent?: boolean } | undefined)?.showCornerAccent)}
                showStatusBadge={Boolean((style as { showStatusBadge?: boolean } | undefined)?.showStatusBadge)}
            />
        );
    }

    const valueKey = yAxisKeys[0] || "value";
    return (
        <CardChartComponent
            data={data}
            valueKey={valueKey}
            style={style}
            formatValue={(value) => formatDataLabel(value)}
            getFieldLabel={(field) => (style?.yAxisFieldLabels?.[field] || VI_CHART_LABELS[field] || field)}
        />
    );
}
