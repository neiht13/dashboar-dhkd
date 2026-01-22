"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { ChartType } from '@/types';

interface ChartSkeletonProps {
    type?: ChartType;
    className?: string;
}

export function ChartSkeleton({ type = 'bar', className }: ChartSkeletonProps) {
    const renderSkeleton = () => {
        switch (type) {
            case 'line':
            case 'area':
                return <LineSkeleton />;
            case 'bar':
            case 'stackedBar':
            case 'horizontalBar':
                return <BarSkeleton horizontal={type === 'horizontalBar'} />;
            case 'pie':
            case 'donut':
                return <PieSkeleton donut={type === 'donut'} />;
            case 'card':
                return <CardSkeleton />;
            case 'radar':
                return <RadarSkeleton />;
            default:
                return <BarSkeleton />;
        }
    };

    return (
        <div className={cn(
            "w-full h-full flex items-center justify-center animate-pulse",
            className
        )}>
            {renderSkeleton()}
        </div>
    );
}

function LineSkeleton() {
    return (
        <div className="w-full h-full p-4 flex flex-col">
            {/* Title */}
            <div className="h-4 w-1/3 bg-muted rounded mb-4" />

            {/* Chart area */}
            <div className="flex-1 flex items-end gap-1 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-3 w-6 bg-muted rounded" />
                    ))}
                </div>

                {/* Line path simulation */}
                <svg className="w-full h-full ml-10" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <path
                        d="M0,40 Q10,35 20,38 T40,25 T60,30 T80,15 T100,20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-muted"
                    />
                </svg>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-10 right-0 flex justify-between">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-3 w-8 bg-muted rounded" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function BarSkeleton({ horizontal = false }: { horizontal?: boolean }) {
    const bars = 6;
    const heights = [60, 80, 45, 90, 70, 55];

    return (
        <div className="w-full h-full p-4 flex flex-col">
            {/* Title */}
            <div className="h-4 w-1/3 bg-muted rounded mb-4" />

            {/* Chart area */}
            <div className={cn(
                "flex-1 flex gap-2",
                horizontal ? "flex-col justify-around" : "items-end justify-around"
            )}>
                {[...Array(bars)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "bg-muted rounded",
                            horizontal ? "h-6" : "w-8"
                        )}
                        style={horizontal
                            ? { width: `${heights[i]}%` }
                            : { height: `${heights[i]}%` }
                        }
                    />
                ))}
            </div>

            {/* X-axis labels */}
            <div className={cn(
                "flex mt-2",
                horizontal ? "flex-col gap-2" : "justify-around"
            )}>
                {[...Array(bars)].map((_, i) => (
                    <div key={i} className="h-3 w-8 bg-muted rounded" />
                ))}
            </div>
        </div>
    );
}

function PieSkeleton({ donut = false }: { donut?: boolean }) {
    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative">
                {/* Pie/Donut circle */}
                <div
                    className={cn(
                        "w-32 h-32 rounded-full bg-muted",
                        donut && "border-8 border-background"
                    )}
                />

                {/* Donut center */}
                {donut && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-background" />
                    </div>
                )}

                {/* Legend */}
                <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-muted rounded" />
                            <div className="w-12 h-3 bg-muted rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="w-full h-full p-4 flex flex-col justify-center items-center gap-2">
            {/* Icon */}
            <div className="w-10 h-10 bg-muted rounded-lg" />

            {/* Value */}
            <div className="h-8 w-24 bg-muted rounded" />

            {/* Label */}
            <div className="h-4 w-16 bg-muted rounded" />

            {/* Trend */}
            <div className="h-3 w-12 bg-muted rounded" />
        </div>
    );
}

function RadarSkeleton() {
    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative w-40 h-40">
                {/* Hexagon layers */}
                {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                    <div
                        key={i}
                        className="absolute inset-0 border border-muted rounded-full"
                        style={{ transform: `scale(${scale})` }}
                    />
                ))}

                {/* Center point */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-muted rounded-full" />

                {/* Axis lines */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-0.5 h-20 bg-muted origin-bottom"
                        style={{ transform: `translateX(-50%) rotate(${i * 60}deg)` }}
                    />
                ))}
            </div>
        </div>
    );
}

export default ChartSkeleton;
