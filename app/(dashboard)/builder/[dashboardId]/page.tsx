"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Save, Eye, Edit3, ArrowLeft, History, Layout, Palette } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardGrid } from "@/components/dashboard-builder/DashboardGrid";
import { DashboardHeader } from "@/components/dashboard-builder/DashboardHeader";
import { EnhancedGlobalFilters } from "@/components/dashboard-builder/EnhancedGlobalFilters";
import { RefreshStatus } from "@/components/dashboard-builder/RefreshStatus";
import { RibbonToolbar } from "@/components/dashboard-builder/RibbonToolbar";
import { PageTabBar } from "@/components/dashboard-builder/PageTabBar";
import { VisualizationPanel } from "@/components/dashboard-builder/panels/VisualizationPanel";
import { PowerBIFilterPanel } from "@/components/dashboard-builder/panels/PowerBIFilterPanel";
import { DataPanel } from "@/components/dashboard-builder/panels/DataPanel";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useCrossFilterStore } from "@/stores/cross-filter-store";
import { generateId } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import type { Dashboard, WidgetType, LayoutItem } from "@/types";

const GRID_COLS = 12;

// Helper to check if two layout items collide
const itemsCollide = (a: LayoutItem, b: LayoutItem) => {
    return a.i !== b.i &&
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
};

// Find the first free position for a new widget
const findFreePosition = (existingLayouts: LayoutItem[], widgetWidth: number, widgetHeight: number): { x: number; y: number } => {
    // If no existing widgets, place at (0, 0)
    if (existingLayouts.length === 0) {
        return { x: 0, y: 0 };
    }

    // Try positions from top-left, scanning left to right, then top to bottom
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x <= GRID_COLS - widgetWidth; x++) {
            const testLayout: LayoutItem = {
                i: 'test',
                x,
                y,
                w: widgetWidth,
                h: widgetHeight,
            };

            // Check if this position collides with any existing widget
            const hasCollision = existingLayouts.some(existing => itemsCollide(testLayout, existing));

            if (!hasCollision) {
                return { x, y };
            }
        }
    }

    // If no free position found, place below the lowest widget
    const maxY = Math.max(...existingLayouts.map(l => (l.y || 0) + (l.h || 3)), 0);
    return { x: 0, y: maxY };
};
import { UndoRedoControls } from "@/components/dashboard/UndoRedoControls";
import { VersionHistory } from "@/components/dashboard/VersionHistory";
import { TemplateSelector } from "@/components/dashboard/TemplateSelector";
import { ColorThemeSelector } from "@/components/dashboard/ColorThemeSelector";
import { useUndoRedoStore } from "@/stores/undo-redo-store";
import { toast } from "sonner";

interface BuilderPageProps {
    params: Promise<{ dashboardId: string }>;
}

export default function DashboardBuilderPage({ params }: BuilderPageProps) {
    const { dashboardId } = use(params);
    const router = useRouter();
    const {
        dashboards,
        currentDashboard,
        setCurrentDashboard,
        createDashboard,
        updateDashboard,
        addWidget,
        updateWidget,
        saveDashboardToServer,
        fetchDashboard,
        isEditing,
        toggleEditing,
        isSaving,
        setIsSaving,
        showDataPanel,
        setShowDataPanel,
    } = useDashboardStore(
        useShallow((state) => ({
            dashboards: state.dashboards,
            currentDashboard: state.currentDashboard,
            setCurrentDashboard: state.setCurrentDashboard,
            createDashboard: state.createDashboard,
            updateDashboard: state.updateDashboard,
            addWidget: state.addWidget,
            updateWidget: state.updateWidget,
            saveDashboardToServer: state.saveDashboardToServer,
            fetchDashboard: state.fetchDashboard,
            isEditing: state.isEditing,
            toggleEditing: state.toggleEditing,
            isSaving: state.isSaving,
            setIsSaving: state.setIsSaving,
            showDataPanel: state.showDataPanel,
            setShowDataPanel: state.setShowDataPanel,
        }))
    );

    const [showNameDialog, setShowNameDialog] = useState(false);
    const [dashboardName, setDashboardName] = useState("");
    const [dashboardDescription, setDashboardDescription] = useState("");
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);

    // Undo/Redo integration
    const { initializeState, pushState } = useUndoRedoStore(
        useShallow((state) => ({
            initializeState: state.initializeState,
            pushState: state.pushState,
        }))
    );

    // Refresh data handler
    const handleRefreshData = async () => {
        // Trigger refresh by updating refreshTrigger timestamp
        // DashboardGrid will watch this and clear cache + refetch
        setLastDataUpdate(new Date());
    };

    // Load or create dashboard
    useEffect(() => {
        const loadDashboard = async () => {
            if (dashboardId === "new") {
                setCurrentDashboard(null);
                useCrossFilterStore.getState().clearAllFilters();
                setShowNameDialog(true);
                return;
            }

            // First try local store
            let dashboard = dashboards.find((d) => d.id === dashboardId);

            // If not in local store, try fetching from API
            if (!dashboard) {
                const fetched = await fetchDashboard(dashboardId);
                if (fetched) {
                    dashboard = fetched;
                }
            }

            if (dashboard) {
                // If dashboard has tabs, restore widgets from active tab
                let widgetsToUse = dashboard.widgets || [];
                let layoutToUse = dashboard.layout || [];

                if (dashboard.tabs && dashboard.tabs.length > 0) {
                    const activeTab = dashboard.tabs.find(t => t.id === dashboard.activeTabId)
                        || dashboard.tabs[0];
                    widgetsToUse = activeTab.widgets || [];
                    layoutToUse = activeTab.layout || [];
                }

                setCurrentDashboard({
                    ...dashboard,
                    widgets: widgetsToUse,
                    layout: layoutToUse,
                    activeTabId: dashboard.activeTabId || (dashboard.tabs?.[0]?.id),
                });
            } else {
                // Create new dashboard if not found
                const newDashboard: Dashboard = {
                    id: dashboardId,
                    name: "Dashboard chưa đặt tên",
                    widgets: [],
                    layout: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                setCurrentDashboard(newDashboard);
            }
        };

        loadDashboard();
    }, [dashboardId]);

    // Enable editing mode by default for builder (separate effect to avoid dependency loop)
    useEffect(() => {
        // Always start in editing mode for the builder
        const dashboardStore = useDashboardStore.getState();
        if (!dashboardStore.isEditing) {
            dashboardStore.toggleEditing();
        }
    }, []); // Run only once on mount

    // Initialize undo/redo state when dashboard loads
    useEffect(() => {
        if (dashboardId === "new") return;
        if (currentDashboard) {
            initializeState({
                widgets: currentDashboard.widgets || [],
                layout: currentDashboard.layout || [],
                name: currentDashboard.name,
                description: currentDashboard.description,
            });
        }
    }, [dashboardId, currentDashboard?.id, initializeState, currentDashboard]);

    // Push state to history when widgets/layout change
    useEffect(() => {
        if (dashboardId === "new") return;
        if (currentDashboard && currentDashboard.widgets.length > 0) {
            pushState({
                widgets: currentDashboard.widgets,
                layout: currentDashboard.layout,
                name: currentDashboard.name,
                description: currentDashboard.description,
            });
        }
    }, [dashboardId, currentDashboard?.widgets, currentDashboard?.layout, currentDashboard?.name, currentDashboard?.description, currentDashboard, pushState]);

    // Handle undo/redo restore
    const handleUndoRedo = () => {
        const state = useUndoRedoStore.getState().present;
        if (state && currentDashboard) {
            updateDashboard(currentDashboard.id, {
                widgets: state.widgets,
                layout: state.layout,
            });
        }
    };

    // Handle template selection
    const handleSelectTemplate = async (template: { widgets: unknown[]; layout: unknown[] }) => {
        if (!currentDashboard) return;

        // Generate new IDs for widgets
        const newWidgets = template.widgets.map((w: unknown) => {
            const widget = w as { id: string; type: string; config: unknown; layout: unknown };
            const newId = generateId();
            return {
                ...widget,
                id: newId,
                layout: { ...(widget.layout as object), i: newId },
            };
        });

        const newLayout = newWidgets.map((w) => w.layout);

        updateDashboard(currentDashboard.id, {
            widgets: newWidgets as Dashboard['widgets'],
            layout: newLayout as Dashboard['layout'],
        });

        toast.success("Đã áp dụng template!");
    };

    // Handle version restore
    const handleVersionRestore = () => {
        // Refresh dashboard from server
        if (dashboardId && dashboardId !== "new") {
            fetchDashboard(dashboardId);
            toast.success("Đã khôi phục phiên bản");
        }
    };

    // Create version snapshot before save
    const createVersionSnapshot = async () => {
        if (!currentDashboard || dashboardId === "new") return;

        try {
            await fetch('/api/versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dashboardId: currentDashboard.id,
                    changeDescription: `Lưu lúc ${new Date().toLocaleString('vi-VN')}`,
                }),
            });
        } catch (error) {
            console.error('Error creating version snapshot:', error);
        }
    };

    const handleCreateDashboard = async () => {
        const newDashboard = await createDashboard(
            dashboardName || "Dashboard chưa đặt tên",
            dashboardDescription
        );
        if (newDashboard) {
            router.replace(`/builder/${newDashboard.id}`);
        }
        setShowNameDialog(false);
    };

    const handleSave = async () => {
        if (!currentDashboard) return;

        setIsSaving(true);
        try {
            // Create version snapshot before saving
            await createVersionSnapshot();

            // IMPORTANT: Sync active tab's widgets into the tabs array before saving
            let tabsToSave = currentDashboard.tabs || [];
            if (currentDashboard.activeTabId && tabsToSave.length > 0) {
                tabsToSave = tabsToSave.map(tab =>
                    tab.id === currentDashboard.activeTabId
                        ? { ...tab, widgets: currentDashboard.widgets, layout: currentDashboard.layout }
                        : tab
                );
            }

            // Update local state with synced tabs
            updateDashboard(currentDashboard.id, {
                widgets: currentDashboard.widgets,
                layout: currentDashboard.layout,
                tabs: tabsToSave,
                activeTabId: currentDashboard.activeTabId,
            });

            // Save to MongoDB
            const success = await saveDashboardToServer();

            if (success) {
                toast.success('Đã lưu dashboard thành công!');
            } else {
                console.error('Failed to save dashboard to server');
                toast.error('Lưu dashboard thất bại. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error saving dashboard:', error);
            toast.error('Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle drag end - add widget when dropped on grid
    // NOTE: data-field drops are handled by handleFieldDrop, not here
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && over.id === "dashboard-grid" && active.data.current) {
            const widgetData = active.data.current;

            // Skip data-field type - handled by handleFieldDrop
            if (widgetData.type === "data-field") return;
            const id = generateId();
            let config: any = {};
            let w = 4;
            let h = 4;

            if (widgetData.type === "chart" && widgetData.chart) {
                config = widgetData.chart;
                w = 6;
                h = 5;
            } else if (widgetData.type === "kpi") {
                config = { title: "KPI Mới", value: 0 };
                w = 3;
                h = 2;
            } else if (widgetData.type === "text") {
                config = { content: "Nhập văn bản mới...", fontSize: 16 };
                w = 12;
                h = 2;
            } else if (widgetData.type === "table") {
                config = { title: "Bảng dữ liệu" };
                w = 6;
                h = 4;
            } else if (widgetData.type === "image") {
                config = {
                    title: "",
                    url: "",
                    alt: "Hình ảnh",
                    objectFit: "contain"
                };
                w = 4;
                h = 4;
            } else if (widgetData.type === "iframe") {
                config = {
                    title: "",
                    url: "",
                    allowFullscreen: true,
                    sandbox: "allow-scripts allow-same-origin"
                };
                w = 6;
                h = 6;
            } else if (widgetData.type === "metric") {
                config = {
                    title: "Thuê bao PTM",
                    type: "hexagon",
                    dataSource: {
                        yAxis: ['value'],
                        xAxis: 'name'
                    },
                    style: {
                        cardIcon: "Activity",
                        colors: ["#3b82f6"]
                    }
                };
                w = 3;
                h = 3;
            } else if (widgetData.type === "map") {
                config = {
                    title: "Bản đồ phân bố",
                    type: "map",
                    dataSource: {
                        table: "TTVT_Data",
                        xAxis: "ma_ttvt",
                        yAxis: ["value"]
                    }
                };
                w = 8;
                h = 6;
            }

            // Find free position to avoid collisions
            const existingLayouts = currentDashboard?.widgets
                .map(w => w.layout)
                .filter((l): l is LayoutItem => l !== undefined) || [];

            const freePosition = findFreePosition(existingLayouts, w, h);

            addWidget({
                id,
                type: widgetData.type as WidgetType,
                config,
                layout: { i: id, x: freePosition.x, y: freePosition.y, w, h },
            });

            // Auto-select the new widget for Power BI-style inline editing
            if (widgetData.type === "chart") {
                useDashboardStore.getState().setSelectedWidgetId(id);
                // If it's a new empty chart (no data source), open Data tab
                if (!widgetData.chart?.dataSource?.table) {
                    useDashboardStore.getState().setRightPanelTab('data');
                } else {
                    useDashboardStore.getState().setRightPanelTab('build');
                }
            }
        }
    };

    if (dashboardId === "new") {
        return (
            <>
                <Header
                    title="Trình xây dựng Dashboard"
                    subtitle="Tạo mới dashboard"
                    showDatePicker={false}
                    showSearch={false}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push("/")}
                                className="gap-2 rounded-none font-bold"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Quay lại
                            </Button>
                        </div>
                    }
                />

                <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
                    <div className="text-center">
                        <p className="text-lg text-[#64748B]">Đang khởi tạo dashboard mới...</p>
                    </div>
                </div>

                <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tạo Dashboard Mới</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] mb-2 block">
                                    Tên Dashboard
                                </label>
                                <Input
                                    placeholder="VD: Tổng quan Thuê bao"
                                    value={dashboardName}
                                    onChange={(e) => setDashboardName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] mb-2 block">
                                    Mô tả (tùy chọn)
                                </label>
                                <Input
                                    placeholder="Mô tả ngắn về dashboard này"
                                    value={dashboardDescription}
                                    onChange={(e) => setDashboardDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => router.push("/")}>
                                Hủy
                            </Button>
                            <Button onClick={handleCreateDashboard}>Tạo Dashboard</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    if (!currentDashboard && dashboardId !== "new") {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-lg text-[#64748B]">Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    // Handle drag end for field wells (Phase 6: DnD)
    const handleFieldDrop = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !active.data.current) return;

        const overId = String(over.id);
        const activeData = active.data.current;

        // Handle field drops onto dashboard grid - create new chart
        if (overId === "dashboard-grid" && activeData.type === "data-field") {
            const field = activeData.field as string;
            const table = activeData.table as string;
            const fieldType = (activeData.fieldType as string || "").toLowerCase();
            const isNumeric = fieldType.includes("int") || fieldType.includes("decimal") || fieldType.includes("float") || fieldType.includes("numeric") || fieldType.includes("money");

            const newId = generateId();
            const existingLayouts = currentDashboard?.widgets
                .map(w => w.layout)
                .filter((l): l is LayoutItem => l !== undefined) || [];
            const freePos = findFreePosition(existingLayouts, 6, 5);

            const newConfig: import("@/types").ChartConfig = {
                name: `Biểu đồ - ${field}`,
                type: "bar",
                dataSource: {
                    table,
                    xAxis: isNumeric ? "" : field,
                    yAxis: isNumeric ? [field] : [],
                    aggregation: "sum",
                },
            };

            addWidget({
                id: newId,
                type: "chart" as WidgetType,
                config: newConfig,
                layout: { i: newId, x: freePos.x, y: freePos.y, w: 6, h: 5 },
            });

            useDashboardStore.getState().setSelectedWidgetId(newId);
            useDashboardStore.getState().setRightPanelTab('build');
            return;
        }

        // Handle field drops into field wells
        if (overId.startsWith("field-well-") && activeData.type === "data-field") {
            const wellId = overId.replace("field-well-", "");
            const field = activeData.field as string;
            const table = activeData.table as string;

            const selectedId = useDashboardStore.getState().selectedWidgetId;
            if (!selectedId) return;

            const widget = currentDashboard?.widgets.find((w) => w.id === selectedId);
            if (!widget || widget.type !== "chart") return;

            const config = widget.config as import("@/types").ChartConfig;
            const ds = config.dataSource || { table: "", xAxis: "", yAxis: [], aggregation: "sum" as const };

            let updates: Partial<import("@/types").ChartConfig> = {};

            switch (wellId) {
                case "xAxis":
                    updates = {
                        dataSource: { ...ds, table: ds.table || table, xAxis: field },
                    };
                    break;
                case "columnYAxis":
                    if (!ds.yAxis?.includes(field)) {
                        updates = {
                            dataSource: { ...ds, table: ds.table || table, yAxis: [...(ds.yAxis || []), field] },
                        };
                        // For composed chart, explicitly mark as bar
                        if (config.type === "composed") {
                            updates.style = {
                                ...config.style,
                                composedFieldTypes: {
                                    ...config.style?.composedFieldTypes,
                                    [field]: "bar",
                                },
                            };
                        }
                    }
                    break;
                case "lineYAxis": {
                    const existingSecondary = config.style?.secondaryYAxisFields || [];
                    if (!existingSecondary.includes(field)) {
                        // Also add to yAxis if not there
                        const newYAxis = ds.yAxis?.includes(field) ? ds.yAxis : [...(ds.yAxis || []), field];
                        updates = {
                            dataSource: { ...ds, table: ds.table || table, yAxis: newYAxis },
                            style: {
                                ...config.style,
                                secondaryYAxis: true,
                                secondaryYAxisFields: [...existingSecondary, field],
                                composedFieldTypes: {
                                    ...config.style?.composedFieldTypes,
                                    [field]: "line",
                                },
                            },
                        };
                        // Auto-switch to composed if needed
                        if (config.type === "bar" || config.type === "line") {
                            updates.type = "composed";
                        }
                    }
                    break;
                }
                case "legend": {
                    updates = {
                        dataSource: { ...ds, table: ds.table || table, groupBy: field },
                    };
                    break;
                }
                case "tooltips": {
                    const existingTooltips = config.fieldWells?.tooltipFields || [];
                    if (!existingTooltips.includes(field)) {
                        updates = {
                            fieldWells: {
                                ...config.fieldWells,
                                tooltipFields: [...existingTooltips, field],
                            },
                        };
                    }
                    break;
                }
            }

            if (Object.keys(updates).length > 0) {
                updateWidget(selectedId, {
                    config: { ...config, ...updates },
                });
            }
            return;
        }

        // Handle field drops into filter sections
        if (overId.startsWith("filter-section-") && activeData.type === "data-field") {
            const level = overId.replace("filter-section-", "") as "visual" | "page" | "report";
            const field = activeData.field as string;
            const newFilter = {
                id: generateId(),
                field,
                level,
                filterType: "basic" as const,
                operator: "in" as const,
                values: [] as (string | number)[],
                isActive: true,
            };

            if (level === "visual") {
                // Add to selected widget's visual filters
                const selectedId = useDashboardStore.getState().selectedWidgetId;
                if (!selectedId) return;
                const widget = currentDashboard?.widgets.find((w) => w.id === selectedId);
                if (!widget || widget.type !== "chart") return;
                const chartCfg = widget.config as import("@/types").ChartConfig;
                updateWidget(selectedId, {
                    config: {
                        ...chartCfg,
                        visualFilters: [...(chartCfg.visualFilters || []), newFilter],
                    },
                });
            } else if (level === "page") {
                if (currentDashboard) {
                    updateDashboard(currentDashboard.id, {
                        pageFilters: [...(currentDashboard.pageFilters || []), newFilter],
                    });
                }
            } else if (level === "report") {
                if (currentDashboard) {
                    updateDashboard(currentDashboard.id, {
                        reportFilters: [...(currentDashboard.reportFilters || []), newFilter],
                    });
                }
            }
            return;
        }
    };

    // Combined drag end handler
    const handleCombinedDragEnd = (event: DragEndEvent) => {
        // Try grid drop first
        handleDragEnd(event);
        // Then try field well drop
        handleFieldDrop(event);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Ribbon Toolbar (replaces Header) */}
            <RibbonToolbar
                onSave={handleSave}
                onToggleVersionHistory={() => setShowVersionHistory(true)}
                onToggleTemplateSelector={() => setShowTemplateSelector(true)}
                dashboardId={dashboardId}
            />

            <DndContext onDragEnd={handleCombinedDragEnd}>
                {/* Main content area: Canvas | Filter Panel | Viz Panel | Data Panel */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Center: Canvas */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        {/* Dashboard Header with Title, Description */}
                        <DashboardHeader />

                        {/* Enhanced Global Filters */}
                        <EnhancedGlobalFilters />

                        {/* Refresh Status */}
                        <RefreshStatus
                            onRefresh={handleRefreshData}
                            lastUpdated={lastDataUpdate}
                        />

                        {/* Grid Area with click-to-deselect */}
                        <div
                            className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-gray-950"
                            onClick={(e) => {
                                // Click on canvas background → deselect widget
                                if (e.target === e.currentTarget) {
                                    useDashboardStore.getState().setSelectedWidgetId(null);
                                }
                            }}
                        >
                            <div className={
                                currentDashboard?.layoutMode === 'full'
                                    ? "w-full px-4"
                                    : "w-full px-[3%]"
                            }>
                                <DashboardGrid
                                    refreshTrigger={lastDataUpdate}
                                    onDataUpdated={setLastDataUpdate}
                                />
                            </div>
                        </div>

                        {/* Page Tab Bar (bottom) */}
                        <PageTabBar />
                    </div>

                    {/* Right panels (Power BI style) */}
                    {isEditing && (
                        <>
                            {/* Filter Panel */}
                            <PowerBIFilterPanel />
                            {/* Visualization Panel (Build + Format) */}
                            <VisualizationPanel />
                            {/* Data Panel (datasets + draggable fields) - toggleable */}
                            {showDataPanel && (
                                <DataPanel onClose={() => setShowDataPanel(false)} />
                            )}
                        </>
                    )}
                </div>
            </DndContext>

            {/* Create Dashboard Dialog */}
            <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo Dashboard Mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-[#0F172A] mb-2 block">
                                Tên Dashboard
                            </label>
                            <Input
                                placeholder="VD: Tổng quan Thuê bao"
                                value={dashboardName}
                                onChange={(e) => setDashboardName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#0F172A] mb-2 block">
                                Mô tả (tùy chọn)
                            </label>
                            <Input
                                placeholder="Mô tả ngắn về dashboard này"
                                value={dashboardDescription}
                                onChange={(e) => setDashboardDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => router.push("/")}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreateDashboard}>Tạo Dashboard</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Version History Sheet */}
            {dashboardId !== "new" && currentDashboard && (
                <VersionHistory
                    dashboardId={currentDashboard.id}
                    open={showVersionHistory}
                    onOpenChange={setShowVersionHistory}
                    onRestore={handleVersionRestore}
                />
            )}

            {/* Template Selector Dialog */}
            <TemplateSelector
                open={showTemplateSelector}
                onOpenChange={setShowTemplateSelector}
                onSelectTemplate={handleSelectTemplate}
            />
        </div>
    );
}
