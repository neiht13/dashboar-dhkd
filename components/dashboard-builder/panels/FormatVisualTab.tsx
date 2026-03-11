"use client";

import React, { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import { AxisSection } from "./format-sections/AxisSection";
import { LegendSection } from "./format-sections/LegendSection";
import { GridlinesSection } from "./format-sections/GridlinesSection";
import { DataLabelsSection } from "./format-sections/DataLabelsSection";
import { MarkersSection } from "./format-sections/MarkersSection";
import { ShadeAreaSection } from "./format-sections/ShadeAreaSection";
import { PlotBackgroundSection } from "./format-sections/PlotBackgroundSection";
import { ZoomSliderSection } from "./format-sections/ZoomSliderSection";
import { ColorsSection } from "./format-sections/ColorsSection";
import { ConditionalFormattingSection } from "./format-sections/ConditionalFormattingSection";
import { cn } from "@/lib/utils";
import type { ChartConfig, ChartStyle } from "@/types";

interface CollapsibleSectionProps {
    title: string;
    defaultOpen?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    children: React.ReactNode;
}

function CollapsibleSection({
    title,
    defaultOpen = false,
    switchValue,
    onSwitchChange,
    children,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-100 dark:border-gray-700/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-1.5">
                    {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                    ) : (
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                    )}
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                        {title}
                    </span>
                </div>
                {switchValue !== undefined && onSwitchChange && (
                    <Switch
                        checked={switchValue}
                        onCheckedChange={onSwitchChange}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </button>
            {isOpen && (
                <div className="animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

export function FormatVisualTab() {
    const [activeSubTab, setActiveSubTab] = useState<"visual" | "general">("visual");

    const { selectedWidgetId, currentDashboard, updateWidget } = useDashboardStore(
        useShallow((s) => ({
            selectedWidgetId: s.selectedWidgetId,
            currentDashboard: s.currentDashboard,
            updateWidget: s.updateWidget,
        }))
    );

    const selectedWidget = currentDashboard?.widgets.find(
        (w) => w.id === selectedWidgetId
    );

    const chartConfig = selectedWidget?.type === "chart"
        ? (selectedWidget.config as ChartConfig)
        : null;

    const style = chartConfig?.style || {};

    const onStyleChange = useCallback(
        (updates: Partial<ChartStyle>) => {
            if (!selectedWidgetId || !chartConfig) return;
            updateWidget(selectedWidgetId, {
                config: {
                    ...chartConfig,
                    style: { ...chartConfig.style, ...updates },
                },
            });
        },
        [selectedWidgetId, chartConfig, updateWidget]
    );

    if (!selectedWidget || !chartConfig) {
        return (
            <div className="flex items-center justify-center h-40 text-xs text-gray-400 dark:text-gray-500 px-4 text-center">
                Chọn một biểu đồ trên canvas để định dạng
            </div>
        );
    }

    const isCartesian = ["bar", "line", "area", "composed", "stackedBar", "horizontalBar", "scatter"].includes(chartConfig.type);
    const hasLines = ["line", "composed", "area"].includes(chartConfig.type);
    const yAxisKeys = chartConfig.dataSource?.yAxis || [];

    return (
        <div className="flex flex-col h-full">
            {/* Sub-tabs: Visual | General */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveSubTab("visual")}
                    className={cn(
                        "flex-1 text-[11px] font-medium py-2 border-b-2 transition-colors",
                        activeSubTab === "visual"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    Visual
                </button>
                <button
                    onClick={() => setActiveSubTab("general")}
                    className={cn(
                        "flex-1 text-[11px] font-medium py-2 border-b-2 transition-colors",
                        activeSubTab === "general"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    General
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeSubTab === "visual" ? (
                    <>
                        {isCartesian && (
                            <>
                                <CollapsibleSection
                                    title="Trục X"
                                    switchValue={true}
                                >
                                    <AxisSection style={style} onStyleChange={onStyleChange} axis="x" />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Trục Y"
                                    switchValue={true}
                                >
                                    <AxisSection style={style} onStyleChange={onStyleChange} axis="y" />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Trục Y phụ"
                                    switchValue={style.secondaryYAxis ?? false}
                                    onSwitchChange={(v) => onStyleChange({ secondaryYAxis: v })}
                                >
                                    <AxisSection style={style} onStyleChange={onStyleChange} axis="secondary" />
                                </CollapsibleSection>
                            </>
                        )}

                        <CollapsibleSection title="Màu sắc" defaultOpen>
                            <ColorsSection style={style} yAxisKeys={yAxisKeys} onStyleChange={onStyleChange} />
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="Chú giải"
                            switchValue={style.showLegend ?? true}
                            onSwitchChange={(v) => onStyleChange({ showLegend: v })}
                        >
                            <LegendSection style={style} onStyleChange={onStyleChange} />
                        </CollapsibleSection>

                        {isCartesian && (
                            <CollapsibleSection
                                title="Đường lưới"
                                switchValue={style.showGrid ?? true}
                                onSwitchChange={(v) => onStyleChange({ showGrid: v })}
                            >
                                <GridlinesSection style={style} onStyleChange={onStyleChange} />
                            </CollapsibleSection>
                        )}

                        {isCartesian && (
                            <CollapsibleSection
                                title="Zoom slider"
                                switchValue={style.zoomSlider ?? false}
                                onSwitchChange={(v) => onStyleChange({ zoomSlider: v })}
                            >
                                <ZoomSliderSection style={style} onStyleChange={onStyleChange} />
                            </CollapsibleSection>
                        )}

                        {hasLines && (
                            <>
                                <CollapsibleSection
                                    title="Vùng tô"
                                    switchValue={style.shadeArea ?? false}
                                    onSwitchChange={(v) => onStyleChange({ shadeArea: v })}
                                >
                                    <ShadeAreaSection style={style} onStyleChange={onStyleChange} />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Điểm đánh dấu"
                                    switchValue={style.showMarkers ?? true}
                                    onSwitchChange={(v) => onStyleChange({ showMarkers: v })}
                                >
                                    <MarkersSection style={style} onStyleChange={onStyleChange} />
                                </CollapsibleSection>
                            </>
                        )}

                        <CollapsibleSection
                            title="Nhãn dữ liệu"
                            switchValue={style.showDataLabels ?? false}
                            onSwitchChange={(v) => onStyleChange({ showDataLabels: v })}
                        >
                            <DataLabelsSection style={style} onStyleChange={onStyleChange} />
                        </CollapsibleSection>

                        {isCartesian && (
                            <CollapsibleSection
                                title="Định dạng điều kiện"
                                switchValue={style.conditionalColoring?.enabled ?? false}
                                onSwitchChange={(v) => onStyleChange({
                                    conditionalColoring: { ...style.conditionalColoring, enabled: v }
                                })}
                            >
                                <ConditionalFormattingSection style={style} onStyleChange={onStyleChange} />
                            </CollapsibleSection>
                        )}

                        <CollapsibleSection title="Nền vùng vẽ">
                            <PlotBackgroundSection style={style} onStyleChange={onStyleChange} />
                        </CollapsibleSection>
                    </>
                ) : (
                    /* General Tab */
                    <>
                        <div className="p-3 space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Tiêu đề</label>
                                <input
                                    type="text"
                                    value={style.title || chartConfig.name || ""}
                                    onChange={(e) => onStyleChange({ title: e.target.value })}
                                    className="w-full h-7 px-2 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Cỡ tiêu đề</label>
                                    <input
                                        type="number"
                                        value={style.titleFontSize || 14}
                                        onChange={(e) => onStyleChange({ titleFontSize: parseInt(e.target.value) || 14 })}
                                        className="w-full h-7 px-2 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        min={10}
                                        max={32}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Màu tiêu đề</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="color"
                                            value={style.titleColor || "#0F172A"}
                                            onChange={(e) => onStyleChange({ titleColor: e.target.value })}
                                            className="w-6 h-7 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={style.titleColor || "#0F172A"}
                                            onChange={(e) => onStyleChange({ titleColor: e.target.value })}
                                            className="flex-1 h-7 px-1 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Tooltip theme</label>
                                <div className="grid grid-cols-2 gap-1">
                                    {(["light", "dark"] as const).map((theme) => (
                                        <button
                                            key={theme}
                                            onClick={() => onStyleChange({ tooltipTheme: theme })}
                                            className={`text-[10px] py-1.5 rounded border transition-colors capitalize ${
                                                (style.tooltipTheme || "light") === theme
                                                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400"
                                                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            {theme === "light" ? "Sáng" : "Tối"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-600 dark:text-gray-300">Hiệu ứng chuyển động</span>
                                <Switch
                                    checked={style.animation ?? true}
                                    onCheckedChange={(checked) => onStyleChange({ animation: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-600 dark:text-gray-300">Gradient fill</span>
                                <Switch
                                    checked={style.gradientFill ?? false}
                                    onCheckedChange={(checked) => onStyleChange({ gradientFill: checked })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Bo góc (px)</label>
                                <input
                                    type="number"
                                    value={style.borderRadius || 4}
                                    onChange={(e) => onStyleChange({ borderRadius: parseInt(e.target.value) || 0 })}
                                    className="w-full h-7 px-2 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    min={0}
                                    max={20}
                                />
                            </div>

                            {/* Custom field labels */}
                            {yAxisKeys.length > 0 && (
                                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">Nhãn tuỳ chỉnh cho series</label>
                                    <div className="space-y-1.5">
                                        {yAxisKeys.map((field) => (
                                            <div key={field} className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 w-24 truncate flex-shrink-0" title={field}>
                                                    {field}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={style.yAxisFieldLabels?.[field] || ""}
                                                    onChange={(e) => onStyleChange({
                                                        yAxisFieldLabels: {
                                                            ...style.yAxisFieldLabels,
                                                            [field]: e.target.value,
                                                        },
                                                    })}
                                                    placeholder={field}
                                                    className="flex-1 h-6 px-2 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
