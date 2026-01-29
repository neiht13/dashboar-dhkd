"use client";

import { useMemo } from "react";
import type { DataSource } from "@/types";

interface FilterOptions {
    /** Text để filter (tìm kiếm) */
    filterText?: string;
    /** Field để filter (mặc định là xAxis) */
    filterField?: string;
    /** Sort key */
    sortKey?: string;
    /** Sort direction */
    sortDir?: "asc" | "desc";
    /** Status filter callback */
    statusFilter?: (item: Record<string, unknown>) => boolean;
}

/**
 * Hook để xử lý filter/sort dữ liệu động
 * Dựa trên DataSource config, không hard-code trường dữ liệu
 */
export function useProcessedData<T extends Record<string, unknown>>(
    rawData: T[],
    dataSource?: DataSource,
    options: FilterOptions = {}
): T[] {
    const {
        filterText = "",
        filterField,
        sortKey,
        sortDir = "desc",
        statusFilter,
    } = options;

    return useMemo(() => {
        let data = [...rawData];

        // 1. LỌC THEO TEXT (dựa vào filterField hoặc xAxis)
        const searchField = filterField || dataSource?.xAxis;
        if (filterText && searchField) {
            const lower = filterText.toLowerCase();
            data = data.filter((d) => {
                const value = String(d[searchField] || "");
                return value.toLowerCase().includes(lower);
            });
        }

        // 2. LỌC THEO FILTERS TỪ DATASOURCE
        if (dataSource?.filters?.length) {
            dataSource.filters.forEach((filter) => {
                data = data.filter((d) => {
                    const value = d[filter.field];
                    switch (filter.operator) {
                        case "=":
                            return value === filter.value;
                        case "!=":
                            return value !== filter.value;
                        case ">":
                            return (value as number) > (filter.value as number);
                        case ">=":
                            return (value as number) >= (filter.value as number);
                        case "<":
                            return (value as number) < (filter.value as number);
                        case "<=":
                            return (value as number) <= (filter.value as number);
                        case "like":
                            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
                        case "in":
                            return Array.isArray(filter.value) && (filter.value as (string | number)[]).includes(value as string | number);
                        default:
                            return true;
                    }
                });
            });
        }

        // 3. LỌC THEO STATUS FILTER CALLBACK
        if (statusFilter) {
            data = data.filter(statusFilter);
        }

        // 4. SẮP XẾP
        const effectiveSortKey = sortKey || dataSource?.orderBy;
        const effectiveSortDir = sortDir || dataSource?.orderDirection || "desc";

        if (effectiveSortKey) {
            data.sort((a, b) => {
                let valA = a[effectiveSortKey];
                let valB = b[effectiveSortKey];

                // Handle null/undefined
                if (valA == null && valB == null) return 0;
                if (valA == null) return effectiveSortDir === "asc" ? -1 : 1;
                if (valB == null) return effectiveSortDir === "asc" ? 1 : -1;

                // Handle string sort
                if (typeof valA === "string") {
                    valA = valA.toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                // Handle Date
                if (valA instanceof Date) {
                    valA = valA.getTime();
                    valB = (valB as Date).getTime();
                }

                if (valA < valB) return effectiveSortDir === "asc" ? -1 : 1;
                if (valA > valB) return effectiveSortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        // 5. GIỚI HẠN
        if (dataSource?.limit && dataSource.limit > 0) {
            data = data.slice(0, dataSource.limit);
        }

        return data;
    }, [rawData, dataSource, filterText, filterField, sortKey, sortDir, statusFilter]);
}

/**
 * Hook để tạo sort options động từ DataSource
 */
export function useSortOptions(
    dataSource?: DataSource,
    chartStyle?: { xAxisLabel?: string; yAxisFieldLabels?: Record<string, string> },
    customOptions?: Array<{ value: string; label: string }>
): Array<{ value: string; label: string }> {
    return useMemo(() => {
        if (customOptions?.length) return customOptions;

        const opts: Array<{ value: string; label: string }> = [];

        if (dataSource?.xAxis) {
            opts.push({
                value: dataSource.xAxis,
                label: chartStyle?.xAxisLabel || dataSource.xAxis,
            });
        }

        dataSource?.yAxis?.forEach((field) => {
            opts.push({
                value: field,
                label: chartStyle?.yAxisFieldLabels?.[field] || field,
            });
        });

        // Add groupBy fields
        if (dataSource?.groupBy) {
            const groupFields = Array.isArray(dataSource.groupBy)
                ? dataSource.groupBy
                : [dataSource.groupBy];

            groupFields.forEach((field) => {
                if (!opts.find((o) => o.value === field)) {
                    opts.push({ value: field, label: field });
                }
            });
        }

        return opts;
    }, [dataSource, chartStyle, customOptions]);
}

/**
 * Hook để tính toán thống kê từ dữ liệu
 */
export function useDataStats<T extends Record<string, unknown>>(
    data: T[],
    valueField: string
): { sum: number; avg: number; min: number; max: number; count: number } {
    return useMemo(() => {
        if (!data.length) {
            return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
        }

        const values = data
            .map((d) => Number(d[valueField]) || 0)
            .filter((v) => !isNaN(v));

        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return { sum, avg, min, max, count: values.length };
    }, [data, valueField]);
}

export default useProcessedData;
