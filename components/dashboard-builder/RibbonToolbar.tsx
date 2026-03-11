"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Save, Eye, Edit3, History, Layout,
    Undo2, Redo2, Filter, PanelRight, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useUndoRedoStore } from "@/stores/undo-redo-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";

interface RibbonToolbarProps {
    onSave: () => void;
    onToggleVersionHistory: () => void;
    onToggleTemplateSelector: () => void;
    dashboardId: string;
}

export function RibbonToolbar({
    onSave,
    onToggleVersionHistory,
    onToggleTemplateSelector,
    dashboardId,
}: RibbonToolbarProps) {
    const router = useRouter();

    const {
        currentDashboard,
        isEditing,
        toggleEditing,
        isSaving,
        showFilterPanel,
        setShowFilterPanel,
        showDataPanel,
        setShowDataPanel,
    } = useDashboardStore(
        useShallow((s) => ({
            currentDashboard: s.currentDashboard,
            isEditing: s.isEditing,
            toggleEditing: s.toggleEditing,
            isSaving: s.isSaving,
            showFilterPanel: s.showFilterPanel,
            setShowFilterPanel: s.setShowFilterPanel,
            showDataPanel: s.showDataPanel,
            setShowDataPanel: s.setShowDataPanel,
        }))
    );

    const { canUndo, canRedo, undo, redo } = useUndoRedoStore(
        useShallow((s) => ({
            canUndo: s.past.length > 0,
            canRedo: s.future.length > 0,
            undo: s.undo,
            redo: s.redo,
        }))
    );

    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2">
            {/* Top bar: Title + actions */}
            <div className="flex items-center h-10 gap-2">
                {/* Back button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/")}
                    className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                {/* Dashboard name */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {currentDashboard?.name || "Dashboard"}
                    </h1>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1">
                    {/* Undo/Redo */}
                    {isEditing && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={undo}
                                disabled={!canUndo}
                                className="h-7 w-7 p-0"
                                title="Hoàn tác"
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={redo}
                                disabled={!canRedo}
                                className="h-7 w-7 p-0"
                                title="Làm lại"
                            >
                                <Redo2 className="h-3.5 w-3.5" />
                            </Button>

                            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                        </>
                    )}

                    {/* Toggle filter panel */}
                    <Button
                        variant={showFilterPanel ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className="h-7 px-2 gap-1 text-xs"
                        title="Bộ lọc"
                    >
                        <Filter className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Bộ lọc</span>
                    </Button>

                    {/* Toggle data panel */}
                    <Button
                        variant={showDataPanel ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowDataPanel(!showDataPanel)}
                        className="h-7 px-2 gap-1 text-xs"
                        title="Dữ liệu"
                    >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Dữ liệu</span>
                    </Button>

                    {/* Template */}
                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleTemplateSelector}
                            className="h-7 px-2 gap-1 text-xs"
                            title="Template"
                        >
                            <Layout className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Template</span>
                        </Button>
                    )}

                    {/* Version History */}
                    {dashboardId !== "new" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleVersionHistory}
                            className="h-7 px-2 gap-1 text-xs"
                            title="Lịch sử"
                        >
                            <History className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Lịch sử</span>
                        </Button>
                    )}

                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

                    {/* Edit / Preview toggle */}
                    <Button
                        variant={isEditing ? "secondary" : "outline"}
                        size="sm"
                        onClick={toggleEditing}
                        className="h-7 px-2 gap-1 text-xs"
                    >
                        {isEditing ? (
                            <>
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Xem trước</span>
                            </>
                        ) : (
                            <>
                                <Edit3 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Chỉnh sửa</span>
                            </>
                        )}
                    </Button>

                    {/* Save */}
                    <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className="h-7 px-3 gap-1 text-xs"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Lưu..." : "Lưu"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
