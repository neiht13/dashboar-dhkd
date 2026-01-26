"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Edit2, Check, FileText, Share2, Link, Copy, ExternalLink, Lock } from "lucide-react";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2 } from "lucide-react";

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

    const [shareLinkSecret, setShareLinkSecret] = useState<string | null>(null);

    const handleCreateShareLink = async (type: 'public' | 'jwt' = 'public') => {
        setIsCreatingLink(true);
        setShareLink("");
        setShareLinkSecret(null);

        try {
            const result = await createShareLink(currentDashboard.id, {
                permission: 'view',
                type // Pass type to store/API
            });
            if (result) {
                setShareLink(result.publicUrl);
                if (result.secretKey) {
                    setShareLinkSecret(result.secretKey);
                }
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

                        {/* Delete Dashboard Button */}
                        {isEditing && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Xóa
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-slate-900">Xóa Dashboard?</h4>
                                        <p className="text-sm text-slate-500">
                                            Hành động này không thể hoàn tác. Dashboard sẽ bị xóa vĩnh viễn.
                                        </p>
                                        <div className="flex justify-end gap-2">
                                            {/* We can use a close button if needed, but clicking outside works too */}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                    const { deleteDashboard } = useDashboardStore.getState();
                                                    deleteDashboard(currentDashboard.id).then((success) => {
                                                        if (success) {
                                                            window.location.href = '/dashboards';
                                                        }
                                                    });
                                                }}
                                            >
                                                Xác nhận xóa
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
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
                                                onClick={(e) => {
                                                    // Only stop propagation here if not using Popover, but with Popover we wrap it
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <span className="flex items-center justify-center w-full h-full"> {/* Span to handle trigger events properly inside button */}
                                                            <X className="h-2.5 w-2.5" />
                                                        </span>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-56 p-3" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-xs text-slate-900">Xóa Tab này?</h4>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="h-6 text-xs px-2"
                                                                    onClick={(e) => handleDeleteTab(tab.id, e)}
                                                                >
                                                                    Xác nhận
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
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
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Chia sẻ Dashboard
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="flex bg-slate-100 rounded-lg p-1 mb-6 w-fit text-sm">
                            <button
                                onClick={() => {
                                    setShareLink("");
                                    setIsCreatingLink(false);
                                    // Reset to public mode (logic in create handler)
                                }}
                                className={cn(
                                    "px-4 py-1.5 rounded-md font-medium transition-all",
                                    !shareLink.includes("auth=") ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Public Link
                            </button>
                            <button
                                onClick={() => {
                                    setShareLink("");
                                    setIsCreatingLink(false);
                                    // Reset to secure mode
                                }}
                                className={cn(
                                    "px-4 py-1.5 rounded-md font-medium transition-all",
                                    shareLink.includes("auth=") || (shareLink && shareLink.includes("secret=")) ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Secure Embed (JWT)
                            </button>
                        </div>

                        {!shareLink ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600">
                                    Chọn phương thức chia sẻ để tạo link mới.
                                </p>
                                <div className="flex gap-4">
                                    <Button onClick={() => handleCreateShareLink()} className="flex-1" variant="outline">
                                        Tạo Public Link
                                    </Button>
                                    <Button onClick={() => handleCreateShareLink('jwt')} className="flex-1">
                                        Tạo Secure Link
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isCreatingLink ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Show Secret Key for JWT links */}
                                        {shareLinkSecret && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                                    <Lock className="w-4 h-4" /> Secret Key (Lưu ngay, sẽ không hiển thị lại)
                                                </h4>
                                                <div className="flex gap-2">
                                                    <code className="flex-1 bg-white border border-amber-200 px-3 py-2 rounded text-xs font-mono break-all text-amber-900">
                                                        {shareLinkSecret}
                                                    </code>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-auto text-amber-800 hover:text-amber-900 hover:bg-amber-100"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(shareLinkSecret);
                                                            // toast success
                                                        }}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Link chia sẻ</label>
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
                                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {shareLinkSecret && (
                                            <div className="space-y-2 pt-2">
                                                <label className="text-sm font-medium text-slate-700">Hướng dẫn tích hợp (Node.js)</label>
                                                <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                                                    <pre className="text-xs text-slate-300 font-mono">
                                                        {`const jwt = require('jsonwebtoken');

const secret = '${shareLinkSecret}';
const token = jwt.sign({ 
  email: 'user@example.com', 
  role: 'viewer' 
}, secret, { expiresIn: '1h' });

const embedUrl = \`\${dashUrl}&auth=\${token}\`;`}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 mt-4"
                                            onClick={() => window.open(shareLink, '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Mở trong tab mới
                                        </Button>
                                    </>
                                )}
                            </div>
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
