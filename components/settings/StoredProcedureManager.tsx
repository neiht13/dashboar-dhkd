"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Plus, Trash2, Edit, Play, CheckCircle,
    XCircle, Database, FileCode, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface StoredProcedureParam {
    name: string;
    type: 'number' | 'string' | 'date';
    required: boolean;
    defaultValue?: string | number | null;
    description?: string;
}

interface StoredProcedure {
    _id?: string;
    name: string;
    description: string;
    parameters: StoredProcedureParam[];
    connectionId?: string;
    isActive: boolean;
    createdAt?: string;
}

interface ConnectionOption {
    _id: string;
    name: string;
}

export function StoredProcedureManager() {
    const [procedures, setProcedures] = useState<StoredProcedure[]>([]);
    const [connections, setConnections] = useState<ConnectionOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [editingProcedure, setEditingProcedure] = useState<StoredProcedure | null>(null);
    const [executeParams, setExecuteParams] = useState<Record<string, string>>({});
    const [executeResult, setExecuteResult] = useState<unknown[] | null>(null);

    const [form, setForm] = useState<StoredProcedure>({
        name: '',
        description: '',
        parameters: [],
        connectionId: '',
        isActive: true,
    });

    useEffect(() => {
        fetchProcedures();
        fetchConnections();
    }, []);

    const fetchProcedures = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/database/stored-procedure');
            const data = await res.json();
            if (data.success) {
                setProcedures(data.data || []);
            }
        } catch {
            toast.error('Không thể tải danh sách stored procedures');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (data.success) {
                setConnections(data.data || []);
            }
        } catch {
            // Ignore - connections are optional
        }
    };

    const handleOpenDialog = (procedure?: StoredProcedure) => {
        if (procedure) {
            setEditingProcedure(procedure);
            setForm({
                name: procedure.name,
                description: procedure.description,
                parameters: [...procedure.parameters],
                connectionId: procedure.connectionId || '',
                isActive: procedure.isActive,
            });
        } else {
            setEditingProcedure(null);
            setForm({
                name: '',
                description: '',
                parameters: [],
                connectionId: '',
                isActive: true,
            });
        }
        setDialogOpen(true);
    };

    const handleAddParam = () => {
        setForm(prev => ({
            ...prev,
            parameters: [
                ...prev.parameters,
                { name: '', type: 'string', required: false },
            ],
        }));
    };

    const handleRemoveParam = (index: number) => {
        setForm(prev => ({
            ...prev,
            parameters: prev.parameters.filter((_, i) => i !== index),
        }));
    };

    const handleParamChange = (index: number, field: keyof StoredProcedureParam, value: unknown) => {
        setForm(prev => ({
            ...prev,
            parameters: prev.parameters.map((p, i) =>
                i === index ? { ...p, [field]: value } : p
            ),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.description) {
            toast.error('Vui lòng nhập tên và mô tả');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/database/stored-procedure', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(editingProcedure ? 'Đã cập nhật' : 'Đã thêm stored procedure');
                setDialogOpen(false);
                fetchProcedures();
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch {
            toast.error('Không thể lưu stored procedure');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa stored procedure này?')) return;

        try {
            const res = await fetch(`/api/database/stored-procedure/${encodeURIComponent(name)}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Đã xóa stored procedure');
                fetchProcedures();
            } else {
                toast.error(data.error || 'Không thể xóa');
            }
        } catch {
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleOpenExecute = (procedure: StoredProcedure) => {
        setEditingProcedure(procedure);
        setExecuteParams({});
        setExecuteResult(null);
        setExecuteDialogOpen(true);
    };

    const handleExecute = async () => {
        if (!editingProcedure) return;

        setIsExecuting(true);
        setExecuteResult(null);

        try {
            // Convert string params to correct types
            const typedParams: Record<string, unknown> = {};
            for (const param of editingProcedure.parameters) {
                const val = executeParams[param.name];
                if (val !== undefined && val !== '') {
                    if (param.type === 'number') {
                        typedParams[param.name] = Number(val);
                    } else {
                        typedParams[param.name] = val;
                    }
                }
            }

            const res = await fetch('/api/database/stored-procedure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procedureName: editingProcedure.name,
                    parameters: typedParams,
                    connectionId: editingProcedure.connectionId,
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(`Thực thi thành công - ${data.recordCount} bản ghi`);
                setExecuteResult(data.data);
            } else {
                toast.error(data.error || 'Lỗi thực thi');
            }
        } catch {
            toast.error('Không thể thực thi stored procedure');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSeedDefaults = async () => {
        try {
            const res = await fetch('/api/database/stored-procedure?seed=true');
            const data = await res.json();
            if (data.success) {
                toast.success('Đã thêm stored procedures mặc định');
                fetchProcedures();
            }
        } catch {
            toast.error('Không thể seed dữ liệu');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Stored Procedures</h2>
                    <p className="text-sm text-slate-500">
                        Quản lý whitelist các stored procedures được phép thực thi
                    </p>
                </div>
                <div className="flex gap-2">
                    {procedures.length === 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSeedDefaults}
                            className="rounded-none font-bold"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            Seed mặc định
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => handleOpenDialog()}
                        className="rounded-none font-bold"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm SP
                    </Button>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : procedures.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200">
                    <FileCode className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">
                        Chưa có stored procedure nào
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Thêm stored procedure vào whitelist để cho phép thực thi
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {procedures.map((sp) => (
                        <div
                            key={sp._id || sp.name}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100">
                                    <FileCode className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 font-mono text-sm">
                                            {sp.name}
                                        </span>
                                        {sp.isActive ? (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Inactive
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {sp.description} • {sp.parameters.length} params
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => handleOpenExecute(sp)}
                                    title="Thực thi"
                                >
                                    <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none"
                                    onClick={() => handleOpenDialog(sp)}
                                    title="Sửa"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none text-red-500 hover:bg-red-50"
                                    onClick={() => handleDelete(sp.name)}
                                    title="Xóa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-bold">
                            {editingProcedure ? 'Chỉnh sửa' : 'Thêm'} Stored Procedure
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <Label className="font-bold">Tên Procedure *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="DATABASE.dbo.sp_procedure_name"
                                    className="font-mono rounded-none mt-1"
                                    disabled={!!editingProcedure}
                                />
                            </div>
                            <div>
                                <Label className="font-bold">Mô tả *</Label>
                                <Input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Mô tả chức năng của procedure"
                                    className="rounded-none mt-1"
                                />
                            </div>
                            <div>
                                <Label className="font-bold">Connection (tùy chọn)</Label>
                                <Select
                                    value={form.connectionId || 'default'}
                                    onValueChange={(v) => setForm({ ...form, connectionId: v === 'default' ? '' : v })}
                                >
                                    <SelectTrigger className="rounded-none mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Mặc định</SelectItem>
                                        {connections.map(c => (
                                            <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Parameters */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="font-bold">Parameters</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddParam}
                                        className="rounded-none"
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Thêm
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {form.parameters.map((param, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border">
                                            <Input
                                                placeholder="Tên param"
                                                value={param.name}
                                                onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                                                className="flex-1 h-8 rounded-none text-sm"
                                            />
                                            <Select
                                                value={param.type}
                                                onValueChange={(v) => handleParamChange(idx, 'type', v)}
                                            >
                                                <SelectTrigger className="w-24 h-8 rounded-none text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="string">String</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-1">
                                                <Switch
                                                    checked={param.required}
                                                    onCheckedChange={(v) => handleParamChange(idx, 'required', v)}
                                                />
                                                <span className="text-xs text-slate-500">Required</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500"
                                                onClick={() => handleRemoveParam(idx)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.isActive}
                                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                                />
                                <Label>Kích hoạt</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSaving} className="rounded-none font-bold">
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingProcedure ? 'Cập nhật' : 'Thêm'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Execute Dialog */}
            <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
                <DialogContent className="max-w-2xl rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-bold flex items-center gap-2">
                            <Play className="h-5 w-5 text-emerald-600" />
                            Thực thi: {editingProcedure?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Warning */}
                        <div className="p-3 bg-amber-50 border border-amber-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <p className="text-sm text-amber-700">
                                Dữ liệu sẽ được thực thi trực tiếp trên database. Hãy kiểm tra kỹ các tham số.
                            </p>
                        </div>

                        {/* Parameters */}
                        {editingProcedure?.parameters && editingProcedure.parameters.length > 0 && (
                            <div className="space-y-3">
                                <Label className="font-bold">Tham số</Label>
                                {editingProcedure.parameters.map((param) => (
                                    <div key={param.name} className="flex items-center gap-3">
                                        <Label className="w-32 text-sm font-medium">
                                            {param.name}
                                            {param.required && <span className="text-red-500">*</span>}
                                        </Label>
                                        <Input
                                            type={param.type === 'number' ? 'number' : 'text'}
                                            value={executeParams[param.name] || ''}
                                            onChange={(e) => setExecuteParams({
                                                ...executeParams,
                                                [param.name]: e.target.value
                                            })}
                                            placeholder={`${param.type}${param.defaultValue ? ` (default: ${param.defaultValue})` : ''}`}
                                            className="flex-1 rounded-none"
                                        />
                                        <Badge variant="outline" className="text-xs">
                                            {param.type}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Result */}
                        {executeResult && (
                            <div className="space-y-2">
                                <Label className="font-bold">Kết quả ({executeResult.length} bản ghi)</Label>
                                <div className="max-h-64 overflow-auto border bg-slate-50">
                                    <pre className="p-3 text-xs font-mono">
                                        {JSON.stringify(executeResult.slice(0, 50), null, 2)}
                                        {executeResult.length > 50 && '\n... và thêm ' + (executeResult.length - 50) + ' bản ghi'}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExecuteDialogOpen(false)}
                            className="rounded-none"
                        >
                            Đóng
                        </Button>
                        <Button
                            onClick={handleExecute}
                            disabled={isExecuting}
                            className="rounded-none font-bold bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Play className="h-4 w-4 mr-2" />
                            Thực thi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
