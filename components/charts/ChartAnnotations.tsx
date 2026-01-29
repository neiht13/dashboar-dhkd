"use client";

import React, { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    MessageSquare,
    TrendingUp,
    ArrowRight,
    Target,
    Minus,
    Plus,
    Trash2,
    X,
    Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartAnnotation {
    id: string;
    type: "line" | "area" | "text" | "target";
    label?: string;
    value?: number;
    startValue?: number;
    endValue?: number;
    axis: "x" | "y";
    color: string;
    strokeDasharray?: string;
    opacity?: number;
    position?: { x: number; y: number };
}

interface AnnotationManagerProps {
    annotations: ChartAnnotation[];
    onAnnotationsChange: (annotations: ChartAnnotation[]) => void;
    yAxisDomain?: [number, number];
    xAxisLabels?: string[];
}

const COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#64748b", // Slate
];

const LINE_STYLES = [
    { value: "0", label: "Liền" },
    { value: "5 5", label: "Gạch" },
    { value: "2 2", label: "Chấm" },
    { value: "10 5 2 5", label: "Gạch-chấm" },
];

export function AnnotationManager({
    annotations,
    onAnnotationsChange,
    yAxisDomain,
    xAxisLabels,
}: AnnotationManagerProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const addAnnotation = (type: ChartAnnotation["type"]) => {
        const newAnnotation: ChartAnnotation = {
            id: `ann_${Date.now()}`,
            type,
            axis: "y",
            color: COLORS[annotations.length % COLORS.length],
            strokeDasharray: "5 5",
            opacity: 0.8,
        };

        if (type === "line" || type === "target") {
            newAnnotation.value = yAxisDomain ? (yAxisDomain[0] + yAxisDomain[1]) / 2 : 0;
            newAnnotation.label = type === "target" ? "Mục tiêu" : "Đường tham chiếu";
        } else if (type === "area") {
            newAnnotation.startValue = yAxisDomain ? yAxisDomain[0] : 0;
            newAnnotation.endValue = yAxisDomain ? (yAxisDomain[0] + yAxisDomain[1]) / 2 : 50;
            newAnnotation.label = "Vùng tham chiếu";
            newAnnotation.opacity = 0.2;
        } else if (type === "text") {
            newAnnotation.label = "Ghi chú";
            newAnnotation.position = { x: 50, y: 50 };
        }

        onAnnotationsChange([...annotations, newAnnotation]);
        setEditingId(newAnnotation.id);
    };

    const updateAnnotation = (id: string, updates: Partial<ChartAnnotation>) => {
        onAnnotationsChange(
            annotations.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann))
        );
    };

    const removeAnnotation = (id: string) => {
        onAnnotationsChange(annotations.filter((ann) => ann.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const getAnnotationIcon = (type: ChartAnnotation["type"]) => {
        switch (type) {
            case "line":
                return <Minus className="h-4 w-4" />;
            case "area":
                return <div className="h-3 w-4 bg-current opacity-30 rounded-sm" />;
            case "text":
                return <MessageSquare className="h-4 w-4" />;
            case "target":
                return <Target className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Annotation Buttons */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addAnnotation("line")}
                    className="gap-1"
                >
                    <Minus className="h-3 w-3" />
                    Đường
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addAnnotation("area")}
                    className="gap-1"
                >
                    <div className="h-2 w-3 bg-current opacity-30 rounded-sm" />
                    Vùng
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addAnnotation("target")}
                    className="gap-1"
                >
                    <Target className="h-3 w-3" />
                    Mục tiêu
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addAnnotation("text")}
                    className="gap-1"
                >
                    <MessageSquare className="h-3 w-3" />
                    Ghi chú
                </Button>
            </div>

            {/* Annotation List */}
            {annotations.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        Annotations ({annotations.length})
                    </Label>
                    <div className="space-y-1">
                        {annotations.map((annotation) => (
                            <div
                                key={annotation.id}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                                    editingId === annotation.id
                                        ? "border-primary bg-primary/5"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: annotation.color }}
                                />
                                <span className="flex-1 text-sm truncate">
                                    {annotation.label || annotation.type}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {annotation.type === "line" || annotation.type === "target"
                                        ? annotation.value
                                        : annotation.type === "area"
                                            ? `${annotation.startValue} - ${annotation.endValue}`
                                            : "text"}
                                </Badge>
                                <Popover
                                    open={editingId === annotation.id}
                                    onOpenChange={(open) =>
                                        setEditingId(open ? annotation.id : null)
                                    }
                                >
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <Palette className="h-3 w-3" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72" align="end">
                                        <AnnotationEditor
                                            annotation={annotation}
                                            onUpdate={(updates) =>
                                                updateAnnotation(annotation.id, updates)
                                            }
                                            yAxisDomain={yAxisDomain}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeAnnotation(annotation.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface AnnotationEditorProps {
    annotation: ChartAnnotation;
    onUpdate: (updates: Partial<ChartAnnotation>) => void;
    yAxisDomain?: [number, number];
}

function AnnotationEditor({
    annotation,
    onUpdate,
    yAxisDomain,
}: AnnotationEditorProps) {
    const [min, max] = yAxisDomain || [0, 100];

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Nhãn</Label>
                <Input
                    value={annotation.label || ""}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    placeholder="Nhập nhãn..."
                />
            </div>

            {(annotation.type === "line" || annotation.type === "target") && (
                <div className="space-y-2">
                    <Label>Giá trị: {annotation.value}</Label>
                    <Slider
                        value={[annotation.value || 0]}
                        min={min}
                        max={max}
                        step={(max - min) / 100}
                        onValueChange={([value]) => onUpdate({ value })}
                    />
                </div>
            )}

            {annotation.type === "area" && (
                <>
                    <div className="space-y-2">
                        <Label>Giá trị bắt đầu: {annotation.startValue}</Label>
                        <Slider
                            value={[annotation.startValue || 0]}
                            min={min}
                            max={annotation.endValue || max}
                            step={(max - min) / 100}
                            onValueChange={([startValue]) => onUpdate({ startValue })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Giá trị kết thúc: {annotation.endValue}</Label>
                        <Slider
                            value={[annotation.endValue || 0]}
                            min={annotation.startValue || min}
                            max={max}
                            step={(max - min) / 100}
                            onValueChange={([endValue]) => onUpdate({ endValue })}
                        />
                    </div>
                </>
            )}

            <div className="space-y-2">
                <Label>Màu sắc</Label>
                <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                        <button
                            key={color}
                            className={cn(
                                "w-6 h-6 rounded-full transition-transform",
                                annotation.color === color
                                    ? "ring-2 ring-primary ring-offset-2 scale-110"
                                    : "hover:scale-110"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdate({ color })}
                        />
                    ))}
                </div>
            </div>

            {(annotation.type === "line" || annotation.type === "target") && (
                <div className="space-y-2">
                    <Label>Kiểu đường</Label>
                    <Select
                        value={annotation.strokeDasharray || "0"}
                        onValueChange={(strokeDasharray) => onUpdate({ strokeDasharray })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LINE_STYLES.map((style) => (
                                <SelectItem key={style.value} value={style.value}>
                                    {style.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {annotation.type === "area" && (
                <div className="space-y-2">
                    <Label>Độ trong suốt: {Math.round((annotation.opacity || 0.2) * 100)}%</Label>
                    <Slider
                        value={[(annotation.opacity || 0.2) * 100]}
                        min={5}
                        max={50}
                        step={5}
                        onValueChange={([value]) => onUpdate({ opacity: value / 100 })}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Convert annotations to Recharts reference elements props
 */
export function annotationsToRechartsProps(annotations: ChartAnnotation[]): {
    referenceLines: Array<{
        y?: number;
        x?: number | string;
        stroke: string;
        strokeDasharray?: string;
        label?: { value: string; position: "top" | "bottom" | "left" | "right" };
    }>;
    referenceAreas: Array<{
        y1?: number;
        y2?: number;
        x1?: number | string;
        x2?: number | string;
        fill: string;
        fillOpacity: number;
        label?: { value: string };
    }>;
} {
    const referenceLines: Array<{
        y?: number;
        x?: number | string;
        stroke: string;
        strokeDasharray?: string;
        label?: { value: string; position: "top" | "bottom" | "left" | "right" };
    }> = [];

    const referenceAreas: Array<{
        y1?: number;
        y2?: number;
        x1?: number | string;
        x2?: number | string;
        fill: string;
        fillOpacity: number;
        label?: { value: string };
    }> = [];

    annotations.forEach((ann) => {
        if (ann.type === "line" || ann.type === "target") {
            referenceLines.push({
                [ann.axis]: ann.value,
                stroke: ann.color,
                strokeDasharray: ann.strokeDasharray,
                label: ann.label
                    ? { value: ann.label, position: ann.axis === "y" ? "right" : "top" }
                    : undefined,
            });
        } else if (ann.type === "area") {
            referenceAreas.push({
                [`${ann.axis}1`]: ann.startValue,
                [`${ann.axis}2`]: ann.endValue,
                fill: ann.color,
                fillOpacity: ann.opacity || 0.2,
                label: ann.label ? { value: ann.label } : undefined,
            });
        }
    });

    return { referenceLines, referenceAreas };
}

export default AnnotationManager;
