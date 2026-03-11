"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
    Search, ChevronRight, ChevronDown, Database,
    Hash, Type, Calendar, Table2, FileSpreadsheet, Code,
    FolderOpen, RefreshCw, PanelRightClose, Eye, Loader2,
    ExternalLink, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useDatasetStore,
    type Dataset,
    type DatasetColumn,
} from "@/stores/dataset-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useShallow } from "zustand/react/shallow";

// =============================================
// DRAGGABLE FIELD ITEM
// =============================================

function DraggableField({ field, datasetId, datasetTable }: {
    field: DatasetColumn;
    datasetId: string;
    datasetTable: string;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `data-field-${datasetId}-${field.name}`,
        data: {
            type: "data-field",
            field: field.name,
            fieldType: field.type,
            table: datasetTable,
            datasetId,
        },
    });

    const getFieldIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("int") || t.includes("decimal") || t.includes("float") || t.includes("numeric") || t.includes("money") || t.includes("bit") || t === "number") {
            return <Hash className="h-3 w-3 text-blue-500 flex-shrink-0" />;
        }
        if (t.includes("date") || t.includes("time")) {
            return <Calendar className="h-3 w-3 text-orange-500 flex-shrink-0" />;
        }
        return <Type className="h-3 w-3 text-green-500 flex-shrink-0" />;
    };

    const isNumeric = (type: string) => {
        const t = type.toLowerCase();
        return t.includes("int") || t.includes("decimal") || t.includes("float") || t.includes("numeric") || t.includes("money") || t === "number";
    };

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={cn(
                "flex items-center gap-2 px-3 py-1 text-[11px] cursor-grab hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors",
                isDragging && "opacity-50 bg-blue-50 dark:bg-blue-900/30"
            )}
        >
            {getFieldIcon(field.type)}
            <span className="flex-1 truncate text-gray-700 dark:text-gray-200">
                {field.name}
            </span>
            {field.isPrimaryKey && (
                <span className="text-[8px] text-amber-500 font-bold">PK</span>
            )}
            {isNumeric(field.type) && (
                <span className="text-[9px] text-gray-400 font-mono">Σ</span>
            )}
        </div>
    );
}

// =============================================
// SOURCE ICON
// =============================================

function getSourceIcon(source: Dataset["sourceType"]) {
    switch (source) {
        case "import":
            return <FileSpreadsheet className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />;
        case "query":
            return <Code className="h-3 w-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />;
        case "storedProcedure":
            return <Code className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
        default:
            return <Table2 className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
    }
}

function getSourceLabel(source: Dataset["sourceType"]) {
    const map = { table: "Bảng", query: "SQL", import: "Import", storedProcedure: "SP" };
    return map[source] || source;
}

// =============================================
// MAIN DATA PANEL - Dataset selector only
// =============================================

interface DataPanelProps {
    onClose?: () => void;
}

export function DataPanel({ onClose }: DataPanelProps) {
    const { datasets, isLoading, fetchDatasets, previewDataset, previewData, isPreviewLoading } = useDatasetStore();

    // Lấy thông tin widget đang chọn để highlight dataset đang dùng
    const { selectedWidgetId, currentDashboard } = useDashboardStore(
        useShallow((s) => ({
            selectedWidgetId: s.selectedWidgetId,
            currentDashboard: s.currentDashboard,
        }))
    );

    const selectedWidget = currentDashboard?.widgets.find(w => w.id === selectedWidgetId);
    const activeTable = selectedWidget?.type === "chart"
        ? (selectedWidget.config as { dataSource?: { table?: string } })?.dataSource?.table
        : undefined;

    const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [previewingId, setPreviewingId] = useState<string | null>(null);

    // Load datasets on mount
    useEffect(() => {
        fetchDatasets();
    }, [fetchDatasets]);

    // Auto-expand dataset matching active chart
    useEffect(() => {
        if (activeTable && datasets.length > 0) {
            const match = datasets.find(d => d.table === activeTable || d.name === activeTable);
            if (match) {
                setExpandedDatasets(prev => new Set([...prev, match.id]));
            }
        } else if (datasets.length > 0 && expandedDatasets.size === 0) {
            setExpandedDatasets(new Set([datasets[0].id]));
        }
    }, [activeTable, datasets]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredDatasets = useMemo(() => {
        if (!searchTerm) return datasets;
        const term = searchTerm.toLowerCase();
        return datasets.filter(
            (d) =>
                d.name.toLowerCase().includes(term) ||
                d.description?.toLowerCase().includes(term) ||
                d.columns.some((c) => c.name.toLowerCase().includes(term))
        );
    }, [datasets, searchTerm]);

    const toggleDataset = useCallback((id: string) => {
        setExpandedDatasets((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handlePreview = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewingId === id) {
            setPreviewingId(null);
            return;
        }
        setPreviewingId(id);
        await previewDataset(id, 10);
    }, [previewingId, previewDataset]);

    return (
        <div className="w-[240px] flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                        Dữ liệu
                    </span>
                    {datasets.length > 0 && (
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                            {datasets.length}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={fetchDatasets}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        title="Tải lại"
                    >
                        <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        >
                            <PanelRightClose className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm bộ dữ liệu..."
                        className="h-7 pl-7 text-[11px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                    />
                </div>
            </div>

            {/* Datasets tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {isLoading && datasets.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang tải...
                    </div>
                ) : filteredDatasets.length === 0 ? (
                    <div className="text-center py-8 px-3">
                        <Database className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            Chưa có bộ dữ liệu
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            Vào <strong>Nguồn dữ liệu</strong> ở sidebar để tạo và quản lý bộ dữ liệu.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open("/data-sources", "_blank")}
                            className="mt-3 text-[10px] h-7 gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Nguồn dữ liệu
                        </Button>
                    </div>
                ) : (
                    filteredDatasets.map((dataset) => {
                        const isActive = activeTable && (dataset.table === activeTable || dataset.name === activeTable);
                        const isExpanded = expandedDatasets.has(dataset.id);

                        return (
                            <div key={dataset.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                                {/* Dataset header */}
                                <div
                                    className={cn(
                                        "flex items-center gap-1 pr-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group",
                                        isActive && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <button
                                        onClick={() => toggleDataset(dataset.id)}
                                        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left min-w-0"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        )}
                                        {getSourceIcon(dataset.sourceType)}
                                        <span className={cn(
                                            "text-[11px] font-medium truncate flex-1",
                                            isActive
                                                ? "text-blue-700 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-200"
                                        )}>
                                            {dataset.name}
                                        </span>
                                        {isActive && (
                                            <Check className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Quick info */}
                                    <span className="text-[8px] text-gray-400 px-1 hidden group-hover:inline">
                                        {getSourceLabel(dataset.sourceType)}
                                    </span>

                                    {/* Preview button */}
                                    <button
                                        onClick={(e) => handlePreview(dataset.id, e)}
                                        className={cn(
                                            "p-0.5 rounded transition-opacity",
                                            previewingId === dataset.id
                                                ? "text-blue-500 opacity-100"
                                                : "text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                                        )}
                                        title="Xem trước dữ liệu"
                                    >
                                        <Eye className="h-3 w-3" />
                                    </button>
                                </div>

                                {/* Preview (inline) */}
                                {previewingId === dataset.id && (
                                    <div className="px-2 pb-2">
                                        {isPreviewLoading ? (
                                            <div className="flex items-center justify-center py-3 text-[10px] text-gray-400">
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Đang tải...
                                            </div>
                                        ) : previewData && previewData.rows.length > 0 ? (
                                            <div className="overflow-auto max-h-[150px] border border-gray-200 dark:border-gray-700 rounded text-[9px]">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                                        <tr>
                                                            {previewData.columns.map(c => (
                                                                <th key={c.name} className="px-1.5 py-0.5 text-left text-gray-500 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                                                                    {c.name}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {previewData.rows.slice(0, 5).map((row, i) => (
                                                            <tr key={i}>
                                                                {previewData.columns.map(c => (
                                                                    <td key={c.name} className="px-1.5 py-0.5 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap max-w-[80px] truncate">
                                                                        {row[c.name] != null ? String(row[c.name]) : <span className="text-gray-300">-</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="px-1.5 py-0.5 text-[8px] text-gray-400 bg-gray-50 dark:bg-gray-800">
                                                    {previewData.totalRows} dòng
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-2 text-[10px] text-gray-400">Không có dữ liệu</div>
                                        )}
                                    </div>
                                )}

                                {/* Dataset info + draggable columns */}
                                {isExpanded && (
                                    <div className="ml-3 pb-1">
                                        {/* Meta info */}
                                        <div className="flex items-center gap-2 text-[8px] text-gray-400 px-3 mb-0.5">
                                            {dataset.rowCount !== undefined && (
                                                <span>{dataset.rowCount.toLocaleString()} dòng</span>
                                            )}
                                            <span>{dataset.columns.length} cột</span>
                                        </div>

                                        {/* Draggable fields */}
                                        {dataset.columns.length > 0 ? (
                                            dataset.columns.map((col) => (
                                                <DraggableField
                                                    key={`${dataset.id}-${col.name}`}
                                                    field={col}
                                                    datasetId={dataset.id}
                                                    datasetTable={dataset.table || dataset.name}
                                                />
                                            ))
                                        ) : (
                                            <div className="px-3 py-1 text-[9px] text-gray-400 italic">
                                                Chưa có cột. Bấm 👁 để tải.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer: link to data management */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
                <a
                    href="/data-sources"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <ExternalLink className="h-3 w-3" />
                    Quản lý bộ dữ liệu
                </a>
            </div>
        </div>
    );
}
