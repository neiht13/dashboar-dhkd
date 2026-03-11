"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldWellProps {
    id: string;
    label: string;
    fields: string[];
    onRemoveField: (field: string) => void;
    onReorderFields?: (fields: string[]) => void;
    maxFields?: number;
    accepts?: "numeric" | "text" | "any";
    icon?: React.ReactNode;
}

export function FieldWell({
    id,
    label,
    fields,
    onRemoveField,
    maxFields,
    icon,
}: FieldWellProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: `field-well-${id}`,
        data: { wellId: id, accepts: "any" },
    });

    const canAddMore = maxFields === undefined || fields.length < maxFields;

    return (
        <div className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                    {label}
                </span>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "min-h-[32px] rounded border transition-all",
                    isOver && canAddMore
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800",
                )}
            >
                {fields.length > 0 ? (
                    <div className="flex flex-col gap-0.5 p-1">
                        {fields.map((field) => (
                            <div
                                key={field}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded text-[11px] group"
                            >
                                <GripVertical className="h-3 w-3 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 cursor-grab" />
                                <span className="flex-1 truncate text-gray-700 dark:text-gray-200 font-medium">
                                    {field}
                                </span>
                                <button
                                    onClick={() => onRemoveField(field)}
                                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[30px] text-[10px] text-gray-400 dark:text-gray-500 italic">
                        Thêm trường dữ liệu vào đây
                    </div>
                )}
            </div>
        </div>
    );
}
