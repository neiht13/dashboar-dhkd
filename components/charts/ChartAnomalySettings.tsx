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
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    AlertTriangle,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    detectAnomalies,
    type AnomalyResult,
    type AnomalyMethod,
    getAnomalyColor,
} from "@/lib/anomaly-detection";

export interface AnomalyConfig {
    enabled: boolean;
    method: AnomalyMethod;
    threshold: number;
    lowerThreshold?: number;
    upperThreshold?: number;
    highlightColor?: string;
}

interface ChartAnomalySettingsProps {
    data: number[];
    config: AnomalyConfig;
    onConfigChange: (config: AnomalyConfig) => void;
    className?: string;
}

export function ChartAnomalySettings({
    data,
    config,
    onConfigChange,
    className,
}: ChartAnomalySettingsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const anomalyResult = useMemo(() => {
        if (!config.enabled || data.length < 3) return null;
        return detectAnomalies(data, {
            method: config.method,
            threshold: config.threshold,
            lowerThreshold: config.lowerThreshold,
            upperThreshold: config.upperThreshold,
        });
    }, [data, config]);

    const updateConfig = (updates: Partial<AnomalyConfig>) => {
        onConfigChange({ ...config, ...updates });
    };

    const getMethodLabel = (method: AnomalyMethod) => {
        switch (method) {
            case "zscore":
                return "Z-Score";
            case "iqr":
                return "IQR (Interquartile Range)";
            case "threshold":
                return "Ngưỡng cố định";
            case "mad":
                return "MAD (Median Absolute Deviation)";
            default:
                return method;
        }
    };

    const getMethodDescription = (method: AnomalyMethod) => {
        switch (method) {
            case "zscore":
                return "Phát hiện điểm cách xa trung bình nhiều độ lệch chuẩn";
            case "iqr":
                return "Sử dụng tứ phân vị, phù hợp với dữ liệu không chuẩn";
            case "threshold":
                return "Điểm ngoài khoảng ngưỡng được coi là bất thường";
            case "mad":
                return "Robust hơn Z-Score, ít bị ảnh hưởng bởi outliers";
            default:
                return "";
        }
    };

    const highAnomalies =
        anomalyResult?.anomalies.filter((a) => a.isAnomaly && a.type === "high") || [];
    const lowAnomalies =
        anomalyResult?.anomalies.filter((a) => a.isAnomaly && a.type === "low") || [];

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={config.enabled}
                        onCheckedChange={(enabled) => updateConfig({ enabled })}
                        id="anomaly-toggle"
                    />
                    <Label htmlFor="anomaly-toggle" className="text-sm font-medium">
                        Phát hiện bất thường
                    </Label>
                    {config.enabled && anomalyResult && (
                        <div className="flex items-center gap-1">
                            {anomalyResult.stats.anomalyCount > 0 ? (
                                <>
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    <Badge variant="secondary" className="text-xs">
                                        {anomalyResult.stats.anomalyCount} điểm
                                    </Badge>
                                </>
                            ) : (
                                <Badge variant="outline" className="text-xs text-green-600">
                                    Không có bất thường
                                </Badge>
                            )}
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
                        <AlertTriangle className="h-4 w-4" />
                        Cần ít nhất 3 điểm dữ liệu
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Phương pháp</Label>
                    <Select
                        value={config.method}
                        onValueChange={(method) =>
                            updateConfig({ method: method as AnomalyMethod })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="zscore">Z-Score</SelectItem>
                            <SelectItem value="iqr">IQR</SelectItem>
                            <SelectItem value="threshold">Ngưỡng cố định</SelectItem>
                            <SelectItem value="mad">MAD</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        {getMethodDescription(config.method)}
                    </p>
                </div>

                {config.method !== "threshold" && (
                    <div className="space-y-2">
                        <Label>
                            Ngưỡng phát hiện: {config.threshold}
                            {config.method === "zscore" || config.method === "mad"
                                ? "σ"
                                : "x IQR"}
                        </Label>
                        <Slider
                            value={[config.threshold]}
                            min={config.method === "iqr" ? 1 : 1.5}
                            max={config.method === "iqr" ? 3 : 4}
                            step={0.1}
                            onValueChange={([threshold]) => updateConfig({ threshold })}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Nhạy hơn</span>
                            <span>Ít nhạy hơn</span>
                        </div>
                    </div>
                )}

                {config.method === "threshold" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ngưỡng dưới</Label>
                            <Input
                                type="number"
                                value={config.lowerThreshold ?? ""}
                                onChange={(e) =>
                                    updateConfig({
                                        lowerThreshold: e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined,
                                    })
                                }
                                placeholder="Tự động"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ngưỡng trên</Label>
                            <Input
                                type="number"
                                value={config.upperThreshold ?? ""}
                                onChange={(e) =>
                                    updateConfig({
                                        upperThreshold: e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined,
                                    })
                                }
                                placeholder="Tự động"
                            />
                        </div>
                    </div>
                )}

                {anomalyResult && anomalyResult.stats.anomalyCount > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Tổng bất thường:</span>
                            <Badge variant="destructive">
                                {anomalyResult.stats.anomalyCount} (
                                {(anomalyResult.stats.anomalyRate * 100).toFixed(1)}%)
                            </Badge>
                        </div>

                        {highAnomalies.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                    <TrendingUp className="h-3 w-3 text-red-500" />
                                    <span className="text-muted-foreground">
                                        Cao bất thường:
                                    </span>
                                    <span className="font-medium">{highAnomalies.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {highAnomalies.slice(0, 5).map((a) => (
                                        <Badge
                                            key={a.index}
                                            variant="outline"
                                            className="text-xs"
                                            style={{ borderColor: getAnomalyColor("high") }}
                                        >
                                            #{a.index + 1}: {a.value.toLocaleString("vi-VN")}
                                        </Badge>
                                    ))}
                                    {highAnomalies.length > 5 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{highAnomalies.length - 5} nữa
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {lowAnomalies.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                    <TrendingDown className="h-3 w-3 text-blue-500" />
                                    <span className="text-muted-foreground">
                                        Thấp bất thường:
                                    </span>
                                    <span className="font-medium">{lowAnomalies.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {lowAnomalies.slice(0, 5).map((a) => (
                                        <Badge
                                            key={a.index}
                                            variant="outline"
                                            className="text-xs"
                                            style={{ borderColor: getAnomalyColor("low") }}
                                        >
                                            #{a.index + 1}: {a.value.toLocaleString("vi-VN")}
                                        </Badge>
                                    ))}
                                    {lowAnomalies.length > 5 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{lowAnomalies.length - 5} nữa
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t text-xs text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Trung bình:</span>
                                <span>{anomalyResult.stats.mean.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Độ lệch chuẩn:</span>
                                <span>{anomalyResult.stats.std.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * Hook to detect anomalies in chart data
 */
export function useAnomalyDetection(
    data: number[],
    config: AnomalyConfig
): AnomalyResult | null {
    return useMemo(() => {
        if (!config.enabled || data.length < 3) return null;
        return detectAnomalies(data, {
            method: config.method,
            threshold: config.threshold,
            lowerThreshold: config.lowerThreshold,
            upperThreshold: config.upperThreshold,
        });
    }, [data, config]);
}

/**
 * Get dot styling for anomaly points in Recharts
 */
export function getAnomalyDotProps(
    anomalyResult: AnomalyResult | null,
    normalDotProps: Record<string, unknown> = {}
): (dataPoint: unknown, index: number) => Record<string, unknown> {
    return (_dataPoint: unknown, index: number) => {
        const anomaly = anomalyResult?.anomalies[index];
        if (anomaly?.isAnomaly) {
            return {
                r: 6,
                fill: getAnomalyColor(anomaly.type),
                stroke: "#fff",
                strokeWidth: 2,
            };
        }
        return normalDotProps;
    };
}

export default ChartAnomalySettings;
