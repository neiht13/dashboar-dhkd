"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Filter, Settings } from "lucide-react";
import { Filter as FilterType } from "@/types";

interface FilterBuilderProps {
    data: any[];
    availableFields: string[];
    filters: FilterType[];
    onChange: (filters: FilterType[]) => void;
    onApplyFilters: () => void;
    className?: string;
}

export function FilterBuilder({
    data,
    availableFields,
    filters,
    onChange,
    onApplyFilters,
    className = ""
}: FilterBuilderProps) {
    const handleFieldSelect = (field: string) => {
        // Tạo filter đơn giản chỉ với field được chọn
        const newFilter: FilterType = {
            field: field,
            operator: "=",
            value: ""
        };
        onChange([newFilter]);
        onApplyFilters();
    };

    return (
        <Card className={`w-64 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Lọc theo trường
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-2">
                    <Label className="text-xs font-medium">Chọn trường để lọc:</Label>
                    <Select onValueChange={handleFieldSelect}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Chọn trường..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFields.map(field => (
                                <SelectItem key={field} value={field}>
                                    {field}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {filters.length > 0 && (
                    <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                            Đang lọc theo: <span className="font-medium text-foreground">{filters[0].field}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}