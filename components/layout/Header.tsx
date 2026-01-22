"use client";

import React, { useState } from "react";
import { Bell, Search, Calendar, ChevronDown, Command, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
    title: string;
    subtitle?: string;
    showDatePicker?: boolean;
    showSearch?: boolean;
    actions?: React.ReactNode;
    onMenuClick?: () => void;
}

export function Header({
    title,
    subtitle,
    showDatePicker = true,
    showSearch = true,
    actions,
    onMenuClick,
}: HeaderProps) {
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    return (
        <header className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-gray-800 sticky top-0 z-40 transition-all duration-200">
            {/* Main header row */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                    {/* Mobile menu button */}
                    {onMenuClick && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden h-10 w-10 rounded-full hover:bg-[#F1F5F9] dark:hover:bg-gray-800"
                            onClick={onMenuClick}
                        >
                            <Menu className="h-5 w-5 text-[#64748B]" />
                        </Button>
                    )}

                    <div className="flex flex-col gap-0.5 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-[#0F172A] dark:text-white tracking-tight leading-tight truncate">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs md:text-sm font-medium text-[#64748B] dark:text-gray-400 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {showDatePicker && (
                        <div className="hidden lg:flex items-center">
                            <div className="h-8 w-px bg-[#E2E8F0] dark:bg-gray-700 mx-4" />
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 h-9 border-[#E2E8F0] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#475569] dark:text-gray-300 hover:bg-[#F8FAFC] dark:hover:bg-gray-700 hover:text-[#0F172A] dark:hover:text-white shadow-sm"
                            >
                                <Calendar className="h-4 w-4 text-[#64748B] dark:text-gray-400" />
                                <span className="font-medium">30 ngày qua</span>
                                <ChevronDown className="h-3 w-3 text-[#94A3B8] ml-1" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {/* Search - Desktop */}
                    {showSearch && (
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-hover:text-[#0052CC] transition-colors" />
                            <Input
                                placeholder="Tìm kiếm..."
                                className="w-48 lg:w-64 pl-9 h-10 bg-[#F8FAFC] dark:bg-gray-800 border-transparent group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:border-[#E2E8F0] dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all duration-200 text-sm focus-visible:ring-[#0052CC]/20"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] font-medium text-[#94A3B8] bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-[#E2E8F0] dark:border-gray-600">
                                <Command className="h-3 w-3" />
                                <span>K</span>
                            </div>
                        </div>
                    )}

                    {/* Custom Actions */}
                    <div className="hidden sm:flex items-center gap-2">
                        {actions}
                    </div>

                    <div className="h-6 w-px bg-[#E2E8F0] dark:bg-gray-700 mx-1 hidden md:block" />

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-10 w-10 rounded-full hover:bg-[#F1F5F9] dark:hover:bg-gray-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                    >
                        <span className="absolute top-2.5 right-2.5 size-2 bg-[#D10029] rounded-full ring-2 ring-white dark:ring-gray-900" />
                        <Bell className="h-5 w-5" />
                    </Button>

                    {/* Mobile Search Toggle */}
                    {showSearch && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-10 w-10 rounded-full hover:bg-[#F1F5F9] dark:hover:bg-gray-800"
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                        >
                            {showMobileSearch ? (
                                <X className="h-5 w-5 text-[#64748B]" />
                            ) : (
                                <Search className="h-5 w-5 text-[#64748B]" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile search bar */}
            {showSearch && showMobileSearch && (
                <div className="md:hidden px-4 pb-3 border-t border-[#E2E8F0] dark:border-gray-800">
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                        <Input
                            placeholder="Tìm kiếm..."
                            className="w-full pl-9 h-10 bg-[#F8FAFC] dark:bg-gray-800 border-[#E2E8F0] dark:border-gray-700"
                            autoFocus
                        />
                    </div>
                </div>
            )}

            {/* Mobile actions bar */}
            {actions && (
                <div className="sm:hidden px-4 pb-3 flex gap-2 overflow-x-auto">
                    {actions}
                </div>
            )}
        </header>
    );
}
