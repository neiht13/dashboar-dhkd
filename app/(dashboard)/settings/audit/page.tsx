"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Activity,
    Search,
    RefreshCw,
    Eye,
    Plus,
    Pencil,
    Trash2,
    Share,
    Database,
    Download,
    LogIn,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AuditLogEntry {
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    action: string;
    resource: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    success: boolean;
    createdAt: string;
}

const actionIcons: Record<string, React.ReactNode> = {
    view: <Eye className="h-4 w-4" />,
    create: <Plus className="h-4 w-4" />,
    update: <Pencil className="h-4 w-4" />,
    delete: <Trash2 className="h-4 w-4" />,
    share: <Share className="h-4 w-4" />,
    query: <Database className="h-4 w-4" />,
    export: <Download className="h-4 w-4" />,
    login: <LogIn className="h-4 w-4" />,
    logout: <LogOut className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
    view: 'bg-blue-100 text-blue-800',
    create: 'bg-green-100 text-green-800',
    update: 'bg-yellow-100 text-yellow-800',
    delete: 'bg-red-100 text-red-800',
    share: 'bg-purple-100 text-purple-800',
    query: 'bg-cyan-100 text-cyan-800',
    export: 'bg-orange-100 text-orange-800',
    login: 'bg-emerald-100 text-emerald-800',
    logout: 'bg-gray-100 text-gray-800',
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        action: '',
        resource: '',
        startDate: '',
        endDate: '',
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', '20');
            if (filters.action) params.set('action', filters.action);
            if (filters.resource) params.set('resource', filters.resource);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);

            const response = await fetch(`/api/audit?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);  // Reset to first page on filter change
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Nhật ký kiểm toán</h1>
                    <p className="text-muted-foreground">
                        Theo dõi tất cả hoạt động trong hệ thống
                    </p>
                </div>
                <Button onClick={fetchLogs} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Làm mới
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Bộ lọc
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Hành động</Label>
                            <Select
                                value={filters.action}
                                onValueChange={(v) => handleFilterChange('action', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Tất cả</SelectItem>
                                    <SelectItem value="view">Xem</SelectItem>
                                    <SelectItem value="create">Tạo</SelectItem>
                                    <SelectItem value="update">Cập nhật</SelectItem>
                                    <SelectItem value="delete">Xóa</SelectItem>
                                    <SelectItem value="share">Chia sẻ</SelectItem>
                                    <SelectItem value="query">Truy vấn</SelectItem>
                                    <SelectItem value="export">Xuất</SelectItem>
                                    <SelectItem value="login">Đăng nhập</SelectItem>
                                    <SelectItem value="logout">Đăng xuất</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tài nguyên</Label>
                            <Select
                                value={filters.resource}
                                onValueChange={(v) => handleFilterChange('resource', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Tất cả</SelectItem>
                                    <SelectItem value="dashboard">Dashboard</SelectItem>
                                    <SelectItem value="chart">Biểu đồ</SelectItem>
                                    <SelectItem value="connection">Kết nối</SelectItem>
                                    <SelectItem value="user">Người dùng</SelectItem>
                                    <SelectItem value="folder">Thư mục</SelectItem>
                                    <SelectItem value="team">Nhóm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Từ ngày</Label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Đến ngày</Label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Thời gian</TableHead>
                                    <TableHead>Người dùng</TableHead>
                                    <TableHead>Hành động</TableHead>
                                    <TableHead>Tài nguyên</TableHead>
                                    <TableHead>Chi tiết</TableHead>
                                    <TableHead className="w-[100px]">Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <Activity className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Đang tải...
                                        </TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Không có dữ liệu
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log._id}>
                                            <TableCell className="text-sm">
                                                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{log.userName || 'N/A'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${actionColors[log.action] || 'bg-gray-100 text-gray-800'} gap-1`}>
                                                    {actionIcons[log.action]}
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="capitalize">{log.resource}</span>
                                                    {log.resourceName && (
                                                        <span className="text-xs text-muted-foreground">{log.resourceName}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {log.ipAddress && (
                                                    <span className="text-xs text-muted-foreground">
                                                        IP: {log.ipAddress}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.success ? 'default' : 'destructive'}>
                                                    {log.success ? 'Thành công' : 'Thất bại'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
