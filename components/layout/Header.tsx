"use client";

import React from "react";
import { Bell, Search, Calendar, ChevronDown, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeaderProps {
    title: string;
    subtitle?: string;
    showDatePicker?: boolean;
    showSearch?: boolean;
    actions?: React.ReactNode;
}

export function Header({
    title,
    subtitle,
    showDatePicker = true,
    showSearch = true,
    actions,
}: HeaderProps) {
    return (
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-[#E2E8F0] sticky top-0 z-40 transition-all duration-200">
            <div className="flex items-center gap-6">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm font-medium text-[#64748B]">{subtitle}</p>
                    )}
                </div>

                {showDatePicker && (
                    <div className="hidden md:flex items-center">
                        <div className="h-8 w-px bg-[#E2E8F0] mx-4" />
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 h-9 border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] shadow-sm"
                        >
                            <Calendar className="h-4 w-4 text-[#64748B]" />
                            <span className="font-medium">30 ngày qua</span>
                            <ChevronDown className="h-3 w-3 text-[#94A3B8] ml-1" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                {showSearch && (
                    <div className="relative hidden md:block group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-hover:text-[#0052CC] transition-colors" />
                        <Input
                            placeholder="Tìm kiếm..."
                            className="w-64 pl-9 h-10 bg-[#F8FAFC] border-transparent group-hover:bg-white group-hover:border-[#E2E8F0] group-hover:shadow-sm transition-all duration-200 text-sm focus-visible:ring-[#0052CC]/20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] font-medium text-[#94A3B8] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                            <Command className="h-3 w-3" />
                            <span>K</span>
                        </div>
                    </div>
                )}

                {/* Custom Actions */}
                {actions}

                <div className="h-6 w-px bg-[#E2E8F0] mx-1 hidden md:block" />

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                    <span className="absolute top-2.5 right-2.5 size-2 bg-[#D10029] rounded-full ring-2 ring-white" />
                    <Bell className="h-5 w-5" />
                </Button>

                {/* Mobile Search Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 rounded-full hover:bg-[#F1F5F9]"
                >
                    <Search className="h-5 w-5 text-[#64748B]" />
                </Button>
            </div>
        </header>
    );
}
