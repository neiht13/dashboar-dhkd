"use client";

import React, { useState, useEffect } from 'react';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Filter,
    X,
    CalendarIcon,
    ChevronDown,
    Save,
    Trash2,
    RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DashboardFilter {
    id: string;
    field: string;
    label: string;
    type: 'dropdown' | 'multiselect' | 'date-range' | 'text' | 'number-range';
    options?: string[];  // For dropdown/multiselect
    defaultValue?: unknown;
}

export interface FilterValue {
    filterId: string;
    value: unknown;
}

export interface FilterPreset {
    id: string;
    name: string;
    values: FilterValue[];
}

interface FilterPanelProps {
    filters: DashboardFilter[];
    values: Record<string, unknown>;
    presets?: FilterPreset[];
    onChange: (filterId: string, value: unknown) => void;
    onClearAll: () => void;
    onSavePreset?: (name: string) => void;
    onLoadPreset?: (preset: FilterPreset) => void;
    onDeletePreset?: (presetId: string) => void;
    className?: string;
}

export function FilterPanel({
    filters,
    values,
    presets = [],
    onChange,
    onClearAll,
    onSavePreset,
    onLoadPreset,
    onDeletePreset,
    className,
}: FilterPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [presetName, setPresetName] = useState('');
    const [showSavePreset, setShowSavePreset] = useState(false);

    const activeFiltersCount = Object.values(values).filter(v =>
        v !== undefined && v !== null && v !== '' &&
        !(Array.isArray(v) && v.length === 0)
    ).length;

    const handleSavePreset = () => {
        if (presetName.trim() && onSavePreset) {
            onSavePreset(presetName.trim());
            setPresetName('');
            setShowSavePreset(false);
        }
    };

    return (
        <div className={cn(
            "bg-card border rounded-lg shadow-sm",
            className
        )}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Bộ lọc</span>
                    {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {activeFiltersCount}
                        </Badge>
                    )}
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                )} />
            </div>

            {/* Filter Content */}
            {isExpanded && (
                <div className="border-t p-3 space-y-4">
                    {/* Presets */}
                    {presets.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">Preset:</span>
                            {presets.map(preset => (
                                <Badge
                                    key={preset.id}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-muted gap-1"
                                    onClick={() => onLoadPreset?.(preset)}
                                >
                                    {preset.name}
                                    <X
                                        className="h-3 w-3 ml-1 hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePreset?.(preset.id);
                                        }}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Filter Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filters.map(filter => (
                            <FilterField
                                key={filter.id}
                                filter={filter}
                                value={values[filter.id]}
                                onChange={(value) => onChange(filter.id, value)}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearAll}
                                className="text-muted-foreground"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Xóa tất cả
                            </Button>
                        </div>

                        {onSavePreset && (
                            <div className="flex items-center gap-2">
                                {showSavePreset ? (
                                    <>
                                        <Input
                                            placeholder="Tên preset..."
                                            value={presetName}
                                            onChange={(e) => setPresetName(e.target.value)}
                                            className="h-8 w-32"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                                        />
                                        <Button size="sm" variant="secondary" onClick={handleSavePreset}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowSavePreset(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowSavePreset(true)}
                                    >
                                        <Save className="h-4 w-4 mr-1" />
                                        Lưu preset
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface FilterFieldProps {
    filter: DashboardFilter;
    value: unknown;
    onChange: (value: unknown) => void;
}

function FilterField({ filter, value, onChange }: FilterFieldProps) {
    switch (filter.type) {
        case 'dropdown':
            return (
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <Select
                        value={value as string || ''}
                        onValueChange={onChange}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Chọn..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả</SelectItem>
                            {filter.options?.map(option => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );

        case 'multiselect':
            return (
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full h-9 justify-between font-normal"
                            >
                                {Array.isArray(value) && value.length > 0
                                    ? `${value.length} đã chọn`
                                    : 'Chọn...'}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <ScrollArea className="h-48">
                                <div className="p-2 space-y-1">
                                    {filter.options?.map(option => (
                                        <div
                                            key={option}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                            onClick={() => {
                                                const current = (value as string[]) || [];
                                                const newValue = current.includes(option)
                                                    ? current.filter(v => v !== option)
                                                    : [...current, option];
                                                onChange(newValue);
                                            }}
                                        >
                                            <Checkbox
                                                checked={Array.isArray(value) && value.includes(option)}
                                            />
                                            <span className="text-sm">{option}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>
            );

        case 'date-range':
            const dateValue = value as { from?: Date; to?: Date } | undefined;
            return (
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-9 justify-start font-normal",
                                    !dateValue?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateValue?.from ? (
                                    dateValue.to ? (
                                        <>
                                            {format(dateValue.from, "dd/MM", { locale: vi })} -{" "}
                                            {format(dateValue.to, "dd/MM", { locale: vi })}
                                        </>
                                    ) : (
                                        format(dateValue.from, "dd/MM/yyyy", { locale: vi })
                                    )
                                ) : (
                                    "Chọn ngày..."
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={dateValue}
                                onSelect={(range) => onChange(range)}
                                numberOfMonths={2}
                                locale={vi}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            );

        case 'text':
            return (
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <Input
                        placeholder={`Nhập ${filter.label.toLowerCase()}...`}
                        value={value as string || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9"
                    />
                </div>
            );

        case 'number-range':
            const numRange = value as { min?: number; max?: number } | undefined;
            return (
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Từ"
                            value={numRange?.min ?? ''}
                            onChange={(e) => onChange({
                                ...numRange,
                                min: e.target.value ? Number(e.target.value) : undefined,
                            })}
                            className="h-9"
                        />
                        <Input
                            type="number"
                            placeholder="Đến"
                            value={numRange?.max ?? ''}
                            onChange={(e) => onChange({
                                ...numRange,
                                max: e.target.value ? Number(e.target.value) : undefined,
                            })}
                            className="h-9"
                        />
                    </div>
                </div>
            );

        default:
            return null;
    }
}

export default FilterPanel;
