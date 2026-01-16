"use client";

import React, { useState, useEffect } from "react";
import { Database, Table, ChevronRight, RefreshCw, Eye, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TableInfo {
    schema: string;
    name: string;
    rowCount: number;
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: string;
    isPrimaryKey: number;
}

interface DatabaseConnection {
    _id: string;
    name: string;
    host: string;
    database: string;
    isDefault: boolean;
}

export default function DatabasePage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [filteredTables, setFilteredTables] = useState<TableInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [sampleData, setSampleData] = useState<Record<string, unknown>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSchema, setIsLoadingSchema] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Database connection state
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, []);

    // Fetch tables when connection changes
    useEffect(() => {
        if (selectedConnectionId || !isLoadingConnections) {
            fetchTables();
        }
    }, [selectedConnectionId]);

    const fetchConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const response = await fetch("/api/connections");
            const result = await response.json();
            if (result.success && result.data) {
                setConnections(result.data);
                // Auto-select default connection
                const defaultConn = result.data.find((c: DatabaseConnection) => c.isDefault);
                if (defaultConn) {
                    setSelectedConnectionId(defaultConn._id);
                } else if (result.data.length > 0) {
                    setSelectedConnectionId(result.data[0]._id);
                }
            }
        } catch (err) {
            console.error("Error fetching connections:", err);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    // Filter tables when search query changes
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredTables(tables);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredTables(
                tables.filter(
                    (table) =>
                        table.name.toLowerCase().includes(query) ||
                        table.schema.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, tables]);

    const fetchTables = async () => {
        setIsLoading(true);
        setError(null);
        setSelectedTable(null);
        setColumns([]);
        setSampleData([]);
        try {
            const url = selectedConnectionId
                ? `/api/database/tables?connectionId=${selectedConnectionId}`
                : "/api/database/tables";
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && result.data?.tables) {
                setTables(result.data.tables);
                setFilteredTables(result.data.tables);
            } else {
                setError(result.error || "Không thể tải danh sách bảng");
            }
        } catch (err) {
            setError("Lỗi kết nối đến server");
            console.error("Error fetching tables:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTable = async (tableName: string) => {
        setSelectedTable(tableName);
        setIsLoadingSchema(true);
        setColumns([]);
        setSampleData([]);

        try {
            const url = selectedConnectionId
                ? `/api/database/schema/${encodeURIComponent(tableName)}?connectionId=${selectedConnectionId}`
                : `/api/database/schema/${encodeURIComponent(tableName)}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && result.data) {
                setColumns(result.data.columns || []);
                setSampleData(result.data.sampleData || []);
            }
        } catch (err) {
            console.error("Error fetching schema:", err);
        } finally {
            setIsLoadingSchema(false);
        }
    };

    const handleConnectionChange = (connectionId: string | null) => {
        if (connectionId) {
            setSelectedConnectionId(connectionId);
        }
    };

    return (
        <>
            <Header
                title="Khám phá CSDL"
                subtitle="Schema"
                showDatePicker={false}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTables}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Làm mới
                    </Button>
                }
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Tables List */}
                <div className="w-80 flex-shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-[#E2E8F0]">
                        {/* Database Selector */}
                        <div className="mb-4">
                            <label className="text-xs text-[#64748B] mb-1 block">Chọn Database</label>
                            <Select
                                value={selectedConnectionId}
                                onValueChange={handleConnectionChange}
                                disabled={isLoadingConnections || connections.length === 0}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue>
                                        {isLoadingConnections
                                            ? "Đang tải..."
                                            : connections.find(c => c._id === selectedConnectionId)?.name || "Chọn database"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {connections.map((conn) => (
                                        <SelectItem key={conn._id} value={conn._id}>
                                            <div className="flex flex-col">
                                                <span>{conn.name}</span>
                                                <span className="text-xs text-[#94A3B8]">{conn.host} / {conn.database}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-3">
                            <Database className="h-4 w-4 text-[#0052CC]" />
                            Danh sách bảng
                        </div>

                        {/* Search Box */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                            <Input
                                placeholder="Tìm kiếm bảng..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <p className="text-xs text-[#64748B] mt-2">
                            {isLoading ? (
                                "Đang tải..."
                            ) : (
                                <>
                                    {filteredTables.length} / {tables.length} bảng
                                    {searchQuery && " (đang lọc)"}
                                </>
                            )}
                        </p>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 border-b border-red-200">
                            <p className="text-sm text-red-600">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchTables}
                                className="mt-2 text-red-600 border-red-300"
                            >
                                Thử lại
                            </Button>
                        </div>
                    )}

                    {/* Tables List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="h-6 w-6 text-[#0052CC] animate-spin" />
                            </div>
                        ) : filteredTables.length === 0 ? (
                            <div className="text-center py-8 text-[#64748B]">
                                {searchQuery ? (
                                    <>
                                        <p className="text-sm">Không tìm thấy bảng nào</p>
                                        <p className="text-xs mt-1">Thử từ khóa khác</p>
                                    </>
                                ) : (
                                    <p className="text-sm">Chưa có bảng nào</p>
                                )}
                            </div>
                        ) : (
                            filteredTables.map((table) => (
                                <button
                                    key={`${table.schema}.${table.name}`}
                                    onClick={() => handleSelectTable(table.name)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg transition-all mb-1",
                                        selectedTable === table.name
                                            ? "bg-[#0052CC]/10 text-[#0052CC]"
                                            : "hover:bg-[#F8FAFC] text-[#64748B]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Table className="h-4 w-4" />
                                        <div className="text-left">
                                            <p
                                                className={cn(
                                                    "text-sm font-medium",
                                                    selectedTable === table.name
                                                        ? "text-[#0052CC]"
                                                        : "text-[#0F172A]"
                                                )}
                                            >
                                                {table.name}
                                            </p>
                                            <p className="text-xs text-[#94A3B8]">
                                                {table.schema} • {table.rowCount?.toLocaleString() || 0} dòng
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel - Schema & Data */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
                    {selectedTable ? (
                        <div className="max-w-[1200px] mx-auto space-y-6">
                            {/* Schema Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Table className="h-5 w-5 text-[#0052CC]" />
                                        Schema: {selectedTable}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingSchema ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCw className="h-6 w-6 text-[#0052CC] animate-spin" />
                                        </div>
                                    ) : columns.length === 0 ? (
                                        <p className="text-[#64748B] text-center py-4">
                                            Không có thông tin cột
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-[#E2E8F0]">
                                                        <th className="text-left py-3 px-4 font-semibold text-[#64748B]">
                                                            Cột
                                                        </th>
                                                        <th className="text-left py-3 px-4 font-semibold text-[#64748B]">
                                                            Kiểu dữ liệu
                                                        </th>
                                                        <th className="text-left py-3 px-4 font-semibold text-[#64748B]">
                                                            Nullable
                                                        </th>
                                                        <th className="text-left py-3 px-4 font-semibold text-[#64748B]">
                                                            Khóa
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {columns.map((col) => (
                                                        <tr
                                                            key={col.name}
                                                            className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]"
                                                        >
                                                            <td className="py-3 px-4 font-medium text-[#0F172A]">
                                                                {col.name}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className="px-2 py-0.5 bg-[#F1F5F9] rounded text-xs font-mono text-[#64748B]">
                                                                    {col.type}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-[#64748B]">
                                                                {col.nullable === "YES" ? "Có" : "Không"}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {col.isPrimaryKey ? (
                                                                    <span className="px-2 py-0.5 bg-[#0052CC]/10 text-[#0052CC] rounded text-xs font-semibold">
                                                                        PK
                                                                    </span>
                                                                ) : (
                                                                    "-"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Sample Data Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-[#0052CC]" />
                                        Dữ liệu mẫu (10 dòng đầu)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingSchema ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCw className="h-6 w-6 text-[#0052CC] animate-spin" />
                                        </div>
                                    ) : sampleData.length === 0 ? (
                                        <p className="text-[#64748B] text-center py-4">
                                            Không có dữ liệu mẫu
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-[#E2E8F0]">
                                                        {Object.keys(sampleData[0]).map((key) => (
                                                            <th
                                                                key={key}
                                                                className="text-left py-3 px-4 font-semibold text-[#64748B] whitespace-nowrap"
                                                            >
                                                                {key}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sampleData.map((row, i) => (
                                                        <tr
                                                            key={i}
                                                            className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]"
                                                        >
                                                            {Object.values(row).map((val, j) => (
                                                                <td
                                                                    key={j}
                                                                    className="py-3 px-4 text-[#0F172A] whitespace-nowrap"
                                                                >
                                                                    {val === null ? (
                                                                        <span className="text-[#94A3B8] italic">null</span>
                                                                    ) : (
                                                                        String(val)
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="size-20 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                                <Database className="h-10 w-10 text-[#64748B]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                                Chọn một bảng
                            </h3>
                            <p className="text-sm text-[#64748B] max-w-md">
                                Chọn một bảng từ danh sách bên trái để xem schema và dữ liệu mẫu.
                                Sử dụng ô tìm kiếm để lọc bảng nhanh hơn.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
