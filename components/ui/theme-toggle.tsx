"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
    className?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Theme toggle dropdown with Light, Dark, and System options
 */
export function ThemeToggle({ className, variant = "ghost", size = "icon" }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant={variant} size={size} className={className}>
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant={variant} 
                    size={size} 
                    className={cn(
                        "relative h-10 w-10 rounded-full hover:bg-[#F1F5F9] dark:hover:bg-gray-800",
                        className
                    )}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[#64748B]" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[#64748B]" />
                    <span className="sr-only">Đổi giao diện</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        theme === "light" && "bg-[#0052CC]/10 text-[#0052CC]"
                    )}
                >
                    <Sun className="h-4 w-4" />
                    <span>Sáng</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        theme === "dark" && "bg-[#0052CC]/10 text-[#0052CC]"
                    )}
                >
                    <Moon className="h-4 w-4" />
                    <span>Tối</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => setTheme("system")}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        theme === "system" && "bg-[#0052CC]/10 text-[#0052CC]"
                    )}
                >
                    <Monitor className="h-4 w-4" />
                    <span>Hệ thống</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Simple theme toggle button (Light/Dark only)
 */
export function SimpleThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
                "relative h-10 w-10 rounded-full hover:bg-[#F1F5F9] dark:hover:bg-gray-800",
                className
            )}
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[#64748B]" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[#64748B]" />
            <span className="sr-only">Đổi giao diện</span>
        </Button>
    );
}
