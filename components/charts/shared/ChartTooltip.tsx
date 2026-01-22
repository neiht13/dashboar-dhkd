"use client";

import React from 'react';
import type { CustomTooltipProps } from '@/types/chart';
import { getFieldLabel } from '../utils/chart-utils';

/**
 * Dark themed tooltip for charts
 */
export function DarkTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-[#0F172A] text-white px-3 py-2 shadow-xl border-0 rounded">
            <p className="text-xs font-medium text-[#94A3B8] mb-1">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <span
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[#E2E8F0]">{getFieldLabel(entry.name)}:</span>
                    <span className="font-semibold">
                        {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * Light themed tooltip for charts
 */
export function LightTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-white text-[#0F172A] px-3 py-2 shadow-lg border border-[#E2E8F0] rounded-md">
            <p className="text-xs font-medium text-[#64748B] mb-1">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <span
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[#64748B]">{getFieldLabel(entry.name)}:</span>
                    <span className="font-semibold text-[#0F172A]">
                        {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * Get tooltip component based on theme
 */
export function getTooltipComponent(theme: 'light' | 'dark' = 'light') {
    return theme === 'dark' ? DarkTooltip : LightTooltip;
}
