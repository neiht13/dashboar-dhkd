"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    AlertCircle,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    forecast,
    calculateConfidenceInterval,
    type DataPoint,
    type ForecastResult,
} from "@/lib/statistics";

export interface ForecastConfig {
    enabled: boolean;
    periods: number;
    method: "linear" | "exponential" | "moving_average";
    showConfidenceInterval: boolean;
    alpha?: number;
    window?: number;
}

interface ChartForecastProps {
    data: DataPoint[];
    config: ForecastConfig;
    onConfigChange: (config: ForecastConfig) => void;
    className?: string;
}

export function ChartForecastSettings({
    data,
    config,
    onConfigChange,
    className,
}: ChartForecastProps) {
    const [isOpen, setIsOpen] = useState(false);

    const forecastResult = useMemo(() => {
        if (!config.enabled || data.length < 3) return null;
        return forecast(data, {
            periods: config.periods,
            method: config.method,
            alpha: config.alpha,
            window: config.window,
        });
    }, [data, config]);

    const updateConfig = (updates: Partial<ForecastConfig>) => {
        onConfigChange({ ...config, ...updates });
    };

    const getTrendIcon = (trend: "up" | "down" | "stable") => {
        switch (trend) {
            case "up":
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case "down":
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getTrendLabel = (trend: "up" | "down" | "stable") => {
        switch (trend) {
            case "up":
                return "Xu hướng tăng";
            case "down":
                return "Xu hướng giảm";
            default:
                return "Ổn định";
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "linear":
                return "Hồi quy tuyến tính";
            case "exponential":
                return "Làm mượt mũ";
            case "moving_average":
                return "Trung bình động";
            default:
                return method;
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={config.enabled}
                        onCheckedChange={(enabled) => updateConfig({ enabled })}
                        id="forecast-toggle"
                    />
                    <Label htmlFor="forecast-toggle" className="text-sm font-medium">
                        Dự báo
                    </Label>
                    {config.enabled && forecastResult && (
                        <div className="flex items-center gap-1">
                            {getTrendIcon(forecastResult.trend)}
                            <Badge variant="secondary" className="text-xs">
                                {Math.round(forecastResult.confidence * 100)}% tin cậy
                            </Badge>
                        </div>
                    )}
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform",
                                isOpen && "rotate-180"
                            )}
                        />
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-4 space-y-4">
                {data.length < 3 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Cần ít nhất 3 điểm dữ liệu để dự báo
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Phương pháp dự báo</Label>
                    <Select
                        value={config.method}
                        onValueChange={(method) =>
                            updateConfig({ method: method as ForecastConfig["method"] })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="linear">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Hồi quy tuyến tính
                                </div>
                            </SelectItem>
                            <SelectItem value="exponential">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📈</span>
                                    Làm mượt mũ
                                </div>
                            </SelectItem>
                            <SelectItem value="moving_average">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📊</span>
                                    Trung bình động
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Số kỳ dự báo: {config.periods}</Label>
                    <Slider
                        value={[config.periods]}
                        min={1}
                        max={12}
                        step={1}
                        onValueChange={([periods]) => updateConfig({ periods })}
                    />
                </div>

                {config.method === "exponential" && (
                    <div className="space-y-2">
                        <Label>
                            Hệ số làm mượt (α): {(config.alpha || 0.3).toFixed(2)}
                        </Label>
                        <Slider
                            value={[(config.alpha || 0.3) * 100]}
                            min={10}
                            max={90}
                            step={5}
                            onValueChange={([value]) => updateConfig({ alpha: value / 100 })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Giá trị cao hơn = phản ứng nhanh hơn với thay đổi gần đây
                        </p>
                    </div>
                )}

                {config.method === "moving_average" && (
                    <div className="space-y-2">
                        <Label>Kích thước cửa sổ: {config.window || 3}</Label>
                        <Slider
                            value={[config.window || 3]}
                            min={2}
                            max={Math.min(10, data.length)}
                            step={1}
                            onValueChange={([window]) => updateConfig({ window })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Số điểm dữ liệu dùng để tính trung bình
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={config.showConfidenceInterval}
                            onCheckedChange={(showConfidenceInterval) =>
                                updateConfig({ showConfidenceInterval })
                            }
                            id="confidence-interval-toggle"
                        />
                        <Label htmlFor="confidence-interval-toggle" className="text-sm">
                            Hiển thị khoảng tin cậy
                        </Label>
                    </div>
                </div>

                {forecastResult && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Xu hướng:</span>
                            <div className="flex items-center gap-1">
                                {getTrendIcon(forecastResult.trend)}
                                <span>{getTrendLabel(forecastResult.trend)}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Độ tin cậy:</span>
                            <Badge
                                variant={
                                    forecastResult.confidence > 0.7
                                        ? "default"
                                        : forecastResult.confidence > 0.4
                                            ? "secondary"
                                            : "destructive"
                                }
                            >
                                {Math.round(forecastResult.confidence * 100)}%
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Phương pháp:</span>
                            <span>{getMethodLabel(forecastResult.method)}</span>
                        </div>
                        {forecastResult.predictions.length > 0 && (
                            <div className="pt-2 border-t">
                                <span className="text-xs text-muted-foreground">
                                    Giá trị dự báo tiếp theo:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {forecastResult.predictions.slice(0, 3).map((p, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                            {typeof p.y === "number" ? p.y.toLocaleString("vi-VN", {
                                                maximumFractionDigits: 1,
                                            }) : p.y}
                                        </Badge>
                                    ))}
                                    {forecastResult.predictions.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{forecastResult.predictions.length - 3} nữa
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * Hook to generate forecast data for charts
 */
export function useForecastData(
    data: DataPoint[],
    config: ForecastConfig
): {
    forecastData: DataPoint[];
    confidenceIntervals: Array<{ lower: number; upper: number }> | null;
    result: ForecastResult | null;
} {
    return useMemo(() => {
        if (!config.enabled || data.length < 3) {
            return { forecastData: [], confidenceIntervals: null, result: null };
        }

        const result = forecast(data, {
            periods: config.periods,
            method: config.method,
            alpha: config.alpha,
            window: config.window,
        });

        const confidenceIntervals = config.showConfidenceInterval
            ? calculateConfidenceInterval(data, result.predictions)
            : null;

        return {
            forecastData: result.predictions,
            confidenceIntervals,
            result,
        };
    }, [data, config]);
}

/**
 * Generate forecast line and area props for Recharts
 */
export function getForecastRechartsProps(
    forecastData: DataPoint[],
    confidenceIntervals: Array<{ lower: number; upper: number }> | null,
    color: string = "#8b5cf6"
): {
    forecastLineData: Array<{ x: string; forecast: number }>;
    confidenceAreaData: Array<{ x: string; lower: number; upper: number }>;
    lineProps: { dataKey: string; stroke: string; strokeDasharray: string };
    areaProps: { dataKey: string; fill: string; fillOpacity: number; stroke: string };
} {
    const forecastLineData = forecastData.map((p) => ({
        x: String(p.x),
        forecast: p.y,
    }));

    const confidenceAreaData = confidenceIntervals
        ? forecastData.map((p, i) => ({
            x: String(p.x),
            lower: confidenceIntervals[i].lower,
            upper: confidenceIntervals[i].upper,
        }))
        : [];

    return {
        forecastLineData,
        confidenceAreaData,
        lineProps: {
            dataKey: "forecast",
            stroke: color,
            strokeDasharray: "5 5",
        },
        areaProps: {
            dataKey: "confidence",
            fill: color,
            fillOpacity: 0.1,
            stroke: "none",
        },
    };
}

export default ChartForecastSettings;
