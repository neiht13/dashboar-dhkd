"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    History, 
    RotateCcw, 
    Clock, 
    User, 
    ChevronRight,
    Loader2,
    AlertCircle,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Version {
    _id: string;
    dashboardId: string;
    version: number;
    name: string;
    description?: string;
    widgets: unknown[];
    layout: unknown[];
    createdBy: string;
    changeDescription?: string;
    createdAt: string;
}

interface VersionHistoryProps {
    dashboardId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRestore?: (version: Version) => void;
}

export function VersionHistory({ dashboardId, open, onOpenChange, onRestore }: VersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchVersions = useCallback(async (loadMore = false) => {
        if (!dashboardId) return;

        const currentOffset = loadMore ? offset : 0;
        setLoading(!loadMore);

        try {
            const response = await fetch(
                `/api/versions?dashboardId=${dashboardId}&limit=20&offset=${currentOffset}`
            );
            const data = await response.json();

            if (data.success) {
                if (loadMore) {
                    setVersions((prev) => [...prev, ...data.data]);
                } else {
                    setVersions(data.data);
                }
                setHasMore(data.pagination.hasMore);
                setOffset(currentOffset + data.data.length);
            }
        } catch (error) {
            console.error('Error fetching versions:', error);
            toast.error('Không thể tải lịch sử phiên bản');
        } finally {
            setLoading(false);
        }
    }, [dashboardId, offset]);

    useEffect(() => {
        if (open && dashboardId) {
            setOffset(0);
            fetchVersions();
        }
    }, [open, dashboardId]);

    const handleRestore = async () => {
        if (!selectedVersion) return;

        setRestoring(true);
        try {
            const response = await fetch(`/api/versions/${selectedVersion._id}`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Đã khôi phục về phiên bản ${selectedVersion.version}`);
                onRestore?.(selectedVersion);
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Không thể khôi phục phiên bản');
            }
        } catch (error) {
            console.error('Error restoring version:', error);
            toast.error('Có lỗi xảy ra khi khôi phục');
        } finally {
            setRestoring(false);
            setConfirmRestore(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return formatDate(dateString);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Lịch sử phiên bản
                        </SheetTitle>
                        <SheetDescription>
                            Xem và khôi phục các phiên bản trước của dashboard
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <History className="h-12 w-12 mb-2 opacity-50" />
                                <p>Chưa có lịch sử phiên bản</p>
                                <p className="text-sm mt-1">
                                    Phiên bản sẽ được lưu tự động khi có thay đổi
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <div className="space-y-2 pr-4">
                                    {versions.map((version, index) => (
                                        <div
                                            key={version._id}
                                            className={cn(
                                                'p-4 rounded-lg border cursor-pointer transition-all',
                                                'hover:bg-muted/50',
                                                selectedVersion?._id === version._id &&
                                                    'border-primary bg-primary/5'
                                            )}
                                            onClick={() => setSelectedVersion(version)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={index === 0 ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                        >
                                                            v{version.version}
                                                        </Badge>
                                                        {index === 0 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Mới nhất
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <p className="font-medium mt-2 text-sm">
                                                        {version.changeDescription || `Phiên bản ${version.version}`}
                                                    </p>

                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {getRelativeTime(version.createdAt)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {version.createdBy}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                        <span>{version.widgets?.length || 0} widgets</span>
                                                        <span>•</span>
                                                        <span>{version.layout?.length || 0} layouts</span>
                                                    </div>
                                                </div>

                                                <ChevronRight
                                                    className={cn(
                                                        'h-5 w-5 text-muted-foreground transition-transform',
                                                        selectedVersion?._id === version._id && 'rotate-90'
                                                    )}
                                                />
                                            </div>

                                            {selectedVersion?._id === version._id && (
                                                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // TODO: Preview version
                                                        }}
                                                    >
                                                        Xem trước
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmRestore(true);
                                                        }}
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        Khôi phục
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {hasMore && (
                                        <Button
                                            variant="ghost"
                                            className="w-full"
                                            onClick={() => fetchVersions(true)}
                                        >
                                            Tải thêm
                                        </Button>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Xác nhận khôi phục
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn khôi phục dashboard về phiên bản{' '}
                            <strong>v{selectedVersion?.version}</strong>? 
                            <br />
                            Phiên bản hiện tại sẽ được sao lưu tự động trước khi khôi phục.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={restoring}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={restoring}>
                            {restoring ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Khôi phục
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
