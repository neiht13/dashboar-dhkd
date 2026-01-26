"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface RefreshStatusProps {
    onRefresh: () => Promise<void>;
    lastUpdated?: Date | null;
    className?: string;
}

const REFRESH_INTERVALS = [
    { label: "Không tự động", value: 0 },
    { label: "30 giây", value: 30 },
    { label: "1 phút", value: 60 },
    { label: "5 phút", value: 300 },
    { label: "15 phút", value: 900 },
    { label: "30 phút", value: 1800 },
];

export function RefreshStatus({ onRefresh, lastUpdated, className }: RefreshStatusProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(0);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const refreshTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Auto-refresh logic
    useEffect(() => {
        if (refreshInterval > 0) {
            refreshTimerRef.current = setInterval(() => {
                handleManualRefresh();
            }, refreshInterval * 1000);
        } else {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [refreshInterval]);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        setRefreshError(null);
        try {
            await onRefresh();
        } catch (error) {
            setRefreshError(error instanceof Error ? error.message : "Lỗi khi refresh");
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatLastUpdated = (date: Date | null | undefined): string => {
        if (!date) return "Chưa cập nhật";
        
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return "Vừa xong";
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-2 bg-white border-b border-[#E2E8F0]",
            className
        )}>
            {/* Manual Refresh Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="h-8 px-3"
            >
                <RefreshCw className={cn(
                    "h-4 w-4",
                    isRefreshing && "animate-spin"
                )} />
                <span className="ml-1.5 hidden sm:inline">
                    {isRefreshing ? "Đang tải..." : "Làm mới"}
                </span>
            </Button>

            {/* Auto Refresh Selector */}
            <Select
                value={String(refreshInterval)}
                onValueChange={(v) => setRefreshInterval(Number(v))}
            >
                <SelectTrigger className="w-[140px] h-8 text-xs bg-[#F1F5F9] border-none">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {REFRESH_INTERVALS.map(item => (
                        <SelectItem key={item.value} value={String(item.value)}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Last Updated Status */}
            <div className="flex items-center gap-2 ml-auto">
                {refreshError ? (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Lỗi refresh</span>
                    </div>
                ) : (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                    {formatLastUpdated(lastUpdated)}
                                </span>
                                <span className="sm:hidden">
                                    {lastUpdated ? "Đã cập nhật" : "Chưa cập nhật"}
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-[#64748B] uppercase">
                                    Trạng thái cập nhật
                                </div>
                                <div className="text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[#64748B]">Lần cập nhật cuối:</span>
                                        <span className="font-medium">
                                            {lastUpdated
                                                ? lastUpdated.toLocaleString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })
                                                : "Chưa có"}
                                        </span>
                                    </div>
                                    {refreshInterval > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#64748B]">Tự động refresh:</span>
                                            <span className="font-medium">
                                                {REFRESH_INTERVALS.find(i => i.value === refreshInterval)?.label || "Không"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
    );
}
