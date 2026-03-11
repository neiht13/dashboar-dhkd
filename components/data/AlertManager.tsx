"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, Globe, Loader2, Mail, MessageSquare, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AlertRecord {
    _id: string;
    name: string;
    description?: string;
    connectionId: string;
    frequency: string;
    channels: string[];
    query: { table: string; field: string; aggregation: string };
    conditions: Array<{ operator: string; value: number }>;
    recipients: {
        emails?: string[];
        webhookUrl?: string;
        zaloUserIds?: string[];
        zaloWebhookUrl?: string;
    };
    anomalyConfig?: { enabled?: boolean; mode?: string; threshold?: number };
    reportSchedule?: { enabled?: boolean; frequency?: string; time?: string; channels?: string[] };
    schedule?: { enabled?: boolean; time?: string };
    isActive: boolean;
    triggerCount: number;
    lastTriggeredAt?: string;
}

interface AlertManagerProps {
    dashboardId?: string;
    connectionId?: string;
    connections?: Array<{ _id: string; name: string }>;
    tables?: Array<{ name: string; columns: string[] }>;
}

type FormState = {
    name: string;
    description: string;
    connectionId: string;
    table: string;
    field: string;
    aggregation: string;
    operator: string;
    value: number;
    frequency: string;
    scheduleTime: string;
    channels: string[];
    emails: string;
    webhookUrl: string;
    zaloUsers: string;
    zaloWebhookUrl: string;
    anomalyEnabled: boolean;
    anomalyMode: string;
    anomalyThreshold: number;
    reportEnabled: boolean;
    reportFrequency: string;
    reportTime: string;
    reportChannels: string[];
    isActive: boolean;
};

const FREQUENCIES = ["realtime", "hourly", "daily", "weekly", "monthly"];
const AGGREGATIONS = ["sum", "avg", "count", "min", "max"];
const OPERATORS = ["gt", "gte", "lt", "lte", "eq", "neq", "change_percent"];
const CHANNELS = ["in_app", "email", "webhook", "zalo"];
const REPORT_FREQ = ["daily", "weekly", "monthly"];

const createDefaultForm = (connectionId?: string): FormState => ({
    name: "",
    description: "",
    connectionId: connectionId || "",
    table: "",
    field: "",
    aggregation: "sum",
    operator: "gt",
    value: 0,
    frequency: "daily",
    scheduleTime: "08:00",
    channels: ["in_app"],
    emails: "",
    webhookUrl: "",
    zaloUsers: "",
    zaloWebhookUrl: "",
    anomalyEnabled: false,
    anomalyMode: "drop_percent",
    anomalyThreshold: 10,
    reportEnabled: false,
    reportFrequency: "daily",
    reportTime: "08:30",
    reportChannels: ["email"],
    isActive: true,
});

const toggle = (items: string[], item: string, checked: boolean) =>
    checked ? Array.from(new Set([...items, item])) : items.filter((value) => value !== item);

export function AlertManager({ dashboardId, connectionId, connections = [], tables = [] }: AlertManagerProps) {
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<AlertRecord | null>(null);
    const [form, setForm] = useState<FormState>(createDefaultForm(connectionId));

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dashboardId) params.set("dashboardId", dashboardId);
            const response = await fetch(`/api/alerts?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                setAlerts(result.data || []);
            }
        } catch (error) {
            console.error("Error loading alerts:", error);
            toast.error("Khong the tai canh bao");
        } finally {
            setLoading(false);
        }
    }, [dashboardId]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const openCreate = () => {
        setEditing(null);
        setForm(createDefaultForm(connectionId || connections[0]?._id));
        setDialogOpen(true);
    };

    const openEdit = (alert: AlertRecord) => {
        setEditing(alert);
        setForm({
            name: alert.name,
            description: alert.description || "",
            connectionId: alert.connectionId,
            table: alert.query.table,
            field: alert.query.field,
            aggregation: alert.query.aggregation || "sum",
            operator: alert.conditions[0]?.operator || "gt",
            value: alert.conditions[0]?.value || 0,
            frequency: alert.frequency || "daily",
            scheduleTime: alert.schedule?.time || "08:00",
            channels: alert.channels || ["in_app"],
            emails: alert.recipients.emails?.join(", ") || "",
            webhookUrl: alert.recipients.webhookUrl || "",
            zaloUsers: alert.recipients.zaloUserIds?.join(", ") || "",
            zaloWebhookUrl: alert.recipients.zaloWebhookUrl || "",
            anomalyEnabled: alert.anomalyConfig?.enabled === true,
            anomalyMode: alert.anomalyConfig?.mode || "drop_percent",
            anomalyThreshold: Number(alert.anomalyConfig?.threshold || 10),
            reportEnabled: alert.reportSchedule?.enabled === true,
            reportFrequency: alert.reportSchedule?.frequency || "daily",
            reportTime: alert.reportSchedule?.time || "08:30",
            reportChannels: alert.reportSchedule?.channels || ["email"],
            isActive: alert.isActive,
        });
        setDialogOpen(true);
    };

    const saveAlert = async () => {
        if (!form.name || !form.connectionId || !form.table || !form.field) {
            toast.error("Thieu thong tin bat buoc");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                dashboardId,
                connectionId: form.connectionId,
                query: {
                    table: form.table,
                    field: form.field,
                    aggregation: form.aggregation,
                },
                conditions: [{ field: form.field, operator: form.operator, value: form.value }],
                conditionLogic: "AND",
                frequency: form.frequency,
                schedule: {
                    enabled: true,
                    frequency: form.frequency,
                    time: form.scheduleTime,
                    timezone: "Asia/Ho_Chi_Minh",
                },
                channels: form.channels,
                recipients: {
                    emails: form.emails.split(",").map((item) => item.trim()).filter(Boolean),
                    webhookUrl: form.webhookUrl || undefined,
                    zaloUserIds: form.zaloUsers.split(",").map((item) => item.trim()).filter(Boolean),
                    zaloWebhookUrl: form.zaloWebhookUrl || undefined,
                },
                anomalyConfig: {
                    enabled: form.anomalyEnabled,
                    mode: form.anomalyMode,
                    threshold: form.anomalyThreshold,
                },
                reportSchedule: {
                    enabled: form.reportEnabled,
                    frequency: form.reportFrequency,
                    time: form.reportTime,
                    timezone: "Asia/Ho_Chi_Minh",
                    channels: form.reportChannels,
                },
                isActive: form.isActive,
            };

            const url = editing ? `/api/alerts/${editing._id}` : "/api/alerts";
            const method = editing ? "PUT" : "POST";
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                toast.success(editing ? "Da cap nhat canh bao" : "Da tao canh bao");
                setDialogOpen(false);
                fetchAlerts();
            } else {
                toast.error(result.error || "Khong the luu canh bao");
            }
        } catch (error) {
            console.error("Error saving alert:", error);
            toast.error("Khong the luu canh bao");
        } finally {
            setSaving(false);
        }
    };

    const removeAlert = async (id: string) => {
        if (!confirm("Xoa canh bao nay?")) return;
        const response = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
        const result = await response.json();
        if (result.success) fetchAlerts();
    };

    const toggleAlert = async (id: string, isActive: boolean) => {
        await fetch(`/api/alerts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        fetchAlerts();
    };

    const testAlert = async (id: string) => {
        const response = await fetch(`/api/alerts/${id}`, { method: "POST" });
        const result = await response.json();
        if (result.success) {
            const testResult = result.data.testResult;
            toast.info(
                `Gia tri: ${testResult.currentValue}. ${testResult.wouldTrigger ? "Se kich hoat." : "Chua kich hoat."}`
            );
        }
    };

    const selectedTable = tables.find((table) => table.name === form.table);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="h-5 w-5" /> Quan ly Canh bao
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Tao canh bao
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto space-y-3">
                {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mt-20" />}
                {!loading &&
                    alerts.map((alert) => (
                        <div key={alert._id} className={cn("p-4 border rounded-lg", !alert.isActive && "opacity-60")}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold">{alert.name}</h4>
                                        <Badge variant={alert.isActive ? "default" : "secondary"}>{alert.frequency}</Badge>
                                        {alert.anomalyConfig?.enabled && <Badge variant="outline">Bat thuong</Badge>}
                                        {alert.reportSchedule?.enabled && <Badge variant="outline">Bao cao dinh ky</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                                        <span>{alert.query.aggregation.toUpperCase()}({alert.query.field})</span>
                                        <span>{alert.conditions[0]?.operator} {alert.conditions[0]?.value}</span>
                                        <span>Kich hoat: {alert.triggerCount}</span>
                                        {alert.lastTriggeredAt && <span>Lan cuoi: {new Date(alert.lastTriggeredAt).toLocaleString("vi-VN")}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        {alert.channels.includes("email") && <Mail className="h-4 w-4" />}
                                        {alert.channels.includes("webhook") && <Globe className="h-4 w-4" />}
                                        {alert.channels.includes("zalo") && <MessageSquare className="h-4 w-4" />}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={alert.isActive} onCheckedChange={(checked) => toggleAlert(alert._id, checked)} />
                                    <Button size="icon" variant="ghost" onClick={() => testAlert(alert._id)}><Play className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => openEdit(alert)}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeAlert(alert._id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>{editing ? "Chinh sua canh bao" : "Tao canh bao moi"}</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2 max-h-[70vh] overflow-auto">
                        <Label>Ten</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Label>Mo ta</Label>
                        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={form.connectionId} onValueChange={(v) => setForm({ ...form, connectionId: v })}>
                                <SelectTrigger><SelectValue placeholder="Ket noi" /></SelectTrigger>
                                <SelectContent>{connections.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={form.table} onValueChange={(v) => setForm({ ...form, table: v, field: "" })}>
                                <SelectTrigger><SelectValue placeholder="Bang" /></SelectTrigger>
                                <SelectContent>{tables.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Select value={form.field} onValueChange={(v) => setForm({ ...form, field: v })}>
                                <SelectTrigger><SelectValue placeholder="Cot" /></SelectTrigger>
                                <SelectContent>{selectedTable?.columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={form.aggregation} onValueChange={(v) => setForm({ ...form, aggregation: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{AGGREGATIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={form.operator} onValueChange={(v) => setForm({ ...form, operator: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{OPERATORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
                            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{FREQUENCIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input type="time" value={form.scheduleTime} onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {CHANNELS.map((channel) => (
                                <label key={channel} className="flex items-center gap-2 border rounded-md px-2 py-1">
                                    <input
                                        type="checkbox"
                                        checked={form.channels.includes(channel)}
                                        onChange={(e) => setForm({ ...form, channels: toggle(form.channels, channel, e.target.checked) })}
                                    />
                                    {channel}
                                </label>
                            ))}
                        </div>
                        {form.channels.includes("email") && <Input placeholder="Emails" value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} />}
                        {form.channels.includes("webhook") && <Input placeholder="Webhook URL" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} />}
                        {form.channels.includes("zalo") && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Zalo user IDs" value={form.zaloUsers} onChange={(e) => setForm({ ...form, zaloUsers: e.target.value })} />
                                <Input placeholder="Zalo webhook URL" value={form.zaloWebhookUrl} onChange={(e) => setForm({ ...form, zaloWebhookUrl: e.target.value })} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Bat thuong</Label>
                                    <Switch checked={form.anomalyEnabled} onCheckedChange={(checked) => setForm({ ...form, anomalyEnabled: checked })} />
                                </div>
                                {form.anomalyEnabled && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select value={form.anomalyMode} onValueChange={(v) => setForm({ ...form, anomalyMode: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{ANOMALY_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Input type="number" value={form.anomalyThreshold} onChange={(e) => setForm({ ...form, anomalyThreshold: Number(e.target.value) })} />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Bao cao dinh ky</Label>
                                    <Switch checked={form.reportEnabled} onCheckedChange={(checked) => setForm({ ...form, reportEnabled: checked })} />
                                </div>
                                {form.reportEnabled && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select value={form.reportFrequency} onValueChange={(v) => setForm({ ...form, reportFrequency: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{REPORT_FREQ.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Input type="time" value={form.reportTime} onChange={(e) => setForm({ ...form, reportTime: e.target.value })} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Kich hoat</Label>
                            <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Huy</Button>
                        <Button onClick={saveAlert} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editing ? "Cap nhat" : "Tao canh bao"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
