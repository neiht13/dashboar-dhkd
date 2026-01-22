"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, BarChart3, PieChart, Gauge } from "lucide-react";
import { StatCardMetric } from "@/types";

interface MetricsEditorProps {
    metrics: StatCardMetric[];
    onChange: (metrics: StatCardMetric[]) => void;
}

export function MetricsEditor({ metrics, onChange }: MetricsEditorProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentMetric, setCurrentMetric] = useState<Partial<StatCardMetric>>({
        label: "",
        value: "",
        type: "number",
        color: "#0066FF"
    });

    const handleAddMetric = () => {
        setEditingIndex(metrics.length);
        setCurrentMetric({
            label: "",
            value: "",
            type: "number",
            color: "#0066FF"
        });
    };

    const handleEditMetric = (index: number) => {
        setEditingIndex(index);
        setCurrentMetric({ ...metrics[index] });
    };

    const handleSaveMetric = () => {
        if (!currentMetric.label?.trim()) return;

        const newMetrics = [...metrics];
        const metricToSave: StatCardMetric = {
            label: currentMetric.label || "",
            value: currentMetric.value || "",
            type: currentMetric.type || "number",
            ...(currentMetric.type === "sparkline" && currentMetric.chartData && { chartData: currentMetric.chartData }),
            ...(currentMetric.progress !== undefined && { progress: currentMetric.progress }),
            ...(currentMetric.color && { color: currentMetric.color })
        };

        if (editingIndex === metrics.length) {
            // Adding new metric
            newMetrics.push(metricToSave);
        } else {
            // Updating existing metric
            newMetrics[editingIndex!] = metricToSave;
        }

        onChange(newMetrics);
        setEditingIndex(null);
        setCurrentMetric({
            label: "",
            value: "",
            type: "number",
            color: "#0066FF"
        });
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setCurrentMetric({
            label: "",
            value: "",
            type: "number",
            color: "#0066FF"
        });
    };

    const handleDeleteMetric = (index: number) => {
        const newMetrics = metrics.filter((_, i) => i !== index);
        onChange(newMetrics);
    };

    const handleChartDataChange = (value: string) => {
        try {
            const data = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
            setCurrentMetric(prev => ({ ...prev, chartData: data }));
        } catch (e) {
            setCurrentMetric(prev => ({ ...prev, chartData: [] }));
        }
    };

    const getMetricTypeIcon = (type: string) => {
        switch (type) {
            case 'sparkline': return <BarChart3 className="w-4 h-4" />;
            case 'donut': return <PieChart className="w-4 h-4" />;
            case 'gauge': return <Gauge className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Metrics Configuration</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMetric}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Thêm Metric
                </Button>
            </div>

            {/* Existing Metrics */}
            {metrics.length > 0 && (
                <div className="space-y-2">
                    {metrics.map((metric, index) => (
                        <Card key={index} className="border-l-4" style={{ borderLeftColor: metric.color || "#0066FF" }}>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getMetricTypeIcon(metric.type || "")}
                                        <div>
                                            <div className="font-medium text-sm">{metric.label}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {metric.value} • {metric.type}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {metric.type}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditMetric(index)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteMetric(index)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Form */}
            {editingIndex !== null && (
                <Card className="border-2 border-dashed border-primary/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                            {editingIndex === metrics.length ? "Thêm Metric Mới" : "Chỉnh sửa Metric"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="metric-label" className="text-xs">Tên Metric</Label>
                                <Input
                                    id="metric-label"
                                    value={currentMetric.label || ""}
                                    onChange={(e) => setCurrentMetric(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="VD: Sản lượng PTM"
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="metric-value" className="text-xs">Giá trị</Label>
                                <Input
                                    id="metric-value"
                                    value={currentMetric.value || ""}
                                    onChange={(e) => setCurrentMetric(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="VD: 15267 hoặc 46%"
                                    className="h-8"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="metric-type" className="text-xs">Loại Chart</Label>
                                <Select
                                    value={currentMetric.type || "number"}
                                    onValueChange={(value) => setCurrentMetric(prev => ({ ...prev, type: value as any }))}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="number">Số</SelectItem>
                                        <SelectItem value="percent">Phần trăm</SelectItem>
                                        <SelectItem value="sparkline">Đồ thị đường nhỏ</SelectItem>
                                        <SelectItem value="donut">Đồ thị tròn</SelectItem>
                                        <SelectItem value="gauge">Đồng hồ đo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="metric-color" className="text-xs">Màu sắc</Label>
                                <Input
                                    id="metric-color"
                                    type="color"
                                    value={currentMetric.color || "#0066FF"}
                                    onChange={(e) => setCurrentMetric(prev => ({ ...prev, color: e.target.value }))}
                                    className="h-8 p-1"
                                />
                            </div>
                            {(currentMetric.type === 'sparkline' || currentMetric.type === 'donut' || currentMetric.type === 'gauge') && (
                                <div className="space-y-2">
                                    <Label htmlFor="metric-data" className="text-xs">
                                        {currentMetric.type === 'sparkline' ? 'Dữ liệu đồ thị' : 'Tiến độ (%)'}
                                    </Label>
                                    {currentMetric.type === 'sparkline' ? (
                                        <Input
                                            id="metric-data"
                                            value={currentMetric.chartData?.join(', ') || ""}
                                            onChange={(e) => handleChartDataChange(e.target.value)}
                                            placeholder="VD: 12000, 13500, 14200"
                                            className="h-8"
                                        />
                                    ) : (
                                        <Input
                                            id="metric-data"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={currentMetric.progress || ""}
                                            onChange={(e) => setCurrentMetric(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                                            placeholder="0-100"
                                            className="h-8"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Button type="button" size="sm" onClick={handleSaveMetric}>
                                Lưu
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                                Hủy
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {metrics.length === 0 && editingIndex === null && (
                <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có metric nào. Click "Thêm Metric" để bắt đầu.</p>
                </div>
            )}
        </div>
    );
}