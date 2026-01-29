"use client";

import React, { useState, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TreemapDataPoint {
    name: string;
    value: number;
    children?: TreemapDataPoint[];
    color?: string;
    category?: string;
}

interface TreemapChartProps {
    data: TreemapDataPoint[];
    colors?: string[];
    showLabels?: boolean;
    showTooltip?: boolean;
    animated?: boolean;
    className?: string;
    height?: number | string;
    enableDrillDown?: boolean;
    valueFormatter?: (value: number) => string;
    labelKey?: "name" | "value" | "both";
}

const DEFAULT_COLORS = [
    "#8b5cf6", // Purple
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
];

// Custom content renderer for treemap cells
const CustomizedContent = ({
    x,
    y,
    width,
    height,
    index,
    depth,
    name,
    value,
    colors,
    showLabels,
    labelKey,
    valueFormatter,
    currentData,
    onDrillDown,
}: any) => {
    // Only render at depth 1 (immediate children of root)
    if (depth !== 1) return null;

    const color = colors[index % colors.length];
    const isSmall = width < 60 || height < 40;
    const isTiny = width < 40 || height < 25;

    const displayValue = valueFormatter
        ? valueFormatter(value)
        : value?.toLocaleString("vi-VN");

    const hasChildren = currentData && currentData[index]?.children?.length > 0;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
                rx={4}
                className={cn(
                    "transition-all duration-200",
                    hasChildren && "cursor-pointer hover:opacity-80"
                )}
                onClick={() => hasChildren && currentData && onDrillDown?.(currentData[index])}
            />
            {showLabels && !isTiny && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - (labelKey === "both" && !isSmall ? 8 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fff"
                        fontSize={isSmall ? 10 : 12}
                        fontWeight={500}
                        style={{
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            pointerEvents: "none",
                        }}
                    >
                        {name}
                    </text>
                    {labelKey === "both" && !isSmall && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 12}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.85)"
                            fontSize={10}
                            style={{
                                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                                pointerEvents: "none",
                            }}
                        >
                            {displayValue}
                        </text>
                    )}
                    {hasChildren && !isSmall && (
                        <text
                            x={x + width - 12}
                            y={y + 12}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.7)"
                            fontSize={10}
                        >
                            ▶
                        </text>
                    )}
                </>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload, valueFormatter }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const displayValue = valueFormatter
            ? valueFormatter(data.value)
            : data.value?.toLocaleString("vi-VN");

        return (
            <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[150px]">
                <p className="font-medium text-sm mb-1">{data.name}</p>
                <p className="text-muted-foreground text-sm">
                    Giá trị: <span className="font-medium text-foreground">
                        {displayValue}
                    </span>
                </p>
                {data.children && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Click để xem chi tiết
                    </p>
                )}
            </div>
        );
    }
    return null;
};

export function TreemapChartComponent({
    data,
    colors = DEFAULT_COLORS,
    showLabels = true,
    showTooltip = true,
    animated = true,
    className,
    height = 400,
    enableDrillDown = true,
    valueFormatter,
    labelKey = "both",
}: TreemapChartProps) {
    const [drillPath, setDrillPath] = useState<string[]>([]);
    const [currentData, setCurrentData] = useState(data);

    // Handle drill down into children
    const handleDrillDown = useCallback((item: TreemapDataPoint) => {
        if (item.children && item.children.length > 0 && enableDrillDown) {
            setDrillPath(prev => [...prev, item.name]);
            setCurrentData(item.children);
        }
    }, [enableDrillDown]);

    // Handle drill up
    const handleDrillUp = useCallback(() => {
        if (drillPath.length === 0) return;

        if (drillPath.length === 1) {
            setDrillPath([]);
            setCurrentData(data);
            return;
        }

        // Navigate back through the path
        let targetData = data;
        const newPath = drillPath.slice(0, -1);

        for (const pathItem of newPath) {
            const found = targetData.find(d => d.name === pathItem);
            if (found?.children) {
                targetData = found.children;
            }
        }

        setDrillPath(newPath);
        setCurrentData(targetData);
    }, [drillPath, data]);

    // Prepare data for Recharts treemap
    const treemapData = [{
        name: "root",
        children: currentData.map((item, index) => ({
            ...item,
            color: item.color || colors[index % colors.length],
        })),
    }];

    return (
        <div className={cn("w-full", className)}>
            {/* Breadcrumb navigation */}
            {enableDrillDown && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDrillUp}
                        disabled={drillPath.length === 0}
                        className="h-7 px-2"
                    >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Quay lại
                    </Button>
                    <div className="flex items-center text-muted-foreground">
                        <span
                            className="cursor-pointer hover:text-foreground"
                            onClick={() => {
                                setDrillPath([]);
                                setCurrentData(data);
                            }}
                        >
                            Tổng quan
                        </span>
                        {drillPath.map((path, index) => (
                            <React.Fragment key={index}>
                                <ChevronRight className="h-3 w-3 mx-1" />
                                <span className={cn(
                                    index === drillPath.length - 1
                                        ? "text-foreground font-medium"
                                        : "cursor-pointer hover:text-foreground"
                                )}>
                                    {path}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            <ResponsiveContainer width="100%" height={height}>
                <Treemap
                    data={treemapData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    isAnimationActive={animated}
                    animationDuration={400}
                    content={
                        <CustomizedContent
                            colors={colors}
                            showLabels={showLabels}
                            labelKey={labelKey}
                            valueFormatter={valueFormatter}
                            currentData={currentData}
                            onDrillDown={handleDrillDown}
                        />
                    }
                >
                    {showTooltip && (
                        <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
                    )}
                </Treemap>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {currentData.slice(0, 8).map((item, index) => (
                    <div
                        key={item.name}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80"
                        onClick={() => item.children && handleDrillDown(item)}
                    >
                        <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: item.color || colors[index % colors.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TreemapChartComponent;
