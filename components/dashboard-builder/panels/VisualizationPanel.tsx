"use client";

import React from "react";
import { BarChart3, Paintbrush } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";
import { BuildVisualTab } from "./BuildVisualTab";
import { FormatVisualTab } from "./FormatVisualTab";
import { cn } from "@/lib/utils";

const TABS = [
    { id: "build" as const, icon: BarChart3, label: "Xây dựng" },
    { id: "format" as const, icon: Paintbrush, label: "Định dạng" },
];

export function VisualizationPanel() {
    const { rightPanelTab, setRightPanelTab } = useDashboardStore(
        useShallow((s) => ({
            rightPanelTab: s.rightPanelTab,
            setRightPanelTab: s.setRightPanelTab,
        }))
    );

    // Map old 'data' tab to 'build' since data tab is now separate panel
    const activeTab = rightPanelTab === "data" ? "build" : rightPanelTab;

    return (
        <div className="w-[280px] flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
            {/* Tabs header */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {TABS.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setRightPanelTab(id)}
                        className={cn(
                            "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors border-b-2",
                            activeTab === id
                                ? "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-white dark:bg-gray-900"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        title={label}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "build" && <BuildVisualTab />}
                {activeTab === "format" && <FormatVisualTab />}
            </div>
        </div>
    );
}
