"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Edit2, Check, FileText, Share2, Link, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import { generateId } from "@/lib/utils";
import type { DashboardTab } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export function DashboardHeader() {
    const {
        currentDashboard,
        updateDashboard,
        createShareLink,
        isEditing
    } = useDashboardStore();

    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [tabName, setTabName] = useState("");
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    // Sync state with currentDashboard
    useEffect(() => {
        if (currentDashboard) {
            setTitle(currentDashboard.name || "");
            setDescription(currentDashboard.description || "");
        }
    }, [currentDashboard?.id, currentDashboard?.name, currentDashboard?.description]);

    if (!currentDashboard) return null;

    // Initialize tabs if empty and ensure "Tổng quan" exists
    useEffect(() => {
        if (currentDashboard && (!currentDashboard.tabs || currentDashboard.tabs.length === 0)) {
            const overviewTab: DashboardTab = {
                id: generateId(),
                name: "Tổng quan",
                widgets: currentDashboard.widgets || [],
                layout: currentDashboard.layout || [],
            };
            updateDashboard(currentDashboard.id, {
                tabs: [overviewTab],
                activeTabId: overviewTab.id,
                widgets: overviewTab.widgets,
                layout: overviewTab.layout
            });
        } else if (currentDashboard && !currentDashboard.activeTabId && currentDashboard.tabs && currentDashboard.tabs.length > 0) {
            // If has tabs but no active one, select the first one
            const firstTab = currentDashboard.tabs[0];
            updateDashboard(currentDashboard.id, {
                activeTabId: firstTab.id,
                widgets: firstTab.widgets,
                layout: firstTab.layout
            });
        }
    }, [currentDashboard?.id]); // Only check when ID changes to avoid loops

    const tabs = currentDashboard.tabs || [];
    const activeTabId = currentDashboard.activeTabId;

    const handleSaveTitle = () => {
        if (title.trim()) {
            updateDashboard(currentDashboard.id, { name: title.trim() });
        }
        setEditingTitle(false);
    };

    const handleSaveDescription = () => {
        updateDashboard(currentDashboard.id, { description: description.trim() });
        setEditingDescription(false);
    };

    const handleAddTab = () => {
        const newTab: DashboardTab = {
            id: generateId(),
            name: `Tab ${tabs.length + 1}`,
            widgets: [],
            layout: [],
        };

        // Save current active tab content
        const updatedTabs = tabs.map(tab =>
            tab.id === activeTabId
                ? { ...tab, widgets: currentDashboard.widgets, layout: currentDashboard.layout }
                : tab
        );

        updateDashboard(currentDashboard.id, {
            tabs: [...updatedTabs, newTab],
            activeTabId: newTab.id,
            widgets: [],
            layout: [],
        });
    };

    const handleSelectTab = (tabId: string) => {
        if (tabId === activeTabId) return;

        // Save current widgets to current tab before switching
        const updatedTabs = tabs.map(tab =>
            tab.id === activeTabId
                ? { ...tab, widgets: currentDashboard.widgets, layout: currentDashboard.layout }
                : tab
        );

        // Load new tab's widgets
        const newTab = updatedTabs.find(t => t.id === tabId);
        if (newTab) {
            updateDashboard(currentDashboard.id, {
                tabs: updatedTabs,
                activeTabId: tabId,
                widgets: newTab.widgets,
                layout: newTab.layout,
            });
        }
    };

    const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Don't allow deleting the last tab
        if (tabs.length <= 1) return;

        const updatedTabs = tabs.filter(t => t.id !== tabId);
        let updates: Partial<typeof currentDashboard> = { tabs: updatedTabs };

        // If deleting active tab, switch to another one
        if (activeTabId === tabId) {
            const nextTab = updatedTabs[0];
            updates.activeTabId = nextTab.id;
            updates.widgets = nextTab.widgets;
            updates.layout = nextTab.layout;
        }

        updateDashboard(currentDashboard.id, updates as any);
    };

    const handleStartRenameTab = (tabId: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTabId(tabId);
        setTabName(currentName);
    };

    const handleRenameTab = () => {
        if (editingTabId && tabName.trim()) {
            const updatedTabs = tabs.map(tab =>
                tab.id === editingTabId ? { ...tab, name: tabName.trim() } : tab
            );
            updateDashboard(currentDashboard.id, { tabs: updatedTabs });
        }
        setEditingTabId(null);
        setTabName("");
    };

    const handleCreateShareLink = async () => {
        setIsCreatingLink(true);
        try {
            const result = await createShareLink(currentDashboard.id, {
                permission: 'view',
            });
            if (result) {
                setShareLink(result.publicUrl);
            } else {
                // Fallback: create local URL
                const url = `${window.location.origin}/share/${currentDashboard.id}`;
                setShareLink(url);
            }
        } catch (error) {
            // Fallback
            const url = `${window.location.origin}/share/${currentDashboard.id}`;
            setShareLink(url);
        } finally {
            setIsCreatingLink(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
                {/* Title and Description Row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        {/* Title */}
                        <div className="flex items-center gap-2 mb-1">
                            {editingTitle && isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="text-xl font-bold h-9 w-[300px]"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                        onBlur={handleSaveTitle}
                                    />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold text-[#0F172A]">
                                        {currentDashboard.name}
                                    </h1>
                                    {isEditing && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-50 hover:opacity-100"
                                            onClick={() => setEditingTitle(true)}
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Description */}
                        <div className="flex items-center gap-2">
                            {editingDescription && isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Thêm mô tả..."
                                        className="text-sm h-8 w-[400px]"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveDescription()}
                                        onBlur={handleSaveDescription}
                                    />
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-[#64748B]">
                                        {currentDashboard.description || (isEditing ? "Click để thêm mô tả..." : "")}
                                    </p>
                                    {isEditing && !currentDashboard.description && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 opacity-50 hover:opacity-100"
                                            onClick={() => setEditingDescription(true)}
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Layout Mode Toggle + Share Button */}
                    <div className="flex items-center gap-2">
                        {/* Layout Mode Toggle */}
                        {isEditing && (
                            <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
                                <button
                                    onClick={() => updateDashboard(currentDashboard.id, { layoutMode: 'box' })}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                        (currentDashboard.layoutMode || 'box') === 'box'
                                            ? "bg-white text-[#0F172A] shadow-sm"
                                            : "text-[#64748B] hover:text-[#0F172A]"
                                    )}
                                >
                                    Box
                                </button>
                                <button
                                    onClick={() => updateDashboard(currentDashboard.id, { layoutMode: 'full' })}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                        currentDashboard.layoutMode === 'full'
                                            ? "bg-white text-[#0F172A] shadow-sm"
                                            : "text-[#64748B] hover:text-[#0F172A]"
                                    )}
                                >
                                    Full
                                </button>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                                setShowShareDialog(true);
                                handleCreateShareLink();
                            }}
                        >
                            <Share2 className="h-4 w-4" />
                            Chia sẻ
                        </Button>
                    </div>
                </div>

                {/* Tabs Row - separate from title row */}
                <div className="flex items-center gap-1 overflow-x-auto">

                    {/* Custom tabs */}
                    {tabs.map((tab) => (
                        <div key={tab.id} className="relative group flex">
                            {editingTabId === tab.id ? (
                                <Input
                                    value={tabName}
                                    onChange={(e) => setTabName(e.target.value)}
                                    className="h-9 w-[120px] text-sm rounded-t-lg"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenameTab();
                                        if (e.key === "Escape") {
                                            setEditingTabId(null);
                                            setTabName("");
                                        }
                                    }}
                                    onBlur={handleRenameTab}
                                />
                            ) : (
                                <button
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2",
                                        activeTabId === tab.id
                                            ? "bg-[#0052CC] text-white"
                                            : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                                    )}
                                    onClick={() => handleSelectTab(tab.id)}
                                >
                                    {tab.name}

                                    {isEditing && (
                                        <div className="flex items-center gap-0.5 ml-1">
                                            <button
                                                className={cn(
                                                    "h-4 w-4 rounded flex items-center justify-center opacity-60 hover:opacity-100",
                                                    activeTabId === tab.id
                                                        ? "hover:bg-white/20"
                                                        : "hover:bg-[#CBD5E1]"
                                                )}
                                                onClick={(e) => handleStartRenameTab(tab.id, tab.name, e)}
                                            >
                                                <Edit2 className="h-2.5 w-2.5" />
                                            </button>
                                            <button
                                                className={cn(
                                                    "h-4 w-4 rounded flex items-center justify-center opacity-60 hover:opacity-100",
                                                    activeTabId === tab.id
                                                        ? "hover:bg-red-400"
                                                        : "hover:bg-red-100 hover:text-red-600"
                                                )}
                                                onClick={(e) => handleDeleteTab(tab.id, e)}
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </div>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add tab button */}
                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-[#64748B] hover:text-[#0052CC]"
                            onClick={handleAddTab}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Thêm tab
                        </Button>
                    )}
                </div>
            </div>

            {/* Share Dialog */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Chia sẻ Dashboard
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-[#64748B] mb-4">
                            Chia sẻ dashboard "{currentDashboard.name}" với người khác thông qua link bên dưới.
                        </p>

                        {isCreatingLink ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
                            </div>
                        ) : shareLink ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center bg-[#F1F5F9] rounded-lg px-3 py-2">
                                        <Link className="h-4 w-4 text-[#64748B] mr-2 flex-shrink-0" />
                                        <span className="text-sm text-[#0F172A] truncate">{shareLink}</span>
                                    </div>
                                    <Button
                                        variant={copied ? "default" : "outline"}
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleCopyLink}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Đã copy
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={() => window.open(shareLink, '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Mở trong tab mới
                                </Button>
                            </div>
                        ) : (
                            <p className="text-center text-[#94A3B8] py-4">
                                Không thể tạo link chia sẻ
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
