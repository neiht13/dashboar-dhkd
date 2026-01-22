"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronLeft, 
    ChevronDown, 
    Home,
    Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrillLevel {
    field: string;
    value: string;
    label?: string;
}

export interface DrillDownConfig {
    hierarchy: string[]; // Field hierarchy: ['region', 'province', 'district', 'commune']
    labels?: Record<string, string>; // Field labels
    maxDepth?: number;
}

interface DrillDownChartProps {
    config: DrillDownConfig;
    currentLevel: number;
    drillPath: DrillLevel[];
    onDrillDown: (field: string, value: string) => void;
    onDrillUp: (toLevel?: number) => void;
    onReset: () => void;
    children: React.ReactNode;
    className?: string;
}

export function DrillDownChart({
    config,
    currentLevel,
    drillPath,
    onDrillDown,
    onDrillUp,
    onReset,
    children,
    className,
}: DrillDownChartProps) {
    const { hierarchy, labels = {}, maxDepth } = config;
    const canDrillDown = currentLevel < (maxDepth ?? hierarchy.length - 1);
    const canDrillUp = currentLevel > 0;

    const getFieldLabel = (field: string) => labels[field] || field;
    const getCurrentField = () => hierarchy[currentLevel];
    const getNextField = () => hierarchy[currentLevel + 1];

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Breadcrumb Navigation */}
            {drillPath.length > 0 && (
                <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30 flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={onReset}
                    >
                        <Home className="h-3.5 w-3.5" />
                    </Button>

                    {drillPath.map((level, index) => (
                        <React.Fragment key={index}>
                            <ChevronDown className="h-3 w-3 text-muted-foreground -rotate-90" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => onDrillUp(index)}
                            >
                                <span className="text-xs text-muted-foreground mr-1">
                                    {getFieldLabel(level.field)}:
                                </span>
                                <span className="font-medium">{level.label || level.value}</span>
                            </Button>
                        </React.Fragment>
                    ))}

                    <ChevronDown className="h-3 w-3 text-muted-foreground -rotate-90" />
                    <Badge variant="secondary" className="text-xs">
                        {getFieldLabel(getCurrentField())}
                    </Badge>
                </div>
            )}

            {/* Drill Level Indicator */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2 text-sm">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cấp độ:</span>
                    <span className="font-medium">{getFieldLabel(getCurrentField())}</span>
                    {canDrillDown && (
                        <span className="text-xs text-muted-foreground">
                            (Click để xem chi tiết {getFieldLabel(getNextField())})
                        </span>
                    )}
                </div>

                {canDrillUp && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDrillUp()}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Quay lại
                    </Button>
                )}
            </div>

            {/* Chart Content */}
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );
}

// Hook for managing drill-down state
export function useDrillDown(config: DrillDownConfig) {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [drillPath, setDrillPath] = useState<DrillLevel[]>([]);

    const drillDown = useCallback((value: string, label?: string) => {
        const field = config.hierarchy[currentLevel];
        const maxDepth = config.maxDepth ?? config.hierarchy.length - 1;

        if (currentLevel < maxDepth) {
            setDrillPath((prev) => [...prev, { field, value, label }]);
            setCurrentLevel((prev) => prev + 1);
        }
    }, [currentLevel, config]);

    const drillUp = useCallback((toLevel?: number) => {
        if (toLevel !== undefined) {
            setDrillPath((prev) => prev.slice(0, toLevel));
            setCurrentLevel(toLevel);
        } else if (currentLevel > 0) {
            setDrillPath((prev) => prev.slice(0, -1));
            setCurrentLevel((prev) => prev - 1);
        }
    }, [currentLevel]);

    const reset = useCallback(() => {
        setDrillPath([]);
        setCurrentLevel(0);
    }, []);

    const getCurrentFilters = useCallback(() => {
        return drillPath.map((level) => ({
            field: level.field,
            operator: '=',
            value: level.value,
        }));
    }, [drillPath]);

    const getCurrentField = useCallback(() => {
        return config.hierarchy[currentLevel];
    }, [config.hierarchy, currentLevel]);

    return {
        currentLevel,
        drillPath,
        drillDown,
        drillUp,
        reset,
        getCurrentFilters,
        getCurrentField,
        canDrillDown: currentLevel < (config.maxDepth ?? config.hierarchy.length - 1),
        canDrillUp: currentLevel > 0,
    };
}

// Example: Wrapper component that makes any chart drill-down capable
export function withDrillDown<P extends object>(
    WrappedChart: React.ComponentType<P>,
    drillConfig: DrillDownConfig
) {
    return function DrillDownWrapper(props: P & { 
        onDataPointClick?: (data: Record<string, unknown>) => void;
        groupByField?: string;
    }) {
        const {
            currentLevel,
            drillPath,
            drillDown,
            drillUp,
            reset,
            getCurrentField,
        } = useDrillDown(drillConfig);

        const handleDataPointClick = (data: Record<string, unknown>) => {
            const field = getCurrentField();
            const value = data[field];
            if (value !== undefined) {
                drillDown(String(value), data.name as string);
            }
        };

        return (
            <DrillDownChart
                config={drillConfig}
                currentLevel={currentLevel}
                drillPath={drillPath}
                onDrillDown={drillDown}
                onDrillUp={drillUp}
                onReset={reset}
            >
                <WrappedChart
                    {...props}
                    groupByField={getCurrentField()}
                    onDataPointClick={handleDataPointClick}
                />
            </DrillDownChart>
        );
    };
}
