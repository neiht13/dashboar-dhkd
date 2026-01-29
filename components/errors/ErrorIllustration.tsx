"use client";

import React from "react";

interface ErrorIllustrationProps {
    type: "401" | "403" | "404" | "500";
}

export function ErrorIllustration({ type }: ErrorIllustrationProps) {
    if (type === "401") {
        return (
            <svg
                viewBox="0 0 600 400"
                className="w-full h-full max-w-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="grad401" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                <rect width="600" height="400" fill="url(#grad401)" rx="20" />
                
                {/* Lock Icon */}
                <g transform="translate(200, 100)">
                    <rect x="50" y="80" width="100" height="120" rx="8" fill="#3B82F6" opacity="0.2" />
                    <rect x="60" y="90" width="80" height="100" rx="6" fill="white" />
                    <path
                        d="M 70 90 L 70 60 A 20 20 0 0 1 110 60 L 110 90"
                        stroke="#3B82F6"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <circle cx="90" cy="140" r="8" fill="#3B82F6" />
                </g>
                
                {/* Key Icon */}
                <g transform="translate(350, 150)">
                    <circle cx="30" cy="30" r="20" fill="#60A5FA" opacity="0.3" />
                    <rect x="40" y="25" width="40" height="10" rx="5" fill="#60A5FA" />
                    <rect x="70" y="20" width="8" height="20" rx="4" fill="#60A5FA" />
                </g>
                
                {/* Text */}
                <text x="300" y="280" textAnchor="middle" fill="#1E293B" fontSize="24" fontWeight="700">
                    Yêu cầu đăng nhập
                </text>
                <text x="300" y="310" textAnchor="middle" fill="#64748B" fontSize="14">
                    Vui lòng đăng nhập để truy cập
                </text>
            </svg>
        );
    }

    if (type === "403") {
        return (
            <svg
                viewBox="0 0 600 400"
                className="w-full h-full max-w-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="grad403" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#DC2626" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                <rect width="600" height="400" fill="url(#grad403)" rx="20" />
                
                {/* Shield with X */}
                <g transform="translate(200, 80)">
                    <path
                        d="M 100 50 L 100 50 A 50 50 0 0 1 150 80 L 150 150 A 50 50 0 0 1 100 180 L 50 150 L 50 80 A 50 50 0 0 1 100 50 Z"
                        fill="#EF4444"
                        opacity="0.2"
                    />
                    <path
                        d="M 100 50 L 100 50 A 50 50 0 0 1 150 80 L 150 150 A 50 50 0 0 1 100 180 L 50 150 L 50 80 A 50 50 0 0 1 100 50 Z"
                        stroke="#EF4444"
                        strokeWidth="4"
                        fill="none"
                    />
                    <line x1="80" y1="100" x2="120" y2="140" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
                    <line x1="120" y1="100" x2="80" y2="140" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
                </g>
                
                {/* Lock Icon */}
                <g transform="translate(350, 120)">
                    <rect x="20" y="40" width="60" height="80" rx="6" fill="#EF4444" opacity="0.2" />
                    <rect x="30" y="50" width="40" height="60" rx="4" fill="white" />
                    <path
                        d="M 40 50 L 40 30 A 10 10 0 0 1 60 30 L 60 50"
                        stroke="#EF4444"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <circle cx="50" cy="80" r="4" fill="#EF4444" />
                </g>
                
                {/* Text */}
                <text x="300" y="280" textAnchor="middle" fill="#1E293B" fontSize="24" fontWeight="700">
                    Không có quyền truy cập
                </text>
                <text x="300" y="310" textAnchor="middle" fill="#64748B" fontSize="14">
                    Bạn không có quyền truy cập tài nguyên này
                </text>
            </svg>
        );
    }

    if (type === "404") {
        return (
            <svg
                viewBox="0 0 600 400"
                className="w-full h-full max-w-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="grad404" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                <rect width="600" height="400" fill="url(#grad404)" rx="20" />
                
                {/* Magnifying Glass */}
                <g transform="translate(150, 100)">
                    <circle cx="80" cy="80" r="50" stroke="#8B5CF6" strokeWidth="6" fill="none" />
                    <line x1="115" y1="115" x2="145" y2="145" stroke="#8B5CF6" strokeWidth="6" strokeLinecap="round" />
                </g>
                
                {/* Question Mark */}
                <g transform="translate(320, 120)">
                    <circle cx="40" cy="40" r="35" fill="#8B5CF6" opacity="0.2" />
                    <circle cx="40" cy="40" r="35" stroke="#8B5CF6" strokeWidth="4" fill="none" />
                    <text x="40" y="55" textAnchor="middle" fill="#8B5CF6" fontSize="40" fontWeight="700">?</text>
                </g>
                
                {/* Text */}
                <text x="300" y="280" textAnchor="middle" fill="#1E293B" fontSize="24" fontWeight="700">
                    Không tìm thấy trang
                </text>
                <text x="300" y="310" textAnchor="middle" fill="#64748B" fontSize="14">
                    Trang bạn đang tìm kiếm không tồn tại
                </text>
            </svg>
        );
    }

    // 500
    return (
        <svg
            viewBox="0 0 600 400"
            className="w-full h-full max-w-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="grad500" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.1" />
                </linearGradient>
            </defs>
            <rect width="600" height="400" fill="url(#grad500)" rx="20" />
            
            {/* Warning Triangle */}
            <g transform="translate(200, 80)">
                <path
                    d="M 100 40 L 180 200 L 20 200 Z"
                    fill="#F59E0B"
                    opacity="0.2"
                />
                <path
                    d="M 100 40 L 180 200 L 20 200 Z"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    fill="none"
                />
                <text x="100" y="150" textAnchor="middle" fill="#F59E0B" fontSize="60" fontWeight="700">!</text>
            </g>
            
            {/* Text */}
            <text x="300" y="280" textAnchor="middle" fill="#1E293B" fontSize="24" fontWeight="700">
                Lỗi máy chủ
            </text>
            <text x="300" y="310" textAnchor="middle" fill="#64748B" fontSize="14">
                Đã xảy ra lỗi, vui lòng thử lại sau
            </text>
        </svg>
    );
}
