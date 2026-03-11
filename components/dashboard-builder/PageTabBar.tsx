"use client";

import React, { useState } from "react";
import { Plus, X, MoreHorizontal, ChevronRight, ArrowLeft } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import type { DashboardTab } from "@/types";

export function PageTabBar() {
    const {
        currentDashboard,
        updateDashboard,
        setCurrentDashboard,
        isEditing,
        drilldownStack,
        popDrilldown,
    } = useDashboardStore(
        useShallow((s) => ({
            currentDashboard: s.currentDashboard,
            updateDashboard: s.updateDashboard,
            setCurrentDashboard: s.setCurrentDashboard,
            isEditing: s.isEditing,
            drilldownStack: s.drilldownStack,
            popDrilldown: s.popDrilldown,
        }))
    );

    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState("");

    if (!currentDashboard) return null;

    const tabs = currentDashboard.tabs || [];
    const activeTabId = currentDashboard.activeTabId || tabs[0]?.id;

    const handleSwitchTab = (tabId: string) => {
        if (!currentDashboard) return;

        // Save current tab's widgets
        const updatedTabs = tabs.map((tab) =>
            tab.id === activeTabId
                ? { ...tab, widgets: currentDashboard.widgets, layout: currentDashboard.layout }
                : tab
        );

        // Load target tab's widgets
        const targetTab = updatedTabs.find((t) => t.id === tabId);
        if (targetTab) {
            setCurrentDashboard({
                ...currentDashboard,
                tabs: updatedTabs,
                activeTabId: tabId,
                widgets: targetTab.widgets || [],
                layout: targetTab.layout || [],
            });
        }
    };

    const handleAddTab = () => {
        if (!currentDashboard) return;

        const newTab: DashboardTab = {
            id: generateId(),
            name: `Page ${tabs.length + 1}`,
            widgets: [],
            layout: [],
        };

        // Save current widgets to active tab
        const updatedTabs = tabs.map((tab) =>
            tab.id === activeTabId
                ? { ...tab, widgets: currentDashboard.widgets, layout: currentDashboard.layout }
                : tab
        );

        setCurrentDashboard({
            ...currentDashboard,
            tabs: [...updatedTabs, newTab],
            activeTabId: newTab.id,
            widgets: [],
            layout: [],
        });
    };

    const handleRemoveTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length <= 1) return;

        const newTabs = tabs.filter((t) => t.id !== tabId);
        const newActiveId = tabId === activeTabId ? newTabs[0]?.id : activeTabId;
        const activeTab = newTabs.find((t) => t.id === newActiveId);

        setCurrentDashboard({
            ...currentDashboard,
            tabs: newTabs,
            activeTabId: newActiveId,
            widgets: activeTab?.widgets || [],
            layout: activeTab?.layout || [],
        });
    };

    const handleDoubleClick = (tab: DashboardTab) => {
        if (!isEditing) return;
        setEditingTabId(tab.id);
        setEditingTabName(tab.name);
    };

    const handleRenameSubmit = () => {
        if (!editingTabId || !currentDashboard) return;
        const newTabs = tabs.map((t) =>
            t.id === editingTabId ? { ...t, name: editingTabName } : t
        );
        updateDashboard(currentDashboard.id, { tabs: newTabs });
        setCurrentDashboard({ ...currentDashboard, tabs: newTabs });
        setEditingTabId(null);
    };

    // If no tabs, show default single page
    if (tabs.length === 0) {
        return (
            <div className="h-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-2 gap-1">
                <div className="flex items-center h-full">
                    <div className="px-3 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border-t-2 border-yellow-500 rounded-t">
                        Page 1
                    </div>
                </div>
                {isEditing && (
                    <button
                        onClick={handleAddTab}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Thêm trang"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }

    // Current drilldown filters
    const currentFilters = drilldownStack.length > 0
        ? drilldownStack[drilldownStack.length - 1]?.filters || {}
        : {};
    const filterEntries = Object.entries(currentFilters);

    return (
        <div className="h-auto min-h-[32px] bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-end px-2 gap-0.5 overflow-x-auto">
            {/* Drilldown breadcrumb */}
            {drilldownStack.length > 0 && (
                <div className="flex items-center gap-1 mr-1">
                    <button
                        onClick={() => {
                            const prev = drilldownStack[drilldownStack.length - 1];
                            popDrilldown();
                            if (prev && currentDashboard) {
                                handleSwitchTab(prev.tabId);
                            }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-t"
                        title="Quay lại trang trước"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Quay lại</span>
                    </button>
                    {/* Active filter badges */}
                    {filterEntries.length > 0 && filterEntries.map(([key, val]) => (
                        <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            {key}: {val}
                        </span>
                    ))}
                </div>
            )}
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    onClick={() => handleSwitchTab(tab.id)}
                    onDoubleClick={() => handleDoubleClick(tab)}
                    className={cn(
                        "flex items-center gap-1 px-3 py-1 text-[11px] font-medium cursor-pointer rounded-t transition-colors group relative",
                        tab.id === activeTabId
                            ? "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-t-2 border-yellow-500"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    {editingTabId === tab.id ? (
                        <input
                            value={editingTabName}
                            onChange={(e) => setEditingTabName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                            className="w-20 h-5 px-1 text-[11px] bg-white dark:bg-gray-800 border border-blue-400 rounded outline-none"
                            autoFocus
                        />
                    ) : (
                        <span className="truncate max-w-[120px]">{tab.name}</span>
                    )}
                    {isEditing && tabs.length > 1 && (
                        <button
                            onClick={(e) => handleRemoveTab(tab.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            ))}

            {isEditing && (
                <button
                    onClick={handleAddTab}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-0.5"
                    title="Thêm trang"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
