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
        <header className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-40 transition-all duration-200">
            {/* Main header row */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                    {/* Mobile menu button */}
                    {onMenuClick && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden h-10 w-10 rounded-full hover:bg-muted"
                            onClick={onMenuClick}
                        >
                            <Menu className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    )}

                    <div className="flex flex-col gap-0.5 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight leading-tight truncate">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {showDatePicker && (
                        <div className="hidden lg:flex items-center">
                            <div className="h-8 w-px bg-border mx-4" />
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 h-9 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
                            >
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">30 ngày qua</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {/* Search - Desktop */}
                    {showSearch && (
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <Input
                                placeholder="Tìm kiếm..."
                                className="w-48 lg:w-64 pl-9 h-10 bg-muted/50 border-transparent group-hover:bg-background group-hover:border-border group-hover:shadow-sm transition-all duration-200 text-sm focus-visible:ring-primary/20"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                                <Command className="h-3 w-3" />
                                <span>K</span>
                            </div>
                        </div>
                    )}

                    {/* Custom Actions */}
                    <div className="hidden sm:flex items-center gap-2">
                        {actions}
                    </div>

                    <div className="h-6 w-px bg-border mx-1 hidden md:block" />

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span className="absolute top-2.5 right-2.5 size-2 bg-destructive rounded-full ring-2 ring-background" />
                        <Bell className="h-5 w-5" />
                    </Button>

                    {/* Mobile Search Toggle */}
                    {showSearch && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-10 w-10 rounded-full hover:bg-muted"
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                        >
                            {showMobileSearch ? (
                                <X className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <Search className="h-5 w-5 text-muted-foreground" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile search bar */}
            {showSearch && showMobileSearch && (
                <div className="md:hidden px-4 pb-3 border-t border-border">
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm..."
                            className="w-full pl-9 h-10 bg-muted border-border"
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
