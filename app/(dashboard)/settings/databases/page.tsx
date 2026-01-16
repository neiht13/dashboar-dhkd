"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Database, Trash2, Edit, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DatabaseConnection {
    _id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    user: string;
    encrypt: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ConnectionForm {
    name: string;
    host: string;
    port: string;
    database: string;
    user: string;
    password: string;
    encrypt: boolean;
    isDefault: boolean;
}

const emptyForm: ConnectionForm = {
    name: '',
    host: '',
    port: '1433',
    database: '',
    user: '',
    password: '',
    encrypt: false,
    isDefault: false,
};

export default function DatabaseSettingsPage() {
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ConnectionForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (data.success) {
                setConnections(data.data);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách kết nối');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const handleOpenDialog = (connection?: DatabaseConnection) => {
        if (connection) {
            setEditingId(connection._id);
            setForm({
                name: connection.name,
                host: connection.host,
                port: connection.port.toString(),
                database: connection.database,
                user: connection.user,
                password: '',
                encrypt: connection.encrypt,
                isDefault: connection.isDefault,
            });
        } else {
            setEditingId(null);
            setForm(emptyForm);
        }
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingId ? `/api/connections/${editingId}` : '/api/connections';
            const method = editingId ? 'PUT' : 'POST';

            const body = {
                ...form,
                port: parseInt(form.port),
                testBeforeSave: true,
            };

            // Don't send empty password on edit (keep existing)
            if (editingId && !form.password) {
                delete (body as any).password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Đã cập nhật kết nối' : 'Đã thêm kết nối mới');
                setDialogOpen(false);
                fetchConnections();
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Không thể lưu kết nối');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa kết nối này?')) return;

        try {
            const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                toast.success('Đã xóa kết nối');
                fetchConnections();
            } else {
                toast.error(data.error || 'Không thể xóa kết nối');
            }
        } catch (error) {
            toast.error('Không thể xóa kết nối');
        }
    };

    const handleTest = async (id: string) => {
        setTestingId(id);

        try {
            const res = await fetch(`/api/connections/${id}/test`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                toast.success('Kết nối thành công!');
            } else {
                toast.error(`Kết nối thất bại: ${data.error}`);
            }
        } catch (error) {
            toast.error('Không thể kiểm tra kết nối');
        } finally {
            setTestingId(null);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/connections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true, testBeforeSave: false }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Đã đặt làm mặc định');
                fetchConnections();
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error('Không thể cập nhật');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-6 mx-auto">
            <div className="flex items-center justify-between mb-6 p-12">
                <div>
                    <h1 className="text-2xl font-bold">Quản lý Database</h1>
                    <p className="text-muted-foreground">Thêm và quản lý các kết nối cơ sở dữ liệu</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm kết nối
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Sửa kết nối' : 'Thêm kết nối mới'}</DialogTitle>
                                <DialogDescription>
                                    Nhập thông tin kết nối SQL Server
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Tên hiển thị</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Ví dụ: Production DB"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="host">Host / IP</Label>
                                        <Input
                                            id="host"
                                            value={form.host}
                                            onChange={(e) => setForm({ ...form, host: e.target.value })}
                                            placeholder="10.0.0.1"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="port">Port</Label>
                                        <Input
                                            id="port"
                                            type="number"
                                            value={form.port}
                                            onChange={(e) => setForm({ ...form, port: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="database">Tên Database</Label>
                                    <Input
                                        id="database"
                                        value={form.database}
                                        onChange={(e) => setForm({ ...form, database: e.target.value })}
                                        placeholder="REPORTSERVICE"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="user">Username</Label>
                                    <Input
                                        id="user"
                                        value={form.user}
                                        onChange={(e) => setForm({ ...form, user: e.target.value })}
                                        placeholder="sa"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password {editingId && <span className="text-muted-foreground">(để trống nếu không đổi)</span>}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required={!editingId}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="encrypt"
                                            checked={form.encrypt}
                                            onCheckedChange={(checked) => setForm({ ...form, encrypt: checked })}
                                        />
                                        <Label htmlFor="encrypt">Mã hóa kết nối (Encrypt)</Label>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isDefault"
                                            checked={form.isDefault}
                                            onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                                        />
                                        <Label htmlFor="isDefault">Đặt làm mặc định</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {connections.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Database className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Chưa có kết nối database nào</p>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm kết nối đầu tiên
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {connections.map((conn) => (
                        <Card key={conn._id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Database className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">{conn.name}</CardTitle>
                                        {conn.isDefault && (
                                            <Badge variant="secondary">Mặc định</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleTest(conn._id)}
                                            disabled={testingId === conn._id}
                                        >
                                            {testingId === conn._id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleOpenDialog(conn)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(conn._id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Host:</span>{' '}
                                        <span className="font-medium">{conn.host}:{conn.port}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Database:</span>{' '}
                                        <span className="font-medium">{conn.database}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">User:</span>{' '}
                                        <span className="font-medium">{conn.user}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Encrypt:</span>{' '}
                                        <span className="font-medium">{conn.encrypt ? 'Có' : 'Không'}</span>
                                    </div>
                                </div>
                                {!conn.isDefault && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => handleSetDefault(conn._id)}
                                    >
                                        Đặt làm mặc định
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
