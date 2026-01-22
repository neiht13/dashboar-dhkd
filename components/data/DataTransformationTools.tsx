"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Wand2, 
    Replace, 
    Calculator, 
    Calendar, 
    Type, 
    Filter,
    ArrowRightLeft,
    Trash2,
    Plus,
    Play,
    Eye,
    Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Transformation types
export type TransformationType = 
    | 'rename'
    | 'calculate'
    | 'replace'
    | 'format_date'
    | 'format_number'
    | 'filter'
    | 'type_convert'
    | 'trim'
    | 'uppercase'
    | 'lowercase'
    | 'split'
    | 'merge'
    | 'fill_null'
    | 'remove_duplicates';

export interface Transformation {
    id: string;
    type: TransformationType;
    config: Record<string, unknown>;
    enabled: boolean;
}

interface DataTransformationToolsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: string[];
    sampleData: Record<string, unknown>[];
    onApply: (transformations: Transformation[]) => void;
}

const TRANSFORMATION_CONFIG: Record<TransformationType, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}> = {
    rename: { label: 'Đổi tên cột', icon: Type, description: 'Đổi tên một hoặc nhiều cột' },
    calculate: { label: 'Tính toán', icon: Calculator, description: 'Tạo cột mới từ công thức' },
    replace: { label: 'Thay thế', icon: Replace, description: 'Thay thế giá trị trong cột' },
    format_date: { label: 'Định dạng ngày', icon: Calendar, description: 'Chuyển đổi định dạng ngày tháng' },
    format_number: { label: 'Định dạng số', icon: Calculator, description: 'Chuyển đổi định dạng số' },
    filter: { label: 'Lọc dữ liệu', icon: Filter, description: 'Lọc các dòng theo điều kiện' },
    type_convert: { label: 'Chuyển kiểu', icon: ArrowRightLeft, description: 'Chuyển đổi kiểu dữ liệu' },
    trim: { label: 'Cắt khoảng trắng', icon: Type, description: 'Loại bỏ khoảng trắng thừa' },
    uppercase: { label: 'Viết hoa', icon: Type, description: 'Chuyển thành chữ hoa' },
    lowercase: { label: 'Viết thường', icon: Type, description: 'Chuyển thành chữ thường' },
    split: { label: 'Tách cột', icon: ArrowRightLeft, description: 'Tách một cột thành nhiều cột' },
    merge: { label: 'Ghép cột', icon: ArrowRightLeft, description: 'Ghép nhiều cột thành một' },
    fill_null: { label: 'Điền giá trị null', icon: Wand2, description: 'Thay thế giá trị null/rỗng' },
    remove_duplicates: { label: 'Xóa trùng lặp', icon: Trash2, description: 'Loại bỏ các dòng trùng lặp' },
};

export function DataTransformationTools({
    open,
    onOpenChange,
    columns,
    sampleData,
    onApply,
}: DataTransformationToolsProps) {
    const [transformations, setTransformations] = useState<Transformation[]>([]);
    const [selectedType, setSelectedType] = useState<TransformationType>('rename');
    const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);

    // Current transformation config state
    const [currentConfig, setCurrentConfig] = useState<Record<string, unknown>>({});

    const addTransformation = () => {
        const newTransformation: Transformation = {
            id: `t_${Date.now()}`,
            type: selectedType,
            config: { ...currentConfig },
            enabled: true,
        };

        setTransformations((prev) => [...prev, newTransformation]);
        setCurrentConfig({});
    };

    const removeTransformation = (id: string) => {
        setTransformations((prev) => prev.filter((t) => t.id !== id));
    };

    const toggleTransformation = (id: string) => {
        setTransformations((prev) =>
            prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
        );
    };

    const applyTransformations = useCallback((data: Record<string, unknown>[]) => {
        let result = [...data];

        for (const t of transformations.filter((t) => t.enabled)) {
            switch (t.type) {
                case 'rename':
                    const { oldName, newName } = t.config as { oldName: string; newName: string };
                    result = result.map((row) => {
                        const { [oldName]: value, ...rest } = row;
                        return { ...rest, [newName]: value };
                    });
                    break;

                case 'uppercase':
                    const { column: upCol } = t.config as { column: string };
                    result = result.map((row) => ({
                        ...row,
                        [upCol]: typeof row[upCol] === 'string' ? (row[upCol] as string).toUpperCase() : row[upCol],
                    }));
                    break;

                case 'lowercase':
                    const { column: lowCol } = t.config as { column: string };
                    result = result.map((row) => ({
                        ...row,
                        [lowCol]: typeof row[lowCol] === 'string' ? (row[lowCol] as string).toLowerCase() : row[lowCol],
                    }));
                    break;

                case 'trim':
                    const { column: trimCol } = t.config as { column: string };
                    result = result.map((row) => ({
                        ...row,
                        [trimCol]: typeof row[trimCol] === 'string' ? (row[trimCol] as string).trim() : row[trimCol],
                    }));
                    break;

                case 'replace':
                    const { column: replaceCol, find, replaceWith } = t.config as { 
                        column: string; 
                        find: string; 
                        replaceWith: string 
                    };
                    result = result.map((row) => ({
                        ...row,
                        [replaceCol]: typeof row[replaceCol] === 'string' 
                            ? (row[replaceCol] as string).replaceAll(find, replaceWith) 
                            : row[replaceCol],
                    }));
                    break;

                case 'fill_null':
                    const { column: fillCol, fillValue } = t.config as { column: string; fillValue: unknown };
                    result = result.map((row) => ({
                        ...row,
                        [fillCol]: row[fillCol] == null || row[fillCol] === '' ? fillValue : row[fillCol],
                    }));
                    break;

                case 'filter':
                    const { column: filterCol, operator, value: filterValue } = t.config as {
                        column: string;
                        operator: string;
                        value: unknown;
                    };
                    result = result.filter((row) => {
                        const rowValue = row[filterCol];
                        switch (operator) {
                            case 'eq': return rowValue === filterValue;
                            case 'neq': return rowValue !== filterValue;
                            case 'gt': return Number(rowValue) > Number(filterValue);
                            case 'lt': return Number(rowValue) < Number(filterValue);
                            case 'contains': return String(rowValue).includes(String(filterValue));
                            default: return true;
                        }
                    });
                    break;

                case 'calculate':
                    const { newColumn, formula } = t.config as { newColumn: string; formula: string };
                    result = result.map((row) => {
                        try {
                            // Simple formula evaluation (for demo purposes)
                            // In production, use a proper expression parser
                            let evalFormula = formula;
                            for (const col of columns) {
                                evalFormula = evalFormula.replaceAll(`[${col}]`, String(row[col] ?? 0));
                            }
                            const value = eval(evalFormula); // eslint-disable-line
                            return { ...row, [newColumn]: value };
                        } catch {
                            return { ...row, [newColumn]: null };
                        }
                    });
                    break;

                case 'remove_duplicates':
                    const { columns: dedupCols } = t.config as { columns: string[] };
                    const seen = new Set();
                    result = result.filter((row) => {
                        const key = dedupCols.map((c) => row[c]).join('|');
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    break;
            }
        }

        return result;
    }, [transformations, columns]);

    const handlePreview = () => {
        const result = applyTransformations(sampleData);
        setPreviewData(result);
    };

    const handleApply = () => {
        onApply(transformations);
        onOpenChange(false);
    };

    const renderConfigForm = () => {
        switch (selectedType) {
            case 'rename':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cột cần đổi tên</Label>
                            <Select
                                value={currentConfig.oldName as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, oldName: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tên mới</Label>
                            <Input
                                value={currentConfig.newName as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, newName: e.target.value })}
                                placeholder="Nhập tên mới"
                            />
                        </div>
                    </div>
                );

            case 'replace':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cột</Label>
                            <Select
                                value={currentConfig.column as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, column: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tìm</Label>
                            <Input
                                value={currentConfig.find as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, find: e.target.value })}
                                placeholder="Giá trị cần tìm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Thay thế bằng</Label>
                            <Input
                                value={currentConfig.replaceWith as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, replaceWith: e.target.value })}
                                placeholder="Giá trị thay thế"
                            />
                        </div>
                    </div>
                );

            case 'calculate':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tên cột mới</Label>
                            <Input
                                value={currentConfig.newColumn as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, newColumn: e.target.value })}
                                placeholder="Nhập tên cột"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Công thức</Label>
                            <Textarea
                                value={currentConfig.formula as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, formula: e.target.value })}
                                placeholder="VD: [cột1] + [cột2] * 2"
                            />
                            <p className="text-xs text-muted-foreground">
                                Sử dụng [tên_cột] để tham chiếu giá trị cột
                            </p>
                        </div>
                    </div>
                );

            case 'filter':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cột</Label>
                            <Select
                                value={currentConfig.column as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, column: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Điều kiện</Label>
                            <Select
                                value={currentConfig.operator as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, operator: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn điều kiện" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="eq">Bằng</SelectItem>
                                    <SelectItem value="neq">Khác</SelectItem>
                                    <SelectItem value="gt">Lớn hơn</SelectItem>
                                    <SelectItem value="lt">Nhỏ hơn</SelectItem>
                                    <SelectItem value="contains">Chứa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Giá trị</Label>
                            <Input
                                value={currentConfig.value as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, value: e.target.value })}
                                placeholder="Nhập giá trị"
                            />
                        </div>
                    </div>
                );

            case 'fill_null':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cột</Label>
                            <Select
                                value={currentConfig.column as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, column: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Giá trị thay thế</Label>
                            <Input
                                value={currentConfig.fillValue as string || ''}
                                onChange={(e) => setCurrentConfig({ ...currentConfig, fillValue: e.target.value })}
                                placeholder="Nhập giá trị"
                            />
                        </div>
                    </div>
                );

            case 'uppercase':
            case 'lowercase':
            case 'trim':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cột</Label>
                            <Select
                                value={currentConfig.column as string}
                                onValueChange={(v) => setCurrentConfig({ ...currentConfig, column: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            default:
                return <p className="text-sm text-muted-foreground">Chọn loại biến đổi để cấu hình</p>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Công cụ Biến đổi Dữ liệu
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="transform" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="transform">Biến đổi</TabsTrigger>
                        <TabsTrigger value="pipeline">Pipeline ({transformations.length})</TabsTrigger>
                        <TabsTrigger value="preview">Xem trước</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transform" className="flex-1 overflow-auto">
                        <div className="grid grid-cols-2 gap-4 py-4">
                            {/* Transformation Types */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Chọn loại biến đổi</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[300px]">
                                        <div className="space-y-1">
                                            {Object.entries(TRANSFORMATION_CONFIG).map(([type, config]) => (
                                                <div
                                                    key={type}
                                                    className={cn(
                                                        'p-2 rounded-lg cursor-pointer transition-colors',
                                                        'hover:bg-muted',
                                                        selectedType === type && 'bg-muted ring-2 ring-primary'
                                                    )}
                                                    onClick={() => {
                                                        setSelectedType(type as TransformationType);
                                                        setCurrentConfig({});
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <config.icon className="h-4 w-4" />
                                                        <span className="font-medium text-sm">{config.label}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {config.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Configuration Form */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center justify-between">
                                        <span>Cấu hình: {TRANSFORMATION_CONFIG[selectedType]?.label}</span>
                                        <Button size="sm" onClick={addTransformation}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Thêm
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {renderConfigForm()}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="pipeline" className="flex-1 overflow-auto">
                        <div className="py-4">
                            {transformations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    Chưa có biến đổi nào được thêm
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transformations.map((t, index) => (
                                        <div
                                            key={t.id}
                                            className={cn(
                                                'flex items-center gap-2 p-3 border rounded-lg',
                                                !t.enabled && 'opacity-50'
                                            )}
                                        >
                                            <span className="text-sm text-muted-foreground w-6">
                                                {index + 1}.
                                            </span>
                                            <Badge variant="secondary">
                                                {TRANSFORMATION_CONFIG[t.type]?.label}
                                            </Badge>
                                            <span className="text-sm flex-1 truncate">
                                                {JSON.stringify(t.config)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleTransformation(t.id)}
                                            >
                                                {t.enabled ? 'Tắt' : 'Bật'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => removeTransformation(t.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 overflow-auto">
                        <div className="py-4">
                            <div className="flex justify-between mb-4">
                                <Button variant="outline" onClick={handlePreview}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Chạy xem trước
                                </Button>
                            </div>

                            {previewData ? (
                                <div className="border rounded-lg overflow-auto max-h-[300px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr>
                                                {Object.keys(previewData[0] || {}).map((key) => (
                                                    <th key={key} className="px-3 py-2 text-left font-medium">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="border-t">
                                                    {Object.values(row).map((val, j) => (
                                                        <td key={j} className="px-3 py-2">
                                                            {String(val ?? '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    Nhấn "Chạy xem trước" để xem kết quả
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleApply} disabled={transformations.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Áp dụng ({transformations.filter((t) => t.enabled).length} biến đổi)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
