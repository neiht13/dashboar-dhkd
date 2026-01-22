"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
    Bell, 
    Plus, 
    Trash2, 
    Pencil, 
    Play,
    Clock,
    AlertTriangle,
    CheckCircle,
    Mail,
    Globe,
    Loader2,
    Filter,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Alert {
    _id: string;
    name: string;
    description?: string;
    dashboardId?: string;
    chartId?: string;
    connectionId: string;
    query: {
        table: string;
        field: string;
        aggregation: string;
        filters?: Array<{ field: string; operator: string; value: unknown }>;
    };
    conditions: Array<{
        field: string;
        operator: string;
        value: number;
        compareWith?: string;
    }>;
    conditionLogic: 'AND' | 'OR';
    frequency: string;
    channels: string[];
    recipients: {
        userIds?: string[];
        emails?: string[];
        webhookUrl?: string;
    };
    isActive: boolean;
    lastTriggeredAt?: string;
    lastCheckedAt?: string;
    lastValue?: number;
    triggerCount: number;
    createdAt: string;
    dashboard?: { _id: string; name: string };
    connection?: { _id: string; name: string };
}

interface AlertManagerProps {
    dashboardId?: string;
    connectionId?: string;
    connections?: Array<{ _id: string; name: string }>;
    tables?: Array<{ name: string; columns: string[] }>;
}

const FREQUENCY_OPTIONS = [
    { value: 'realtime', label: 'Thời gian thực' },
    { value: 'hourly', label: 'Mỗi giờ' },
    { value: 'daily', label: 'Hàng ngày' },
    { value: 'weekly', label: 'Hàng tuần' },
];

const OPERATOR_OPTIONS = [
    { value: 'gt', label: 'Lớn hơn (>)' },
    { value: 'gte', label: 'Lớn hơn hoặc bằng (≥)' },
    { value: 'lt', label: 'Nhỏ hơn (<)' },
    { value: 'lte', label: 'Nhỏ hơn hoặc bằng (≤)' },
    { value: 'eq', label: 'Bằng (=)' },
    { value: 'neq', label: 'Khác (≠)' },
    { value: 'change_percent', label: 'Thay đổi %' },
];

const AGGREGATION_OPTIONS = [
    { value: 'sum', label: 'Tổng' },
    { value: 'avg', label: 'Trung bình' },
    { value: 'count', label: 'Đếm' },
    { value: 'min', label: 'Nhỏ nhất' },
    { value: 'max', label: 'Lớn nhất' },
];

export function AlertManager({ dashboardId, connectionId, connections = [], tables = [] }: AlertManagerProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        connectionId: connectionId || '',
        table: '',
        field: '',
        aggregation: 'sum',
        conditionOperator: 'gt',
        conditionValue: 0,
        frequency: 'daily',
        channels: ['in_app'] as string[],
        emails: '',
        webhookUrl: '',
        isActive: true,
    });

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dashboardId) params.set('dashboardId', dashboardId);

            const response = await fetch(`/api/alerts?${params}`);
            const data = await response.json();

            if (data.success) {
                setAlerts(data.data);
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
            toast.error('Không thể tải danh sách cảnh báo');
        } finally {
            setLoading(false);
        }
    }, [dashboardId]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const handleOpenCreate = () => {
        setEditingAlert(null);
        setFormData({
            name: '',
            description: '',
            connectionId: connectionId || connections[0]?._id || '',
            table: '',
            field: '',
            aggregation: 'sum',
            conditionOperator: 'gt',
            conditionValue: 0,
            frequency: 'daily',
            channels: ['in_app'],
            emails: '',
            webhookUrl: '',
            isActive: true,
        });
        setDialogOpen(true);
    };

    const handleOpenEdit = (alert: Alert) => {
        setEditingAlert(alert);
        setFormData({
            name: alert.name,
            description: alert.description || '',
            connectionId: alert.connectionId,
            table: alert.query.table,
            field: alert.query.field,
            aggregation: alert.query.aggregation,
            conditionOperator: alert.conditions[0]?.operator || 'gt',
            conditionValue: alert.conditions[0]?.value || 0,
            frequency: alert.frequency,
            channels: alert.channels,
            emails: alert.recipients.emails?.join(', ') || '',
            webhookUrl: alert.recipients.webhookUrl || '',
            isActive: alert.isActive,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.connectionId || !formData.table || !formData.field) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                dashboardId,
                connectionId: formData.connectionId,
                query: {
                    table: formData.table,
                    field: formData.field,
                    aggregation: formData.aggregation,
                },
                conditions: [{
                    field: formData.field,
                    operator: formData.conditionOperator,
                    value: formData.conditionValue,
                }],
                conditionLogic: 'AND',
                frequency: formData.frequency,
                channels: formData.channels,
                recipients: {
                    emails: formData.emails.split(',').map((e) => e.trim()).filter(Boolean),
                    webhookUrl: formData.webhookUrl || undefined,
                },
                isActive: formData.isActive,
            };

            const url = editingAlert ? `/api/alerts/${editingAlert._id}` : '/api/alerts';
            const method = editingAlert ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(editingAlert ? 'Đã cập nhật cảnh báo' : 'Đã tạo cảnh báo');
                setDialogOpen(false);
                fetchAlerts();
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error saving alert:', error);
            toast.error('Không thể lưu cảnh báo');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (alertId: string) => {
        if (!confirm('Bạn có chắc muốn xóa cảnh báo này?')) return;

        try {
            const response = await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                toast.success('Đã xóa cảnh báo');
                fetchAlerts();
            } else {
                toast.error(data.error || 'Không thể xóa cảnh báo');
            }
        } catch (error) {
            console.error('Error deleting alert:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleToggle = async (alertId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/alerts/${alertId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(isActive ? 'Đã bật cảnh báo' : 'Đã tắt cảnh báo');
                fetchAlerts();
            }
        } catch (error) {
            console.error('Error toggling alert:', error);
        }
    };

    const handleTest = async (alertId: string) => {
        try {
            const response = await fetch(`/api/alerts/${alertId}`, { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                const result = data.data.testResult;
                toast.info(
                    `Giá trị hiện tại: ${result.currentValue}. ` +
                    `${result.wouldTrigger ? 'Sẽ kích hoạt cảnh báo!' : 'Không kích hoạt.'}`
                );
            }
        } catch (error) {
            console.error('Error testing alert:', error);
            toast.error('Không thể kiểm tra cảnh báo');
        }
    };

    const getSelectedTable = () => tables.find((t) => t.name === formData.table);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="h-5 w-5" />
                        Quản lý Cảnh báo
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
                            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        </Button>
                        <Button size="sm" onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tạo cảnh báo
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Bell className="h-12 w-12 mb-2 opacity-50" />
                        <p>Chưa có cảnh báo nào</p>
                        <Button variant="link" onClick={handleOpenCreate}>
                            Tạo cảnh báo đầu tiên
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <div
                                key={alert._id}
                                className={cn(
                                    'p-4 border rounded-lg transition-colors',
                                    alert.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold">{alert.name}</h4>
                                            <Badge
                                                variant={alert.isActive ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {alert.isActive ? 'Đang bật' : 'Đã tắt'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {FREQUENCY_OPTIONS.find((f) => f.value === alert.frequency)?.label}
                                            </Badge>
                                        </div>

                                        {alert.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {alert.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                            <span>
                                                {alert.query.aggregation.toUpperCase()}({alert.query.field})
                                            </span>
                                            <span>
                                                {OPERATOR_OPTIONS.find((o) => o.value === alert.conditions[0]?.operator)?.label}
                                                {' '}{alert.conditions[0]?.value}
                                            </span>
                                            {alert.lastTriggeredAt && (
                                                <span className="flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                    Lần cuối: {new Date(alert.lastTriggeredAt).toLocaleString('vi-VN')}
                                                </span>
                                            )}
                                            <span>Kích hoạt: {alert.triggerCount} lần</span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-2">
                                            {alert.channels.includes('email') && (
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            {alert.channels.includes('in_app') && (
                                                <Bell className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            {alert.channels.includes('webhook') && (
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={alert.isActive}
                                            onCheckedChange={(checked) => handleToggle(alert._id, checked)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleTest(alert._id)}
                                            title="Kiểm tra"
                                        >
                                            <Play className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEdit(alert)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(alert._id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAlert ? 'Chỉnh sửa cảnh báo' : 'Tạo cảnh báo mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tên cảnh báo *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Doanh thu giảm 10%"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mô tả</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả chi tiết..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Kết nối *</Label>
                                <Select
                                    value={formData.connectionId}
                                    onValueChange={(v) => setFormData({ ...formData, connectionId: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Chọn kết nối" /></SelectTrigger>
                                    <SelectContent>
                                        {connections.map((conn) => (
                                            <SelectItem key={conn._id} value={conn._id}>
                                                {conn.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Bảng dữ liệu *</Label>
                                <Select
                                    value={formData.table}
                                    onValueChange={(v) => setFormData({ ...formData, table: v, field: '' })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Chọn bảng" /></SelectTrigger>
                                    <SelectContent>
                                        {tables.map((table) => (
                                            <SelectItem key={table.name} value={table.name}>
                                                {table.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cột dữ liệu *</Label>
                                <Select
                                    value={formData.field}
                                    onValueChange={(v) => setFormData({ ...formData, field: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                    <SelectContent>
                                        {getSelectedTable()?.columns.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Phép tính</Label>
                                <Select
                                    value={formData.aggregation}
                                    onValueChange={(v) => setFormData({ ...formData, aggregation: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {AGGREGATION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Điều kiện *</Label>
                                <Select
                                    value={formData.conditionOperator}
                                    onValueChange={(v) => setFormData({ ...formData, conditionOperator: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {OPERATOR_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Giá trị ngưỡng *</Label>
                                <Input
                                    type="number"
                                    value={formData.conditionValue}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        conditionValue: Number(e.target.value) 
                                    })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tần suất kiểm tra</Label>
                            <Select
                                value={formData.frequency}
                                onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {FREQUENCY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Email nhận thông báo (cách nhau bằng dấu phẩy)</Label>
                            <Input
                                value={formData.emails}
                                onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                                placeholder="email1@example.com, email2@example.com"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>Kích hoạt ngay</Label>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingAlert ? 'Cập nhật' : 'Tạo cảnh báo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
