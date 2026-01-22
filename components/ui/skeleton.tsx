"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Base skeleton component
 */
function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-[#E2E8F0] dark:bg-gray-700",
                className
            )}
            {...props}
        />
    );
}

/**
 * Card skeleton for dashboard cards
 */
function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm", className)}>
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                </div>
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
    );
}

/**
 * Chart skeleton
 */
function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-lg border bg-white dark:bg-gray-900 p-4", className)}>
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-8 w-[100px]" />
            </div>
            <div className="flex items-end gap-2 h-[200px]">
                {[40, 70, 55, 90, 60, 80, 45, 75, 65, 85].map((height, i) => (
                    <Skeleton 
                        key={i} 
                        className="flex-1" 
                        style={{ height: `${height}%` }} 
                    />
                ))}
            </div>
            <div className="flex justify-center gap-4 mt-4">
                <Skeleton className="h-3 w-[80px]" />
                <Skeleton className="h-3 w-[80px]" />
                <Skeleton className="h-3 w-[80px]" />
            </div>
        </div>
    );
}

/**
 * Dashboard grid skeleton
 */
function DashboardSkeleton() {
    return (
        <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-white dark:bg-gray-900 p-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-[60px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

/**
 * Table skeleton
 */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="border-b bg-[#F8FAFC] dark:bg-gray-800 p-4">
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="border-b last:border-0 p-4">
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map((j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Sidebar skeleton
 */
function SidebarSkeleton() {
    return (
        <div className="w-[260px] bg-white dark:bg-gray-900 border-r h-screen p-4">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-2 w-[50px]" />
                </div>
            </div>
            
            {/* Nav items */}
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 flex-1" />
                    </div>
                ))}
            </div>
            
            {/* Create button */}
            <div className="mt-6">
                <Skeleton className="h-12 w-full rounded-xl" />
            </div>
        </div>
    );
}

/**
 * Form skeleton
 */
function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            ))}
            <Skeleton className="h-10 w-[120px] rounded-md mt-6" />
        </div>
    );
}

/**
 * List skeleton
 */
function ListSkeleton({ items = 5 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[60%]" />
                        <Skeleton className="h-3 w-[40%]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            ))}
        </div>
    );
}

export {
    Skeleton,
    CardSkeleton,
    ChartSkeleton,
    DashboardSkeleton,
    TableSkeleton,
    SidebarSkeleton,
    FormSkeleton,
    ListSkeleton,
};
