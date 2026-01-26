"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Save, Eye, Edit3, ArrowLeft, History, Layout, Palette } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardGrid } from "@/components/dashboard-builder/DashboardGrid";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardHeader } from "@/components/dashboard-builder/DashboardHeader";
import { EnhancedGlobalFilters } from "@/components/dashboard-builder/EnhancedGlobalFilters";
import { RefreshStatus } from "@/components/dashboard-builder/RefreshStatus";
import { useDashboardStore } from "@/stores/dashboard-store";
import { generateId } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import type { Dashboard, WidgetType } from "@/types";
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
        saveDashboardToServer,
        fetchDashboard,
        isEditing,
        toggleEditing,
        isSaving,
        setIsSaving,
    } = useDashboardStore();

    const [showNameDialog, setShowNameDialog] = useState(false);
    const [dashboardName, setDashboardName] = useState("");
    const [dashboardDescription, setDashboardDescription] = useState("");
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
    
    // Undo/Redo integration
    const { initializeState, pushState } = useUndoRedoStore();

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
        if (currentDashboard) {
            initializeState({
                widgets: currentDashboard.widgets || [],
                layout: currentDashboard.layout || [],
                name: currentDashboard.name,
                description: currentDashboard.description,
            });
        }
    }, [currentDashboard?.id]);

    // Push state to history when widgets/layout change
    useEffect(() => {
        if (currentDashboard && currentDashboard.widgets.length > 0) {
            pushState({
                widgets: currentDashboard.widgets,
                layout: currentDashboard.layout,
                name: currentDashboard.name,
                description: currentDashboard.description,
            });
        }
    }, [currentDashboard?.widgets, currentDashboard?.layout]);

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
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && over.id === "dashboard-grid" && active.data.current) {
            const widgetData = active.data.current;
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
            }

            addWidget({
                id,
                type: widgetData.type as WidgetType,
                config,
                layout: { i: id, x: 0, y: 0, w, h },
            });
        }
    };

    if (!currentDashboard && dashboardId !== "new") {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-lg text-[#64748B]">Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header
                title={currentDashboard?.name || "Trình xây dựng Dashboard"}
                subtitle={isEditing ? "Đang chỉnh sửa" : "Xem trước"}
                showDatePicker={false}
                showSearch={false}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/")}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>

                        {/* Undo/Redo Controls */}
                        {isEditing && (
                            <UndoRedoControls 
                                onUndo={handleUndoRedo} 
                                onRedo={handleUndoRedo}
                                size="sm"
                            />
                        )}

                        {/* Template Selector */}
                        {isEditing && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTemplateSelector(true)}
                                className="gap-2"
                            >
                                <Layout className="h-4 w-4" />
                                Template
                            </Button>
                        )}

                        {/* Version History */}
                        {dashboardId !== "new" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowVersionHistory(true)}
                                className="gap-2"
                            >
                                <History className="h-4 w-4" />
                                Lịch sử
                            </Button>
                        )}

                        <Button
                            variant={isEditing ? "secondary" : "outline"}
                            size="sm"
                            onClick={toggleEditing}
                            className="gap-2"
                        >
                            {isEditing ? (
                                <>
                                    <Eye className="h-4 w-4" />
                                    Xem trước
                                </>
                            ) : (
                                <>
                                    <Edit3 className="h-4 w-4" />
                                    Chỉnh sửa
                                </>
                            )}
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Đang lưu..." : "Lưu"}
                        </Button>
                    </div>
                }
            />

            <DndContext onDragEnd={handleDragEnd}>
                <div className="flex-1 flex overflow-hidden">
                    {/* Widget Library (visible in edit mode) */}
                    {isEditing && <WidgetLibrary />}

                    {/* Main Canvas */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Dashboard Header with Title, Description, Tabs */}
                        <DashboardHeader />

                        {/* Enhanced Global Filters */}
                        <EnhancedGlobalFilters />

                        {/* Refresh Status */}
                        <RefreshStatus
                            onRefresh={handleRefreshData}
                            lastUpdated={lastDataUpdate}
                        />

                        {/* Grid Area */}
                        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                            <div className={
                                currentDashboard?.layoutMode === 'full'
                                    ? "w-full px-4"
                                    : "w-full px-[7.5%]"
                            }>


                                <DashboardGrid
                                    refreshTrigger={lastDataUpdate}
                                    onDataUpdated={setLastDataUpdate}
                                />
                            </div>
                        </div>
                    </div>
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
        </>
    );
}
