"use client";

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Maximize2,
    Minimize2,
    Download,
    Table,
    BarChart3,
    ZoomIn,
    ZoomOut,
    RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DynamicChart from '@/components/charts/DynamicChart';
import type { ChartConfig } from '@/types';

interface ChartFullscreenModalProps {
    chart: ChartConfig;
    data: Record<string, unknown>[];
    open: boolean;
    onClose: () => void;
    connectionId?: string;
}

export function ChartFullscreenModal({
    chart,
    data,
    open,
    onClose,
    connectionId,
}: ChartFullscreenModalProps) {
    const [activeTab, setActiveTab] = useState<'chart' | 'data'>('chart');
    const [zoom, setZoom] = useState(100);

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + 25, 200));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - 25, 50));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoom(100);
    }, []);

    const handleExportPNG = useCallback(async () => {
        // TODO: Implement PNG export using html2canvas
        console.log('Export PNG');
    }, []);

    const handleExportCSV = useCallback(() => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${chart.name || 'chart'}_data.csv`;
        link.click();
    }, [data, chart.name]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">
                            {chart.name || 'Biểu đồ'}
                        </DialogTitle>

                        <div className="flex items-center gap-2">
                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1 border rounded-md p-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 50}
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-sm w-12 text-center">{zoom}%</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 200}
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleResetZoom}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Export Buttons */}
                            <Button variant="outline" size="sm" onClick={handleExportPNG}>
                                <Download className="h-4 w-4 mr-1" />
                                PNG
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                <Download className="h-4 w-4 mr-1" />
                                CSV
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'chart' | 'data')}
                    className="flex-1 flex flex-col overflow-hidden"
                >
                    <TabsList className="mx-4 mt-2 w-fit">
                        <TabsTrigger value="chart" className="gap-1">
                            <BarChart3 className="h-4 w-4" />
                            Biểu đồ
                        </TabsTrigger>
                        <TabsTrigger value="data" className="gap-1">
                            <Table className="h-4 w-4" />
                            Dữ liệu
                        </TabsTrigger>
                    </TabsList>

                    {/* Chart View */}
                    <TabsContent value="chart" className="flex-1 m-0 p-4 overflow-auto">
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <div className="w-full h-full min-h-[500px]">
                                <DynamicChart
                                    type={chart.type}
                                    data={data}
                                    config={chart}
                                    width="100%"
                                    height={600}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Data Table View */}
                    <TabsContent value="data" className="flex-1 m-0 overflow-hidden">
                        <DataTableView data={data} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

interface DataTableViewProps {
    data: Record<string, unknown>[];
}

function DataTableView({ data }: DataTableViewProps) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Không có dữ liệu
            </div>
        );
    }

    const columns = Object.keys(data[0]);

    const sortedData = sortColumn
        ? [...data].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal || '');
            const bStr = String(bVal || '');
            return sortDirection === 'asc'
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        })
        : data;

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    return (
        <div className="h-full overflow-auto">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                        {columns.map(column => (
                            <th
                                key={column}
                                className="px-4 py-2 text-left text-sm font-medium border-b cursor-pointer hover:bg-muted-foreground/10"
                                onClick={() => handleSort(column)}
                            >
                                <div className="flex items-center gap-1">
                                    {column}
                                    {sortColumn === column && (
                                        <span className="text-xs">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                            {columns.map(column => (
                                <td key={column} className="px-4 py-2 text-sm border-b">
                                    {formatCellValue(row[column])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary */}
            <div className="sticky bottom-0 bg-muted px-4 py-2 text-sm text-muted-foreground border-t">
                Tổng: {data.length} dòng | {columns.length} cột
            </div>
        </div>
    );
}

function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        return value.toLocaleString('vi-VN');
    }
    if (value instanceof Date) {
        return value.toLocaleDateString('vi-VN');
    }
    return String(value);
}

export default ChartFullscreenModal;
