"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AngularGaugeProps {
    /** Giá trị hiển thị (0-100 hoặc cao hơn) */
    value: number;
    /** Màu của gauge */
    color?: string;
    /** Kích thước (width) */
    size?: number;
    /** Hiển thị giá trị % */
    showValue?: boolean;
    /** Hiển thị label */
    label?: string;
    /** Custom className */
    className?: string;
    /** Background color */
    bgColor?: string;
    /** Stroke width */
    strokeWidth?: number;
}

/**
 * AngularGauge - Đồng hồ bán nguyệt với style góc cạnh
 * Dựa trên design từ example.tsx
 */
export function AngularGauge({
    value,
    color = "#3b82f6",
    size = 120,
    showValue = true,
    label,
    className,
    bgColor = "#f1f5f9",
    strokeWidth = 12,
}: AngularGaugeProps) {
    // Giới hạn giá trị hiển thị từ 0-100 trên đồng hồ
    const percent = Math.min(Math.max(value, 0), 100);
    const radius = size / 2;
    const normalizedRadius = radius - strokeWidth;
    const circumference = normalizedRadius * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    // Tính toán góc cho kim chỉ (Needle)
    // 0% = -180deg (left), 100% = 0deg (right)
    const rotation = -180 + (percent / 100) * 180;

    // Needle length
    const needleLength = normalizedRadius - 15;

    return (
        <div
            className={cn("relative flex flex-col items-center justify-end", className)}
            style={{ width: size, height: size / 1.8 }}
        >
            <svg
                height={size / 2}
                width={size}
                viewBox={`0 0 ${size} ${size / 2}`}
                className="overflow-visible"
            >
                {/* Background Arc */}
                <path
                    d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
                    fill="none"
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                />

                {/* Progress Arc */}
                <path
                    d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="butt"
                    className="transition-all duration-1000 ease-out"
                />

                {/* Needle Group */}
                <g transform={`translate(${radius}, ${radius}) rotate(${rotation})`}>
                    {/* Needle Triangle */}
                    <polygon
                        points={`-3,0 0,-${needleLength} 3,0`}
                        fill="#1e293b"
                    />
                    {/* Center Circle */}
                    <circle cx="0" cy="0" r="5" fill="#1e293b" />
                </g>

                {/* Min/Max Labels */}
                <text
                    x={strokeWidth + 5}
                    y={radius + 15}
                    fontSize="9"
                    fill="#94a3b8"
                    textAnchor="start"
                >
                    0
                </text>
                <text
                    x={size - strokeWidth - 5}
                    y={radius + 15}
                    fontSize="9"
                    fill="#94a3b8"
                    textAnchor="end"
                >
                    100
                </text>
            </svg>

            {/* Value Text Overlay */}
            {showValue && (
                <div className="absolute bottom-0 text-center">
                    <span
                        className="text-2xl font-black tracking-tighter"
                        style={{ color }}
                    >
                        {value.toFixed(1)}%
                    </span>
                    {label && (
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">
                            {label}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Các preset màu cho AngularGauge
 */
export const GAUGE_COLORS = {
    success: "#10b981",   // Emerald - Đạt KH
    warning: "#f59e0b",   // Amber - Cần cải thiện
    danger: "#ef4444",    // Red - Chưa đạt
    primary: "#3b82f6",   // Blue - Mặc định
    purple: "#8b5cf6",    // Purple
};

/**
 * Hàm helper để chọn màu dựa trên giá trị
 */
export const getGaugeColor = (value: number, threshold = 100) => {
    if (value >= threshold) return GAUGE_COLORS.success;
    if (value >= threshold * 0.8) return GAUGE_COLORS.warning;
    return GAUGE_COLORS.danger;
};

export default AngularGauge;
