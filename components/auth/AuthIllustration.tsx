"use client";

import React from "react";

/**
 * Modern Analytics Dashboard Illustration
 * SVG illustration representing data visualization and analytics
 */
export function AuthIllustration() {
    return (
        <div className="relative w-full h-full flex items-center justify-center p-8">
            <svg
                viewBox="0 0 800 600"
                className="w-full h-full max-w-2xl"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Background gradient */}
                <defs>
                    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="chartGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="chartGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="chartGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                {/* Background */}
                <rect width="800" height="600" fill="url(#bgGradient)" rx="20" />

                {/* Dashboard Frame */}
                <rect x="50" y="50" width="700" height="500" rx="16" fill="white" opacity="0.95" />
                <rect x="50" y="50" width="700" height="500" rx="16" stroke="#E2E8F0" strokeWidth="2" />

                {/* Header Bar */}
                <rect x="70" y="70" width="660" height="60" rx="8" fill="#F8FAFC" />
                <circle cx="100" cy="100" r="12" fill="#3B82F6" />
                <rect x="120" y="90" width="120" height="8" rx="4" fill="#CBD5E1" />
                <rect x="120" y="105" width="80" height="6" rx="3" fill="#E2E8F0" />

                {/* Chart 1 - Bar Chart (Top Left) */}
                <g transform="translate(90, 160)">
                    {/* Chart Background */}
                    <rect x="0" y="0" width="300" height="180" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                    
                    {/* Bars */}
                    <rect x="30" y="140" width="35" height="30" rx="4" fill="url(#chartGradient1)" />
                    <rect x="85" y="110" width="35" height="60" rx="4" fill="url(#chartGradient1)" />
                    <rect x="140" y="90" width="35" height="80" rx="4" fill="url(#chartGradient1)" />
                    <rect x="195" y="70" width="35" height="100" rx="4" fill="url(#chartGradient1)" />
                    <rect x="250" y="100" width="35" height="70" rx="4" fill="url(#chartGradient1)" />
                    
                    {/* Chart Title */}
                    <text x="150" y="20" textAnchor="middle" fill="#1E293B" fontSize="14" fontWeight="600">
                        Revenue Analytics
                    </text>
                </g>

                {/* Chart 2 - Line Chart (Top Right) */}
                <g transform="translate(410, 160)">
                    {/* Chart Background */}
                    <rect x="0" y="0" width="300" height="180" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                    
                    {/* Grid Lines */}
                    <line x1="30" y1="30" x2="30" y2="150" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="30" y1="150" x2="270" y2="150" stroke="#E2E8F0" strokeWidth="1" />
                    
                    {/* Line Path */}
                    <path
                        d="M 50 120 Q 100 100, 150 80 T 250 60"
                        stroke="#60A5FA"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 50 120 Q 100 100, 150 80 T 250 60 L 250 150 L 50 150 Z"
                        fill="url(#chartGradient2)"
                        opacity="0.3"
                    />
                    
                    {/* Data Points */}
                    <circle cx="50" cy="120" r="4" fill="#60A5FA" />
                    <circle cx="100" cy="100" r="4" fill="#60A5FA" />
                    <circle cx="150" cy="80" r="4" fill="#60A5FA" />
                    <circle cx="200" cy="70" r="4" fill="#60A5FA" />
                    <circle cx="250" cy="60" r="4" fill="#60A5FA" />
                    
                    {/* Chart Title */}
                    <text x="150" y="20" textAnchor="middle" fill="#1E293B" fontSize="14" fontWeight="600">
                        Growth Trends
                    </text>
                </g>

                {/* Chart 3 - Pie Chart (Bottom Left) */}
                <g transform="translate(90, 360)">
                    {/* Chart Background */}
                    <rect x="0" y="0" width="300" height="160" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                    
                    {/* Pie Slices - Perfect Circle with 5 slices */}
                    {/* Center: (150, 80), Radius: 50 */}
                    {/* Slice 1: 25% = 90° (270° to 0°) - Blue Primary */}
                    <path
                        d="M 150 80 L 150 30 A 50 50 0 0 1 200 80 Z"
                        fill="#3B82F6"
                        opacity="0.9"
                    />
                    {/* Slice 2: 20% = 72° (0° to 72°) - Light Blue */}
                    <path
                        d="M 150 80 L 200 80 A 50 50 0 0 1 165.45 32.45 Z"
                        fill="#60A5FA"
                        opacity="0.9"
                    />
                    {/* Slice 3: 20% = 72° (72° to 144°) - Medium Blue */}
                    <path
                        d="M 150 80 L 165.45 32.45 A 50 50 0 0 1 109.55 50.61 Z"
                        fill="#2563EB"
                        opacity="0.9"
                    />
                    {/* Slice 4: 20% = 72° (144° to 216°) - Dark Blue */}
                    <path
                        d="M 150 80 L 109.55 50.61 A 50 50 0 0 1 109.55 109.39 Z"
                        fill="#1E40AF"
                        opacity="0.9"
                    />
                    {/* Slice 5: 15% = 54° (216° to 270°) - Cyan Blue */}
                    <path
                        d="M 150 80 L 109.55 109.39 A 50 50 0 0 1 150 30 Z"
                        fill="#06B6D4"
                        opacity="0.9"
                    />
                    
                    {/* Center Circle */}
                    <circle cx="150" cy="80" r="25" fill="white" />
                    
                    {/* Legend */}
                    <g transform="translate(220, 40)">
                        <rect x="0" y="0" width="12" height="12" rx="2" fill="#3B82F6" />
                        <text x="18" y="10" fill="#64748B" fontSize="11">Category A</text>
                        
                        <rect x="0" y="25" width="12" height="12" rx="2" fill="#60A5FA" />
                        <text x="18" y="35" fill="#64748B" fontSize="11">Category B</text>
                        
                        <rect x="0" y="50" width="12" height="12" rx="2" fill="#2563EB" />
                        <text x="18" y="60" fill="#64748B" fontSize="11">Category C</text>
                    </g>
                    
                    {/* Chart Title */}
                    <text x="150" y="20" textAnchor="middle" fill="#1E293B" fontSize="14" fontWeight="600">
                        Distribution
                    </text>
                </g>

                {/* Stats Cards (Bottom Right) */}
                <g transform="translate(410, 360)">
                    {/* Card 1 */}
                    <rect x="0" y="0" width="140" height="75" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                    <circle cx="20" cy="20" r="8" fill="#3B82F6" opacity="0.2" />
                    <circle cx="20" cy="20" r="4" fill="#3B82F6" />
                    <text x="35" y="18" fill="#64748B" fontSize="10">Total Users</text>
                    <text x="35" y="35" fill="#1E293B" fontSize="20" fontWeight="700">12.5K</text>
                    <text x="35" y="50" fill="#10B981" fontSize="9">+12.5%</text>
                    
                    {/* Card 2 */}
                    <rect x="160" y="0" width="140" height="75" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                    <circle cx="180" cy="20" r="8" fill="#60A5FA" opacity="0.2" />
                    <circle cx="180" cy="20" r="4" fill="#60A5FA" />
                    <text x="195" y="18" fill="#64748B" fontSize="10">Revenue</text>
                    <text x="195" y="35" fill="#1E293B" fontSize="20" fontWeight="700">$45.2K</text>
                    <text x="195" y="50" fill="#10B981" fontSize="9">+8.2%</text>
                    
                    {/* Card 3 */}
                    <rect x="0" y="85" width="140" height="75" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                    <circle cx="20" cy="105" r="8" fill="#2563EB" opacity="0.2" />
                    <circle cx="20" cy="105" r="4" fill="#2563EB" />
                    <text x="35" y="103" fill="#64748B" fontSize="10">Active</text>
                    <text x="35" y="120" fill="#1E293B" fontSize="20" fontWeight="700">1,234</text>
                    <text x="35" y="135" fill="#10B981" fontSize="9">+5.1%</text>
                    
                    {/* Card 4 */}
                    <rect x="160" y="85" width="140" height="75" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                    <circle cx="180" cy="105" r="8" fill="#1E40AF" opacity="0.2" />
                    <circle cx="180" cy="105" r="4" fill="#1E40AF" />
                    <text x="195" y="103" fill="#64748B" fontSize="10">Growth</text>
                    <text x="195" y="120" fill="#1E293B" fontSize="20" fontWeight="700">24.8%</text>
                    <text x="195" y="135" fill="#10B981" fontSize="9">+2.3%</text>
                </g>

                {/* Floating Elements - Data Points */}
                <circle cx="200" cy="100" r="3" fill="#3B82F6" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="600" cy="150" r="4" fill="#60A5FA" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="650" cy="400" r="3" fill="#2563EB" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
            </svg>
        </div>
    );
}
