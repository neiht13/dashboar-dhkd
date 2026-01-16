"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Save, Eye, Edit3, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardGrid } from "@/components/dashboard-builder/DashboardGrid";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardHeader } from "@/components/dashboard-builder/DashboardHeader";
import { GlobalFilters } from "@/components/dashboard-builder/GlobalFilters";
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
                console.log('Dashboard saved successfully');
            } else {
                console.error('Failed to save dashboard to server');
                alert('Lưu dashboard thất bại. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error saving dashboard:', error);
            alert('Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
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

                        {/* Global Filters */}
                        <GlobalFilters />

                        {/* Grid Area */}
                        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                            <div className={
                                currentDashboard?.layoutMode === 'full'
                                    ? "w-full px-4"
                                    : "w-full px-[7.5%]"
                            }>


                                <DashboardGrid />
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
        </>
    );
}
