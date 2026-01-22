"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
    Activity, 
    Search,
    Filter,
    RefreshCw,
    User,
    Clock,
    CheckCircle,
    XCircle,
    LayoutDashboard,
    BarChart3,
    Database,
    Settings,
    LogIn,
    LogOut,
    UserPlus,
    Key,
    Share2,
    Eye,
    Bell,
    Download,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ActivityLog {
    _id: string;
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    createdAt: string;
    user?: {
        _id: string;
        name: string;
        email: string;
    };
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    login: { label: 'Đăng nhập', icon: LogIn, color: 'text-green-600' },
    logout: { label: 'Đăng xuất', icon: LogOut, color: 'text-gray-600' },
    register: { label: 'Đăng ký', icon: UserPlus, color: 'text-blue-600' },
    password_reset: { label: 'Đặt lại mật khẩu', icon: Key, color: 'text-amber-600' },
    dashboard_create: { label: 'Tạo dashboard', icon: LayoutDashboard, color: 'text-purple-600' },
    dashboard_update: { label: 'Cập nhật dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    dashboard_delete: { label: 'Xóa dashboard', icon: LayoutDashboard, color: 'text-red-600' },
    dashboard_share: { label: 'Chia sẻ dashboard', icon: Share2, color: 'text-cyan-600' },
    dashboard_view: { label: 'Xem dashboard', icon: Eye, color: 'text-gray-600' },
    chart_create: { label: 'Tạo biểu đồ', icon: BarChart3, color: 'text-purple-600' },
    chart_update: { label: 'Cập nhật biểu đồ', icon: BarChart3, color: 'text-blue-600' },
    chart_delete: { label: 'Xóa biểu đồ', icon: BarChart3, color: 'text-red-600' },
    connection_create: { label: 'Tạo kết nối', icon: Database, color: 'text-green-600' },
    connection_update: { label: 'Cập nhật kết nối', icon: Database, color: 'text-blue-600' },
    connection_delete: { label: 'Xóa kết nối', icon: Database, color: 'text-red-600' },
    query_execute: { label: 'Thực thi truy vấn', icon: Database, color: 'text-cyan-600' },
    export_data: { label: 'Xuất dữ liệu', icon: Download, color: 'text-purple-600' },
    user_update: { label: 'Cập nhật thông tin', icon: Settings, color: 'text-blue-600' },
    alert_create: { label: 'Tạo cảnh báo', icon: Bell, color: 'text-amber-600' },
    alert_trigger: { label: 'Kích hoạt cảnh báo', icon: Bell, color: 'text-red-600' },
};

interface ActivityLogViewerProps {
    userId?: string; // If provided, show only this user's logs
    showUserFilter?: boolean;
}

export function ActivityLogViewer({ userId, showUserFilter = true }: ActivityLogViewerProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchLogs = useCallback(async (loadMore = false) => {
        const currentOffset = loadMore ? offset : 0;
        setLoading(!loadMore);

        try {
            const params = new URLSearchParams();
            if (userId) params.set('userId', userId);
            if (actionFilter !== 'all') params.set('action', actionFilter);
            if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
            if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());
            params.set('limit', '50');
            params.set('offset', String(currentOffset));

            const response = await fetch(`/api/activity?${params}`);
            const data = await response.json();

            if (data.success) {
                if (loadMore) {
                    setLogs((prev) => [...prev, ...data.data]);
                } else {
                    setLogs(data.data);
                }
                setHasMore(data.pagination.hasMore);
                setOffset(currentOffset + data.data.length);
            }
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, actionFilter, dateRange, offset]);

    useEffect(() => {
        setOffset(0);
        fetchLogs();
    }, [userId, actionFilter, dateRange]);

    const filteredLogs = logs.filter((log) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !log.resourceName?.toLowerCase().includes(query) &&
                !log.user?.name.toLowerCase().includes(query) &&
                !log.user?.email.toLowerCase().includes(query) &&
                !ACTION_CONFIG[log.action]?.label.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        if (statusFilter !== 'all' && log.status !== statusFilter) {
            return false;
        }

        return true;
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return formatDate(dateString);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5" />
                        Nhật ký hoạt động
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs()}
                        disabled={loading}
                    >
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                        Làm mới
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Loại hoạt động" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả hoạt động</SelectItem>
                            {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="success">Thành công</SelectItem>
                            <SelectItem value="failure">Thất bại</SelectItem>
                        </SelectContent>
                    </Select>

                    <DateRangePicker
                        date={dateRange}
                        onDateChange={setDateRange}
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                {loading && logs.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Activity className="h-12 w-12 mb-2 opacity-50" />
                        <p>Không có hoạt động nào</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="divide-y">
                            {filteredLogs.map((log) => {
                                const actionConfig = ACTION_CONFIG[log.action] || {
                                    label: log.action,
                                    icon: Activity,
                                    color: 'text-gray-600',
                                };
                                const Icon = actionConfig.icon;

                                return (
                                    <div
                                        key={log._id}
                                        className="p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                'p-2 rounded-lg bg-muted',
                                                actionConfig.color
                                            )}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-sm">
                                                        {actionConfig.label}
                                                    </span>
                                                    {log.resourceName && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {log.resourceName}
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant={log.status === 'success' ? 'default' : 'destructive'}
                                                        className="text-xs"
                                                    >
                                                        {log.status === 'success' ? (
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                        ) : (
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                        )}
                                                        {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                                                    </Badge>
                                                </div>

                                                {log.errorMessage && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {log.errorMessage}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    {log.user && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {log.user.name}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {getRelativeTime(log.createdAt)}
                                                    </span>
                                                    {log.ipAddress && (
                                                        <span className="hidden sm:inline">
                                                            IP: {log.ipAddress}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {hasMore && (
                            <div className="p-4 text-center">
                                <Button
                                    variant="outline"
                                    onClick={() => fetchLogs(true)}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : null}
                                    Tải thêm
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
