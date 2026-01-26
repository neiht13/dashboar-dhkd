"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, RefreshCw, Save, Share2, X, Clock, ChevronDown, Copy } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FilterPreset {
    id: string;
    name: string;
    dateRange: {
        from: Date | undefined;
        to: Date | undefined;
    };
    resolution: 'day' | 'month' | 'year';
    isDefault?: boolean;
}

const DEFAULT_PRESETS: FilterPreset[] = [
    {
        id: 'today',
        name: 'Hôm nay',
        dateRange: {
            from: new Date(new Date().setHours(0, 0, 0, 0)),
            to: new Date(),
        },
        resolution: 'day',
        isDefault: true,
    },
    {
        id: 'yesterday',
        name: 'Hôm qua',
        dateRange: {
            from: new Date(new Date().setDate(new Date().getDate() - 1)),
            to: new Date(new Date().setDate(new Date().getDate() - 1)),
        },
        resolution: 'day',
        isDefault: true,
    },
    {
        id: 'last7days',
        name: '7 ngày qua',
        dateRange: {
            from: new Date(new Date().setDate(new Date().getDate() - 7)),
            to: new Date(),
        },
        resolution: 'day',
        isDefault: true,
    },
    {
        id: 'last30days',
        name: '30 ngày qua',
        dateRange: {
            from: new Date(new Date().setDate(new Date().getDate() - 30)),
            to: new Date(),
        },
        resolution: 'day',
        isDefault: true,
    },
    {
        id: 'thisMonth',
        name: 'Tháng này',
        dateRange: {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            to: new Date(),
        },
        resolution: 'day',
        isDefault: true,
    },
    {
        id: 'lastMonth',
        name: 'Tháng trước',
        dateRange: {
            from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
        },
        resolution: 'month',
        isDefault: true,
    },
    {
        id: 'thisYear',
        name: 'Năm này',
        dateRange: {
            from: new Date(new Date().getFullYear(), 0, 1),
            to: new Date(),
        },
        resolution: 'month',
        isDefault: true,
    },
];

export function EnhancedGlobalFilters() {
    const { globalFilters, setGlobalFilters, currentDashboard } = useDashboardStore();
    const [presets, setPresets] = useState<FilterPreset[]>(() => {
        const stored = localStorage.getItem('dashboard-filter-presets');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return [...DEFAULT_PRESETS, ...parsed];
            } catch {
                return DEFAULT_PRESETS;
            }
        }
        return DEFAULT_PRESETS;
    });
    const [showPresetDialog, setShowPresetDialog] = useState(false);
    const [presetName, setPresetName] = useState("");
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setGlobalFilters({
            dateRange: {
                from: range?.from,
                to: range?.to
            }
        });
    };

    const handleClearFilters = () => {
        setGlobalFilters({
            dateRange: { from: undefined, to: undefined }
        });
    };

    const handleApplyPreset = (preset: FilterPreset) => {
        setGlobalFilters({
            dateRange: preset.dateRange,
            resolution: preset.resolution,
        });
    };

    const handleSavePreset = () => {
        if (!presetName.trim()) return;

        const newPreset: FilterPreset = {
            id: `custom-${Date.now()}`,
            name: presetName.trim(),
            dateRange: globalFilters.dateRange,
            resolution: globalFilters.resolution,
        };

        const customPresets = presets.filter(p => !p.isDefault);
        const updated = [...customPresets, newPreset];
        setPresets([...DEFAULT_PRESETS, ...updated]);
        localStorage.setItem('dashboard-filter-presets', JSON.stringify(updated));
        setShowPresetDialog(false);
        setPresetName("");
    };

    const handleDeletePreset = (id: string) => {
        const updated = presets.filter(p => p.id !== id);
        const customPresets = updated.filter(p => !p.isDefault);
        setPresets(updated);
        localStorage.setItem('dashboard-filter-presets', JSON.stringify(customPresets));
    };

    const handleShareFilters = () => {
        if (!currentDashboard) return;

        const filterParams = new URLSearchParams();
        if (globalFilters.dateRange.from) {
            filterParams.set('from', globalFilters.dateRange.from.toISOString());
        }
        if (globalFilters.dateRange.to) {
            filterParams.set('to', globalFilters.dateRange.to.toISOString());
        }
        if (globalFilters.resolution) {
            filterParams.set('resolution', globalFilters.resolution);
        }

        const url = `${window.location.origin}/share/${currentDashboard.id}?${filterParams.toString()}`;
        setShareUrl(url);
        setShowShareDialog(true);
    };

    const handleCopyShareUrl = () => {
        navigator.clipboard.writeText(shareUrl);
    };

    const dateRangeValue: DateRange | undefined =
        globalFilters.dateRange.from || globalFilters.dateRange.to
            ? { from: globalFilters.dateRange.from, to: globalFilters.dateRange.to }
            : undefined;

    const hasActiveFilters = dateRangeValue !== undefined;

    return (
        <>
            <div className="flex items-center gap-3 py-3 px-6 bg-white border-b border-[#E2E8F0] flex-wrap">
                <div className="flex items-center gap-2 text-sm text-[#64748B] font-medium">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Bộ lọc:</span>
                </div>

                {/* Presets Dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 bg-[#F1F5F9] border-none hover:bg-[#E2E8F0]"
                        >
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Presets
                            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-1">
                            <div className="px-2 py-1.5 text-xs font-semibold text-[#64748B] uppercase">
                                Mặc định
                            </div>
                            {presets.filter(p => p.isDefault).map((preset) => (
                                <button
                                    key={preset.id}
                                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-[#F1F5F9] rounded flex items-center justify-between group"
                                    onClick={() => handleApplyPreset(preset)}
                                >
                                    <span>{preset.name}</span>
                                </button>
                            ))}
                            {presets.filter(p => !p.isDefault).length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-[#64748B] uppercase mt-2">
                                        Đã lưu
                                    </div>
                                    {presets.filter(p => !p.isDefault).map((preset) => (
                                        <div
                                            key={preset.id}
                                            className="w-full px-2 py-1.5 text-sm hover:bg-[#F1F5F9] rounded flex items-center justify-between group"
                                        >
                                            <button
                                                className="flex-1 text-left"
                                                onClick={() => handleApplyPreset(preset)}
                                            >
                                                {preset.name}
                                            </button>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                                                onClick={() => handleDeletePreset(preset.id)}
                                            >
                                                <X className="h-3 w-3 text-red-600" />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                            <div className="border-t mt-2 pt-2">
                                <button
                                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-[#F1F5F9] rounded flex items-center gap-2 text-[#0052CC]"
                                    onClick={() => setShowPresetDialog(true)}
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Lưu preset hiện tại
                                </button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Date Range Picker */}
                <DateRangePicker
                    value={dateRangeValue}
                    onChange={handleDateRangeChange}
                    placeholder="Chọn khoảng thời gian"
                />

                {/* Resolution Selector */}
                <Select
                    value={globalFilters.resolution || 'day'}
                    onValueChange={(value: 'day' | 'month' | 'year') => {
                        setGlobalFilters({ resolution: value });
                    }}
                >
                    <SelectTrigger className="w-[100px] h-9 bg-[#F1F5F9] border-none">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">Ngày</SelectItem>
                        <SelectItem value="month">Tháng</SelectItem>
                        <SelectItem value="year">Năm</SelectItem>
                    </SelectContent>
                </Select>

                {/* Action Buttons */}
                {hasActiveFilters && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-[#64748B] hover:text-[#0F172A]"
                            onClick={handleClearFilters}
                        >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Xóa
                        </Button>
                        {currentDashboard && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-[#0052CC] hover:text-[#003d99]"
                                onClick={handleShareFilters}
                            >
                                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                Chia sẻ
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* Save Preset Dialog */}
            <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Lưu Filter Preset</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Tên preset (ví dụ: Q1 2024)"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && presetName.trim()) {
                                    handleSavePreset();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Share Filters Dialog */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chia sẻ Filter</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-[#64748B] mb-3">
                            Link này sẽ tự động áp dụng các filter hiện tại khi mở dashboard:
                        </p>
                        <div className="flex items-center gap-2">
                            <Input
                                value={shareUrl}
                                readOnly
                                className="flex-1 font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyShareUrl}
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowShareDialog(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
