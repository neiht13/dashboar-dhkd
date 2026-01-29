import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNumber(value: number, format?: 'number' | 'currency' | 'percent'): string {
    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value);
        case 'percent':
            return new Intl.NumberFormat('vi-VN', {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }).format(value / 100);
        default:
            return new Intl.NumberFormat('vi-VN').format(value);
    }
}

export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const defaultChartColors = [
    '#2563EB', // blue tươi
    '#FF6347', // tomato
    '#F59E0B', // amber vàng
    '#10B981', // emerald xanh lá
    '#8B5CF6', // violet
    '#F43F5E', // rose đỏ
    '#06B6D4', // cyan
    '#D946EF', // fuchsia
  ];

export function getChartColor(index: number): string {
    return defaultChartColors[index % defaultChartColors.length];
}

export function calculateTrend(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'stable' } {
    if (previous === 0) return { value: 0, direction: 'stable' };
    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(change),
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
    };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
