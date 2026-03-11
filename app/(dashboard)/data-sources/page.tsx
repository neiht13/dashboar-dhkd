"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Database, HardDrive, Upload, Table2, Plus, Trash2,
    RefreshCw, Search, FileSpreadsheet, Save, Code,
    Plug, FolderOpen, Eye, Pencil, Loader2, ChevronRight,
    MoreHorizontal, AlertCircle, X
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// =============================================
// TYPES
// =============================================

interface DatabaseConnection {
    id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    encrypt: boolean;
    isDefault: boolean;
    status?: "connected" | "error" | "unknown";
}

interface Dataset {
    id: string;
    name: string;
    description?: string;
    sourceType: "table" | "query" | "import" | "storedProcedure";
    table?: string;
    schema?: string;
    customQuery?: string;
    storedProcedureName?: string;
    connectionId?: string;
    importedFileName?: string;
    columns: { name: string; type: string; nullable?: boolean; isPrimaryKey?: boolean }[];
    rowCount?: number;
    lastRefreshed?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface PreviewData {
    rows: Record<string, unknown>[];
    totalRows: number;
    columns: { name: string; type: string }[];
}

type ActiveTab = "connections" | "datasets" | "explorer";

// =============================================
// MAIN PAGE
// =============================================

export default function DataSourcesPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("connections");
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Connection form state
    const [showConnectionForm, setShowConnectionForm] = useState(false);
    const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
    const [connectionForm, setConnectionForm] = useState({
        name: "", host: "", port: 1433, database: "", user: "", password: "", encrypt: false,
    });

    // Dataset form
    const [showDatasetForm, setShowDatasetForm] = useState(false);
    const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
    const [dsForm, setDsForm] = useState({
        name: "", description: "", sourceType: "table" as Dataset["sourceType"],
        table: "", customQuery: "", storedProcedureName: "", connectionId: "",
    });
    const [isSavingDs, setIsSavingDs] = useState(false);

    // Import state
    const [importedData, setImportedData] = useState<Record<string, unknown>[]>([]);
    const [importedFileName, setImportedFileName] = useState("");

    // Preview
    const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Explorer state (database tables)
    const [dbTables, setDbTables] = useState<{ name: string; schema: string; rowCount: number }[]>([]);
    const [explorerConnectionId, setExplorerConnectionId] = useState("");
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableSchema, setTableSchema] = useState<{ columns: Record<string, unknown>[]; sampleData: Record<string, unknown>[] } | null>(null);
    const [loadingExplorer, setLoadingExplorer] = useState(false);

    // Stored procedures
    const [storedProcedures, setStoredProcedures] = useState<{ name: string }[]>([]);

    // ============ LOAD DATA ============

    const loadConnections = useCallback(async () => {
        try {
            const res = await fetch("/api/connections");
            const data = await res.json();
            if (data.success && data.data) {
                setConnections(data.data.map((c: Record<string, unknown>) => ({
                    ...c,
                    id: (c._id || c.id) as string,
                    status: "unknown",
                })));
            }
        } catch { /* empty */ }
    }, []);

    const loadDatasets = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/datasets");
            const data = await res.json();
            if (data.success && data.data) {
                setDatasets(data.data);
            }
        } catch { /* empty */ } finally {
            setIsLoading(false);
        }
    }, []);

    const loadExplorerTables = useCallback(async (connId?: string) => {
        setLoadingExplorer(true);
        try {
            const url = connId
                ? `/api/database/tables?connectionId=${connId}`
                : "/api/database/tables";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                const tables = data.data?.tables || data.data || [];
                setDbTables(tables);
            }
        } catch { /* empty */ } finally {
            setLoadingExplorer(false);
        }
    }, []);

    const loadStoredProcedures = useCallback(async () => {
        try {
            const res = await fetch("/api/database/stored-procedure");
            const data = await res.json();
            if (data.success) {
                setStoredProcedures(data.data || []);
            }
        } catch { /* empty */ }
    }, []);

    useEffect(() => {
        loadConnections();
        loadDatasets();
        loadStoredProcedures();
    }, [loadConnections, loadDatasets, loadStoredProcedures]);

    // ============ CONNECTION HANDLERS ============

    const handleTestConnection = async (id: string) => {
        try {
            const res = await fetch(`/api/connections/${id}/test`, { method: "POST" });
            const data = await res.json();
            setConnections(prev => prev.map(c =>
                c.id === id ? { ...c, status: data.success ? "connected" : "error" } : c
            ));
            toast[data.success ? "success" : "error"](
                data.success ? "Kết nối thành công!" : "Kết nối thất bại"
            );
        } catch {
            toast.error("Lỗi khi test kết nối");
        }
    };

    const handleSaveConnection = async () => {
        try {
            const url = editingConnection
                ? `/api/connections/${editingConnection.id}`
                : "/api/connections";
            const method = editingConnection ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(connectionForm),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingConnection ? "Đã cập nhật kết nối" : "Đã tạo kết nối mới");
                loadConnections();
                setShowConnectionForm(false);
                setEditingConnection(null);
            } else {
                toast.error(data.error || "Lỗi khi lưu kết nối");
            }
        } catch {
            toast.error("Lỗi mạng");
        }
    };

    const handleDeleteConnection = async (id: string) => {
        if (!confirm("Xác nhận xoá kết nối này?")) return;
        try {
            await fetch(`/api/connections/${id}`, { method: "DELETE" });
            loadConnections();
            toast.success("Đã xoá kết nối");
        } catch {
            toast.error("Lỗi khi xoá");
        }
    };

    // ============ DATASET HANDLERS ============

    const openCreateDataset = (sourceType?: Dataset["sourceType"], prefillTable?: string) => {
        setEditingDataset(null);
        setDsForm({
            name: prefillTable || "",
            description: "",
            sourceType: sourceType || "table",
            table: prefillTable || "",
            customQuery: "",
            storedProcedureName: "",
            connectionId: explorerConnectionId,
        });
        setImportedData([]);
        setImportedFileName("");
        setShowDatasetForm(true);
    };

    const openEditDataset = (ds: Dataset) => {
        setEditingDataset(ds);
        setDsForm({
            name: ds.name,
            description: ds.description || "",
            sourceType: ds.sourceType,
            table: ds.table || "",
            customQuery: ds.customQuery || "",
            storedProcedureName: ds.storedProcedureName || "",
            connectionId: ds.connectionId || "",
        });
        setShowDatasetForm(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportedFileName(file.name);
        if (!dsForm.name) setDsForm(f => ({ ...f, name: file.name.replace(/\.[^/.]+$/, "") }));

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(text);
                    setImportedData(Array.isArray(data) ? data : [data]);
                } else {
                    const lines = text.split('\n').filter(l => l.trim());
                    if (lines.length < 2) return;
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const rows = lines.slice(1).map(line => {
                        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const obj: Record<string, unknown> = {};
                        headers.forEach((h, i) => {
                            const num = Number(vals[i]);
                            obj[h] = !isNaN(num) && vals[i] !== '' ? num : vals[i];
                        });
                        return obj;
                    });
                    setImportedData(rows);
                }
            } catch {
                toast.error("Không thể đọc file");
            }
        };
        reader.readAsText(file);
    };

    const handleSaveDataset = async () => {
        if (!dsForm.name.trim()) return;
        setIsSavingDs(true);
        try {
            const payload: Record<string, unknown> = {
                name: dsForm.name.trim(),
                description: dsForm.description.trim(),
                sourceType: dsForm.sourceType,
            };

            if (dsForm.sourceType === "table") payload.table = dsForm.table;
            else if (dsForm.sourceType === "query") payload.customQuery = dsForm.customQuery;
            else if (dsForm.sourceType === "import") {
                payload.importedData = importedData;
                payload.importedFileName = importedFileName;
            } else if (dsForm.sourceType === "storedProcedure") payload.storedProcedureName = dsForm.storedProcedureName;

            if (dsForm.connectionId) payload.connectionId = dsForm.connectionId;

            const url = editingDataset ? `/api/datasets/${editingDataset.id}` : "/api/datasets";
            const method = editingDataset ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingDataset ? "Đã cập nhật bộ dữ liệu" : "Đã tạo bộ dữ liệu");
                setShowDatasetForm(false);
                loadDatasets();
            } else {
                toast.error(data.error || "Lỗi khi lưu");
            }
        } catch {
            toast.error("Lỗi mạng");
        } finally {
            setIsSavingDs(false);
        }
    };

    const handleDeleteDataset = async (id: string) => {
        if (!confirm("Xác nhận xoá bộ dữ liệu này?")) return;
        try {
            const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Đã xoá bộ dữ liệu");
                loadDatasets();
            }
        } catch {
            toast.error("Lỗi khi xoá");
        }
    };

    const handlePreview = async (id: string) => {
        if (previewDatasetId === id) {
            setPreviewDatasetId(null);
            return;
        }
        setPreviewDatasetId(id);
        setIsPreviewLoading(true);
        try {
            const res = await fetch(`/api/datasets/${id}/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ limit: 20 }),
            });
            const data = await res.json();
            if (data.success) setPreviewData(data.data);
        } catch { /* empty */ } finally {
            setIsPreviewLoading(false);
        }
    };

    // ============ EXPLORER HANDLERS ============

    const handleExploreTable = async (tableName: string) => {
        if (selectedTable === tableName) {
            setSelectedTable(null);
            return;
        }
        setSelectedTable(tableName);
        try {
            const url = explorerConnectionId
                ? `/api/database/schema/${tableName}?connectionId=${explorerConnectionId}`
                : `/api/database/schema/${tableName}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setTableSchema(data.data);
        } catch { /* empty */ }
    };

    // Filter datasets
    const filteredDatasets = searchTerm
        ? datasets.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.table?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : datasets;

    // ============ TABS ============

    const TABS = [
        { id: "connections" as const, label: "Kết nối Database", icon: Plug, count: connections.length },
        { id: "datasets" as const, label: "Bộ dữ liệu", icon: FolderOpen, count: datasets.length },
        { id: "explorer" as const, label: "Khám phá dữ liệu", icon: Table2, count: dbTables.length },
    ];

    const getSourceBadge = (source: Dataset["sourceType"]) => {
        const map = {
            table: { label: "Bảng", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
            query: { label: "SQL", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
            import: { label: "Import", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
            storedProcedure: { label: "SP", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        };
        const c = map[source];
        return <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium", c.cls)}>{c.label}</span>;
    };

    return (
        <>
            <Header
                title="Nguồn dữ liệu"
                subtitle="Quản lý kết nối, bộ dữ liệu và khám phá database"
                showDatePicker={false}
                showSearch={false}
            />

            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-gray-950 p-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {TABS.map(({ id, label, icon: Icon, count }) => (
                        <button
                            key={id}
                            onClick={() => {
                                setActiveTab(id);
                                if (id === "explorer" && dbTables.length === 0) loadExplorerTables();
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === id
                                    ? "bg-white dark:bg-gray-800 shadow-md text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            {count > 0 && (
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ============ TAB: CONNECTIONS ============ */}
                {activeTab === "connections" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Kết nối Database</h2>
                            <Button
                                onClick={() => {
                                    setEditingConnection(null);
                                    setConnectionForm({ name: "", host: "", port: 1433, database: "", user: "", password: "", encrypt: false });
                                    setShowConnectionForm(true);
                                }}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" /> Thêm kết nối
                            </Button>
                        </div>

                        {connections.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Database className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Chưa có kết nối database nào</p>
                                <Button variant="outline" className="mt-3" onClick={() => setShowConnectionForm(true)}>
                                    Tạo kết nối đầu tiên
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {connections.map((conn) => (
                                    <div
                                        key={conn.id}
                                        className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            conn.status === "connected" ? "bg-green-100 dark:bg-green-900/30" :
                                                conn.status === "error" ? "bg-red-100 dark:bg-red-900/30" :
                                                    "bg-gray-100 dark:bg-gray-700"
                                        )}>
                                            <Database className={cn(
                                                "h-5 w-5",
                                                conn.status === "connected" ? "text-green-600" :
                                                    conn.status === "error" ? "text-red-600" : "text-gray-500"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{conn.name}</h3>
                                                {conn.isDefault && (
                                                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                                                        Mặc định
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {conn.host}:{conn.port} / {conn.database}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleTestConnection(conn.id)} className="h-8 px-2 text-xs gap-1">
                                                <RefreshCw className="h-3 w-3" /> Test
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                setEditingConnection(conn);
                                                setConnectionForm({ name: conn.name, host: conn.host, port: conn.port, database: conn.database, user: conn.user, password: "", encrypt: conn.encrypt });
                                                setShowConnectionForm(true);
                                            }} className="h-8 px-2 text-xs">Sửa</Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteConnection(conn.id)} className="h-8 px-2 text-xs text-red-500 hover:text-red-700">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============ TAB: DATASETS ============ */}
                {activeTab === "datasets" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Bộ dữ liệu</h2>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Tìm..."
                                        className="w-56 h-9 pl-8 text-sm"
                                    />
                                </div>
                                <Button onClick={() => openCreateDataset()} className="gap-2">
                                    <Plus className="h-4 w-4" /> Thêm
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                            </div>
                        ) : filteredDatasets.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {searchTerm ? "Không tìm thấy kết quả" : "Chưa có bộ dữ liệu nào"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Tạo bộ dữ liệu từ bảng, SQL query, import file hoặc stored procedure
                                </p>
                                {!searchTerm && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => openCreateDataset("table")} className="gap-1.5 text-xs">
                                            <Table2 className="h-3.5 w-3.5" /> Từ bảng
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openCreateDataset("query")} className="gap-1.5 text-xs">
                                            <Code className="h-3.5 w-3.5" /> Từ SQL
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openCreateDataset("import")} className="gap-1.5 text-xs">
                                            <Upload className="h-3.5 w-3.5" /> Import file
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredDatasets.map((ds) => (
                                    <div key={ds.id}>
                                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                ds.sourceType === "import" ? "bg-green-100 dark:bg-green-900/30" :
                                                    ds.sourceType === "query" ? "bg-purple-100 dark:bg-purple-900/30" :
                                                        ds.sourceType === "storedProcedure" ? "bg-amber-100 dark:bg-amber-900/30" :
                                                            "bg-blue-100 dark:bg-blue-900/30"
                                            )}>
                                                {ds.sourceType === "import" ? <FileSpreadsheet className="h-5 w-5 text-green-600" /> :
                                                    ds.sourceType === "query" ? <Code className="h-5 w-5 text-purple-600" /> :
                                                        ds.sourceType === "storedProcedure" ? <Code className="h-5 w-5 text-amber-600" /> :
                                                            <Table2 className="h-5 w-5 text-blue-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{ds.name}</h3>
                                                    {getSourceBadge(ds.sourceType)}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {ds.description || (
                                                        ds.sourceType === "table" ? `Bảng: ${ds.table}` :
                                                            ds.sourceType === "query" ? "Custom SQL Query" :
                                                                ds.sourceType === "import" ? `File: ${ds.importedFileName}` :
                                                                    `SP: ${ds.storedProcedureName}`
                                                    )}
                                                    {ds.columns?.length > 0 && <span className="ml-2">• {ds.columns.length} cột</span>}
                                                    {ds.rowCount != null && <span className="ml-2">• {ds.rowCount.toLocaleString()} dòng</span>}
                                                </p>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePreview(ds.id)} className="text-xs gap-2">
                                                        <Eye className="h-3.5 w-3.5" /> Xem trước dữ liệu
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditDataset(ds)} className="text-xs gap-2">
                                                        <Pencil className="h-3.5 w-3.5" /> Sửa
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteDataset(ds.id)} className="text-xs gap-2 text-red-600 focus:text-red-600">
                                                        <Trash2 className="h-3.5 w-3.5" /> Xóa
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Inline preview */}
                                        {previewDatasetId === ds.id && (
                                            <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                                {isPreviewLoading ? (
                                                    <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tải dữ liệu...
                                                    </div>
                                                ) : previewData && previewData.rows.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                                <tr>
                                                                    {previewData.columns.map(c => (
                                                                        <th key={c.name} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 border-b whitespace-nowrap">
                                                                            {c.name}
                                                                            <span className="text-[9px] text-gray-400 ml-1">({c.type})</span>
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {previewData.rows.map((row, i) => (
                                                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                        {previewData.columns.map(c => (
                                                                            <td key={c.name} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                                                                                {row[c.name] != null ? String(row[c.name]) : <span className="text-gray-300 italic">null</span>}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <p className="text-[10px] text-gray-400 mt-2">
                                                            Hiển thị {previewData.rows.length} / {previewData.totalRows} dòng
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-center py-4 text-sm text-gray-400">Không có dữ liệu</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============ TAB: EXPLORER ============ */}
                {activeTab === "explorer" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Khám phá Database</h2>
                            <div className="flex items-center gap-2">
                                {connections.length > 0 && (
                                    <select
                                        value={explorerConnectionId}
                                        onChange={e => {
                                            setExplorerConnectionId(e.target.value);
                                            loadExplorerTables(e.target.value || undefined);
                                        }}
                                        className="h-9 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3"
                                    >
                                        <option value="">Kết nối mặc định</option>
                                        {connections.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.database})</option>
                                        ))}
                                    </select>
                                )}
                                <Button variant="outline" size="sm" onClick={() => loadExplorerTables(explorerConnectionId || undefined)} className="gap-1.5">
                                    <RefreshCw className={cn("h-3.5 w-3.5", loadingExplorer && "animate-spin")} /> Tải lại
                                </Button>
                            </div>
                        </div>

                        {loadingExplorer ? (
                            <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách bảng...
                            </div>
                        ) : dbTables.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Database className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500">Không tìm thấy bảng nào</p>
                                <p className="text-xs text-gray-400 mt-1">Kiểm tra kết nối database</p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {dbTables.map((tbl) => (
                                    <div key={`${tbl.schema}.${tbl.name}`}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border transition-all cursor-pointer",
                                                selectedTable === tbl.name
                                                    ? "border-blue-300 dark:border-blue-700 shadow-md"
                                                    : "border-gray-200 dark:border-gray-700 hover:shadow-sm"
                                            )}
                                            onClick={() => handleExploreTable(tbl.name)}
                                        >
                                            <ChevronRight className={cn(
                                                "h-4 w-4 text-gray-400 transition-transform",
                                                selectedTable === tbl.name && "rotate-90"
                                            )} />
                                            <Table2 className="h-4 w-4 text-blue-500" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {tbl.schema !== "dbo" ? `${tbl.schema}.` : ""}{tbl.name}
                                                </span>
                                                <span className="text-[10px] text-gray-400 ml-2">{tbl.rowCount?.toLocaleString()} dòng</span>
                                            </div>
                                            <Button
                                                variant="outline" size="sm"
                                                onClick={(e) => { e.stopPropagation(); openCreateDataset("table", tbl.name); }}
                                                className="h-7 text-[10px] gap-1"
                                            >
                                                <Plus className="h-3 w-3" /> Tạo dataset
                                            </Button>
                                        </div>

                                        {/* Table schema details */}
                                        {selectedTable === tbl.name && tableSchema && (
                                            <div className="ml-8 mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Cột ({(tableSchema.columns as Record<string, unknown>[]).length})</h4>
                                                <div className="grid grid-cols-2 gap-1 mb-3">
                                                    {(tableSchema.columns as Record<string, unknown>[]).map((col) => (
                                                        <div key={col.name as string} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-white dark:bg-gray-800">
                                                            <span className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                col.isPrimaryKey ? "bg-amber-400" :
                                                                    (col.type as string)?.includes("int") ? "bg-blue-400" :
                                                                        (col.type as string)?.includes("date") ? "bg-orange-400" : "bg-green-400"
                                                            )} />
                                                            <span className="font-medium text-gray-700 dark:text-gray-200">{col.name as string}</span>
                                                            <span className="text-gray-400 text-[10px]">{col.type as string}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {(tableSchema.sampleData as Record<string, unknown>[])?.length > 0 && (
                                                    <>
                                                        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Dữ liệu mẫu</h4>
                                                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded">
                                                            <table className="w-full text-[10px]">
                                                                <thead className="bg-gray-100 dark:bg-gray-700">
                                                                    <tr>
                                                                        {Object.keys((tableSchema.sampleData as Record<string, unknown>[])[0]).map(k => (
                                                                            <th key={k} className="px-2 py-1 text-left font-medium text-gray-500 whitespace-nowrap">{k}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(tableSchema.sampleData as Record<string, unknown>[]).slice(0, 3).map((row, i) => (
                                                                        <tr key={i}>
                                                                            {Object.values(row).map((v, j) => (
                                                                                <td key={j} className="px-2 py-0.5 text-gray-600 dark:text-gray-300 whitespace-nowrap max-w-[100px] truncate">
                                                                                    {v != null ? String(v) : "-"}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ============ CONNECTION FORM DIALOG ============ */}
            <Dialog open={showConnectionForm} onOpenChange={setShowConnectionForm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingConnection ? "Sửa kết nối" : "Thêm kết nối mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label className="text-sm">Tên kết nối</Label>
                            <Input value={connectionForm.name} onChange={e => setConnectionForm(f => ({ ...f, name: e.target.value }))} placeholder="Production DB" className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm">Host</Label>
                                <Input value={connectionForm.host} onChange={e => setConnectionForm(f => ({ ...f, host: e.target.value }))} placeholder="10.82.14.248" className="mt-1" />
                            </div>
                            <div>
                                <Label className="text-sm">Port</Label>
                                <Input type="number" value={connectionForm.port} onChange={e => setConnectionForm(f => ({ ...f, port: parseInt(e.target.value) || 1433 }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm">Database</Label>
                            <Input value={connectionForm.database} onChange={e => setConnectionForm(f => ({ ...f, database: e.target.value }))} placeholder="REPORTSERVICE" className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-sm">User</Label>
                                <Input value={connectionForm.user} onChange={e => setConnectionForm(f => ({ ...f, user: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label className="text-sm">Password</Label>
                                <Input type="password" value={connectionForm.password} onChange={e => setConnectionForm(f => ({ ...f, password: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={connectionForm.encrypt} onChange={e => setConnectionForm(f => ({ ...f, encrypt: e.target.checked }))} className="rounded" />
                            Mã hoá kết nối (Encrypt)
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConnectionForm(false)}>Huỷ</Button>
                        <Button onClick={handleSaveConnection}>{editingConnection ? "Cập nhật" : "Tạo kết nối"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DATASET FORM DIALOG ============ */}
            <Dialog open={showDatasetForm} onOpenChange={setShowDatasetForm}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            {editingDataset ? "Sửa bộ dữ liệu" : "Thêm bộ dữ liệu mới"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Tạo bộ dữ liệu để sử dụng trong Dashboard Builder.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs">Tên *</Label>
                            <Input value={dsForm.name} onChange={e => setDsForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Thuê bao tháng 12" className="mt-1 h-8 text-xs" />
                        </div>
                        <div>
                            <Label className="text-xs">Mô tả</Label>
                            <Input value={dsForm.description} onChange={e => setDsForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn..." className="mt-1 h-8 text-xs" />
                        </div>

                        {connections.length > 0 && dsForm.sourceType !== "import" && (
                            <div>
                                <Label className="text-xs">Kết nối</Label>
                                <select value={dsForm.connectionId} onChange={e => setDsForm(f => ({ ...f, connectionId: e.target.value }))}
                                    className="mt-1 w-full h-8 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                    <option value="">Mặc định</option>
                                    {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.database})</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs">Loại nguồn *</Label>
                            <div className="grid grid-cols-4 gap-1.5 mt-1">
                                {[
                                    { value: "table" as const, icon: Table2, label: "Bảng" },
                                    { value: "query" as const, icon: Code, label: "SQL" },
                                    { value: "import" as const, icon: Upload, label: "Import" },
                                    { value: "storedProcedure" as const, icon: Database, label: "SP" },
                                ].map(({ value, icon: Icon, label }) => (
                                    <button key={value} type="button" onClick={() => setDsForm(f => ({ ...f, sourceType: value }))}
                                        className={cn("flex flex-col items-center gap-1 p-2 rounded border text-[10px] transition-all",
                                            dsForm.sourceType === value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300")}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dsForm.sourceType === "table" && (
                            <div>
                                <Label className="text-xs">Chọn bảng *</Label>
                                <select value={dsForm.table} onChange={e => { setDsForm(f => ({ ...f, table: e.target.value })); if (!dsForm.name) setDsForm(f => ({ ...f, name: e.target.value })); }}
                                    className="mt-1 w-full h-8 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                    <option value="">-- Chọn --</option>
                                    {dbTables.map(t => <option key={t.name} value={t.name}>{t.schema !== 'dbo' ? `${t.schema}.` : ''}{t.name} ({t.rowCount} dòng)</option>)}
                                </select>
                                {dbTables.length === 0 && <p className="text-[10px] text-gray-400 mt-1">Chuyển sang tab Khám phá để tải danh sách bảng.</p>}
                            </div>
                        )}

                        {dsForm.sourceType === "query" && (
                            <div>
                                <Label className="text-xs">SQL Query *</Label>
                                <Textarea value={dsForm.customQuery} onChange={e => setDsForm(f => ({ ...f, customQuery: e.target.value }))} placeholder="SELECT * FROM ..." className="mt-1 min-h-[100px] text-xs font-mono" />
                            </div>
                        )}

                        {dsForm.sourceType === "import" && (
                            <div>
                                <Label className="text-xs">File (CSV, JSON)</Label>
                                <input type="file" accept=".csv,.json,.xlsx,.xls" onChange={handleFileUpload}
                                    className="mt-1 w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                {importedData.length > 0 && <p className="mt-1 text-[10px] text-green-600">{importedData.length} dòng, {Object.keys(importedData[0]).length} cột</p>}
                            </div>
                        )}

                        {dsForm.sourceType === "storedProcedure" && (
                            <div>
                                <Label className="text-xs">Stored Procedure *</Label>
                                {storedProcedures.length > 0 ? (
                                    <select value={dsForm.storedProcedureName} onChange={e => { setDsForm(f => ({ ...f, storedProcedureName: e.target.value })); if (!dsForm.name) setDsForm(f => ({ ...f, name: e.target.value })); }}
                                        className="mt-1 w-full h-8 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                        <option value="">-- Chọn --</option>
                                        {storedProcedures.map(sp => <option key={sp.name} value={sp.name}>{sp.name}</option>)}
                                    </select>
                                ) : (
                                    <Input value={dsForm.storedProcedureName} onChange={e => setDsForm(f => ({ ...f, storedProcedureName: e.target.value }))} placeholder="sp_GetReport" className="mt-1 h-8 text-xs font-mono" />
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDatasetForm(false)} className="text-xs">Hủy</Button>
                        <Button size="sm" onClick={handleSaveDataset} disabled={isSavingDs || !dsForm.name.trim()} className="text-xs">
                            {isSavingDs ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Đang lưu...</> : editingDataset ? "Cập nhật" : "Tạo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
