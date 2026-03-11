"use client";

import React, { useCallback } from "react";
import { VisualizationTypePicker } from "./VisualizationTypePicker";
import { FieldWell } from "./FieldWell";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import { Switch } from "@/components/ui/switch";
import { BarChart3, TrendingUp, Layers, Tags, Lightbulb, Filter, ArrowRightLeft, ArrowDown } from "lucide-react";
import type { ChartConfig, ChartType } from "@/types";

export function BuildVisualTab() {
    const { selectedWidgetId, currentDashboard, updateWidget, setCurrentDashboard } = useDashboardStore(
        useShallow((s) => ({
            selectedWidgetId: s.selectedWidgetId,
            currentDashboard: s.currentDashboard,
            updateWidget: s.updateWidget,
            setCurrentDashboard: s.setCurrentDashboard,
        }))
    );

    const selectedWidget = currentDashboard?.widgets.find(
        (w) => w.id === selectedWidgetId
    );

    const chartConfig = selectedWidget?.type === "chart"
        ? (selectedWidget.config as ChartConfig)
        : null;

    const updateChartConfig = useCallback(
        (updates: Partial<ChartConfig>) => {
            if (!selectedWidgetId || !chartConfig) return;
            updateWidget(selectedWidgetId, {
                config: { ...chartConfig, ...updates },
            });
        },
        [selectedWidgetId, chartConfig, updateWidget]
    );

    const updateDataSource = useCallback(
        (updates: Record<string, unknown>) => {
            if (!chartConfig) return;
            updateChartConfig({
                dataSource: { ...chartConfig.dataSource, ...updates } as ChartConfig["dataSource"],
            });
        },
        [chartConfig, updateChartConfig]
    );

    if (!selectedWidget || !chartConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-60 text-xs text-gray-400 dark:text-gray-500 px-4 text-center gap-3">
                <BarChart3 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <div>
                    <p className="font-medium text-gray-500 dark:text-gray-400">Chưa chọn biểu đồ</p>
                    <p className="mt-1">Click vào biểu đồ trên canvas, hoặc kéo trường dữ liệu từ panel Dữ liệu vào canvas để tạo mới.</p>
                </div>
            </div>
        );
    }

    const ds = chartConfig.dataSource;
    const xAxis = ds?.xAxis ? [ds.xAxis] : [];
    const yAxis = ds?.yAxis || [];
    const secondaryYFields = chartConfig.style?.secondaryYAxisFields || [];
    const primaryYFields = yAxis.filter((f) => !secondaryYFields.includes(f));
    const groupBy = ds?.groupBy
        ? Array.isArray(ds.groupBy) ? ds.groupBy : [ds.groupBy]
        : [];
    const tooltipFields = chartConfig.fieldWells?.tooltipFields || [];
    const drillDownEnabled = !!(ds?.drillDownHierarchy && ds.drillDownHierarchy.length > 0);
    const crossFilterEnabled = !!(ds?.crossFilterFields && ds.crossFilterFields.length > 0);

    return (
        <div className="flex flex-col h-full">
            {/* Chart type picker */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <VisualizationTypePicker
                    selectedType={chartConfig.type}
                    onTypeChange={(type: ChartType) => {
                        const updates: Partial<ChartConfig> = { type };
                        // When switching away from composed, clean up composed-only fields
                        if (type !== "composed" && chartConfig.type === "composed") {
                            // Move secondary fields back to primary yAxis as regular fields
                            const secondary = chartConfig.style?.secondaryYAxisFields || [];
                            if (secondary.length > 0) {
                                updates.style = {
                                    ...chartConfig.style,
                                    secondaryYAxis: false,
                                    secondaryYAxisFields: [],
                                    composedFieldTypes: {},
                                };
                            }
                        }
                        // When switching TO composed from bar/line, set existing fields as the right type
                        if (type === "composed" && chartConfig.type !== "composed") {
                            const currentYAxis = ds?.yAxis || [];
                            const newComposed: Record<string, 'bar' | 'line'> = {};
                            // Default: existing fields are bars, secondary fields stay as lines
                            currentYAxis.forEach(f => {
                                const isSecondary = (chartConfig.style?.secondaryYAxisFields || []).includes(f);
                                newComposed[f] = isSecondary ? 'line' : 'bar';
                            });
                            updates.style = {
                                ...chartConfig.style,
                                ...updates.style,
                                composedFieldTypes: newComposed,
                            };
                        }
                        updateChartConfig(updates);
                    }}
                />
            </div>

            {/* Field wells + options */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* Current dataset indicator */}
                {ds?.table && (
                    <div className="mb-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <BarChart3 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Bộ dữ liệu: <strong>{ds.table}</strong></span>
                    </div>
                )}

                {/* Field Wells - kéo thả từ Data Panel bên cạnh */}
                <FieldWell
                    id="xAxis"
                    label="Trục X"
                    fields={xAxis}
                    onRemoveField={() => updateDataSource({ xAxis: "" })}
                    maxFields={1}
                    icon={<BarChart3 className="h-3 w-3 text-gray-400" />}
                />

                <FieldWell
                    id="columnYAxis"
                    label="Trục Y (Cột)"
                    fields={primaryYFields}
                    onRemoveField={(f) => {
                        const newYAxis = yAxis.filter(y => y !== f);
                        // Also clean composedFieldTypes
                        const newComposed = { ...chartConfig.style?.composedFieldTypes };
                        delete newComposed[f];
                        updateChartConfig({
                            dataSource: { ...ds, yAxis: newYAxis } as typeof ds,
                            style: { ...chartConfig.style, composedFieldTypes: newComposed },
                        });
                    }}
                    icon={<Layers className="h-3 w-3 text-gray-400" />}
                />

                <FieldWell
                    id="lineYAxis"
                    label="Trục Y (Đường)"
                    fields={secondaryYFields}
                    onRemoveField={(f) => {
                        const newSecondary = secondaryYFields.filter(y => y !== f);
                        const newYAxis = yAxis.filter(y => y !== f);
                        // Also clean composedFieldTypes
                        const newComposed = { ...chartConfig.style?.composedFieldTypes };
                        delete newComposed[f];
                        updateChartConfig({
                            dataSource: { ...ds, yAxis: newYAxis } as typeof ds,
                            style: {
                                ...chartConfig.style,
                                secondaryYAxisFields: newSecondary,
                                secondaryYAxis: newSecondary.length > 0,
                                composedFieldTypes: newComposed,
                            },
                        });
                    }}
                    icon={<TrendingUp className="h-3 w-3 text-gray-400" />}
                />

                <FieldWell
                    id="legend"
                    label="Chú giải (Legend)"
                    fields={groupBy}
                    onRemoveField={(f) => {
                        const g = groupBy.filter(x => x !== f);
                        updateDataSource({ groupBy: g.length > 0 ? g : undefined });
                    }}
                    maxFields={1}
                    icon={<Tags className="h-3 w-3 text-gray-400" />}
                />

                <FieldWell
                    id="tooltips"
                    label="Tooltip"
                    fields={tooltipFields}
                    onRemoveField={(f) => updateChartConfig({
                        fieldWells: { ...chartConfig.fieldWells, tooltipFields: tooltipFields.filter(x => x !== f) },
                    })}
                    icon={<Lightbulb className="h-3 w-3 text-gray-400" />}
                />

                {/* ======================== */}
                {/* CLIENT-SIDE PROCESSING OPTIONS */}
                {/* Aggregation, Sort, Limit - applied on loaded data */}
                {/* ======================== */}
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 font-semibold uppercase tracking-wider">
                        Xử lý dữ liệu
                    </label>

                    <div className="mb-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Tổng hợp</label>
                        <select
                            value={ds?.aggregation || "sum"}
                            onChange={(e) => updateDataSource({ aggregation: e.target.value })}
                            className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                        >
                            <option value="sum">Tổng (SUM)</option>
                            <option value="avg">Trung bình (AVG)</option>
                            <option value="count">Đếm (COUNT)</option>
                            <option value="min">Nhỏ nhất (MIN)</option>
                            <option value="max">Lớn nhất (MAX)</option>
                            <option value="none">Không tổng hợp</option>
                        </select>
                    </div>

                    <div className="mb-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Sắp xếp</label>
                        <div className="flex gap-1">
                            <select
                                value={ds?.orderBy || ""}
                                onChange={(e) => updateDataSource({ orderBy: e.target.value || undefined })}
                                className="flex-1 h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                            >
                                <option value="">Mặc định</option>
                                {xAxis.map(f => <option key={f} value={f}>{f}</option>)}
                                {yAxis.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select
                                value={ds?.orderDirection || "asc"}
                                onChange={(e) => updateDataSource({ orderDirection: e.target.value })}
                                className="w-16 h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1"
                            >
                                <option value="asc">↑ Tăng</option>
                                <option value="desc">↓ Giảm</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Giới hạn hiển thị</label>
                        <input
                            type="number"
                            value={ds?.limit || ""}
                            onChange={(e) => updateDataSource({ limit: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                            placeholder="Tất cả"
                            min={1}
                            max={10000}
                        />
                    </div>
                </div>

                {/* ======================== */}
                {/* INTERACTIVITY TOGGLES */}
                {/* ======================== */}
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold uppercase tracking-wider">
                        Tương tác
                    </label>

                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-600 dark:text-gray-300">Drill through</span>
                        <Switch
                            checked={drillDownEnabled}
                            onCheckedChange={(checked) => updateDataSource({
                                drillDownHierarchy: checked ? [ds?.xAxis || ""] : [],
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-600 dark:text-gray-300">Cross-filter</span>
                        <Switch
                            checked={crossFilterEnabled}
                            onCheckedChange={(checked) => updateDataSource({
                                crossFilterFields: checked ? [ds?.xAxis || ""] : [],
                            })}
                        />
                    </div>
                </div>

                {/* ======================== */}
                {/* DASHBOARD DRILLDOWN (Tab-level) */}
                {/* ======================== */}
                {(currentDashboard?.tabs || []).length > 1 && (
                    <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1 font-semibold uppercase tracking-wider">
                            Dashboard Drilldown
                        </label>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-2">
                            Click vào biểu đồ trên trang này → chuyển sang trang khác kèm bộ lọc.
                        </p>

                        {(() => {
                            const tabs = currentDashboard?.tabs || [];
                            const activeTabId = currentDashboard?.activeTabId || tabs[0]?.id;
                            const activeTab = tabs.find(t => t.id === activeTabId);
                            const drillConfig = activeTab?.drilldown;

                            const updateTabDrilldown = (updates: Partial<typeof drillConfig>) => {
                                if (!currentDashboard || !activeTab) return;
                                const newTabs = tabs.map(t =>
                                    t.id === activeTabId
                                        ? { ...t, drilldown: { ...t.drilldown, ...updates } }
                                        : t
                                );
                                setCurrentDashboard({ ...currentDashboard, tabs: newTabs });
                            };

                            const clearTabDrilldown = () => {
                                if (!currentDashboard || !activeTab) return;
                                const newTabs = tabs.map(t =>
                                    t.id === activeTabId
                                        ? { ...t, drilldown: undefined }
                                        : t
                                );
                                setCurrentDashboard({ ...currentDashboard, tabs: newTabs });
                            };

                            return (
                                <>
                                    <div className="mb-2">
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Trang đích khi click</label>
                                        <select
                                            value={drillConfig?.targetTabId || ""}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    updateTabDrilldown({ targetTabId: e.target.value });
                                                } else {
                                                    clearTabDrilldown();
                                                }
                                            }}
                                            className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                                        >
                                            <option value="">Không drill (ở lại trang này)</option>
                                            {tabs
                                                .filter(t => t.id !== activeTabId)
                                                .map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                        </select>
                                    </div>

                                    {drillConfig?.targetTabId && (
                                        <div className="mb-2">
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Trường gửi làm filter</label>
                                            <select
                                                value={drillConfig?.passFilters?.[0]?.sourceField || ""}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        updateTabDrilldown({
                                                            passFilters: [{ sourceField: e.target.value, targetField: e.target.value }],
                                                        });
                                                    } else {
                                                        updateTabDrilldown({ passFilters: [] });
                                                    }
                                                }}
                                                className="w-full h-7 text-[11px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                                            >
                                                <option value="">Tự động (trục X)</option>
                                                {xAxis.map(f => <option key={f} value={f}>{f}</option>)}
                                                {yAxis.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <p className="text-[8px] text-gray-400 mt-1">
                                                Khi click biểu đồ, giá trị trường này sẽ được truyền sang trang đích.
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
