"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutStore } from "@/stores/layout-store";
import {
    LayoutDashboard,
    BarChart3,
    Database,
    Settings,
    PlusCircle,
    FolderKanban,
    Activity,
    LogOut,
    User,
    ChevronLeft,
    ChevronRight,
    X,
    Users,
    Bell,
    History,
    Shield,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface NavItem {
    title: string;
    href: string;
    icon: React.ReactNode;
    subItems?: { title: string; href: string }[];
}

const mainNavItems: NavItem[] = [
    {
        title: "Tổng quan",
        href: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
        title: "Thiết kế biểu đồ",
        href: "/charts/new",
        icon: <BarChart3 className="h-5 w-5" />,
    },
    {
        title: "Thư viện biểu đồ",
        href: "/charts",
        icon: <FolderKanban className="h-5 w-5" />,
    },
    {
        title: "Dữ liệu",
        href: "/database",
        icon: <Database className="h-5 w-5" />,
    },
];

const bottomNavItems: NavItem[] = [
    {
        title: "Quản lý Database",
        href: "/settings/databases",
        icon: <Database className="h-5 w-5" />,
    },
    {
        title: "Nhóm làm việc",
        href: "/teams",
        icon: <Users className="h-5 w-5" />,
    },
    {
        title: "Cảnh báo",
        href: "/alerts",
        icon: <Bell className="h-5 w-5" />,
    },
    {
        title: "Nhật ký hoạt động",
        href: "/activity",
        icon: <History className="h-5 w-5" />,
    },
    {
        title: "Kiểm toán",
        href: "/settings/audit",
        icon: <Shield className="h-5 w-5" />,
    },
    {
        title: "Cài đặt",
        href: "/settings",
        icon: <Settings className="h-5 w-5" />,
    },
];

interface SidebarProps {
    onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout, checkAuth } = useAuthStore();
    const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const handleNavClick = () => {
        // Close mobile sidebar on navigation
        onClose?.();
    };

    if (!mounted) {
        return <div className="w-[70px] bg-white dark:bg-gray-900 h-screen border-r border-[#E2E8F0] dark:border-gray-800" />;
    }

    const NavItemContent = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative rounded-lg",
                isActive
                    ? "bg-[#0052CC]/10 dark:bg-[#0052CC]/20 text-[#0052CC]"
                    : "text-[#64748B] dark:text-gray-400 hover:bg-[#F1F5F9] dark:hover:bg-gray-800 hover:text-[#0F172A] dark:hover:text-white",
                isSidebarCollapsed ? "justify-center px-2" : "",
                "mx-2"
            )}
        >
            <div className={cn(
                "transition-colors duration-200",
                isActive ? "text-[#0052CC]" : "text-[#64748B] dark:text-gray-400 group-hover:text-[#0F172A] dark:group-hover:text-white"
            )}>
                {item.icon}
            </div>

            {!isSidebarCollapsed && (
                <span className="text-[14px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                    {item.title}
                </span>
            )}

            {isActive && !isSidebarCollapsed && (
                <div className="absolute right-0 h-full w-1 bg-[#0052CC] top-0 rounded-l" />
            )}
        </div>
    );

    // Calculate active item based on longest matching prefix
    const allNavItems = [...mainNavItems, ...bottomNavItems];
    const activeItem = allNavItems
        .filter(item => {
            // Special case: "Tổng quan" should be active on "/" or "/dashboard"
            if (item.href === "/") return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
            // Prefix match for other paths
            return pathname === item.href || pathname.startsWith(item.href + "/");
        })
        .sort((a, b) => b.href.length - a.href.length)[0];

    return (
        <aside
            className={cn(
                "flex-shrink-0 bg-white dark:bg-gray-900 border-r border-[#E2E8F0] dark:border-gray-800 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-50",
                isSidebarCollapsed ? "w-[80px]" : "w-[260px]"
            )}
        >
            <div className="flex flex-col h-full">
                {/* Logo Header */}
                <div className={cn(
                    "h-[70px] flex items-center border-b border-[#E2E8F0]/50 dark:border-gray-800",
                    isSidebarCollapsed ? "justify-center px-0" : "px-6 justify-between"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                            <div className="size-9 rounded-xl bg-gradient-to-br from-[#0052CC] to-[#0033CC] flex items-center justify-center shadow-lg shadow-blue-500/20 text-white cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => isSidebarCollapsed && toggleSidebar()}
                            >
                                <Activity className="h-5 w-5" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 size-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                        </div>

                        {!isSidebarCollapsed && (
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold tracking-tight text-[#0F172A] dark:text-white leading-none">
                                    VNPT BI
                                </h1>
                                <span className="text-[10px] text-[#64748B] dark:text-gray-400 font-medium tracking-wider mt-0.5">ANALYTICS</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mobile close button */}
                        {onClose && !isSidebarCollapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="lg:hidden h-8 w-8 rounded-full bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-[#E2E8F0] dark:hover:bg-gray-700 hover:text-[#0F172A] dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Collapse button - desktop only */}
                        {!isSidebarCollapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="hidden lg:flex h-6 w-6 rounded-full bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-[#E2E8F0] dark:hover:bg-gray-700 hover:text-[#0F172A] dark:hover:text-white"
                            >
                                <ChevronLeft className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6">
                    {/* Main Section */}
                    <div className="px-0">
                        {!isSidebarCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-[#94A3B8] dark:text-gray-500 uppercase tracking-wider mb-2">
                                Menu chính
                            </h3>
                        )}
                        <div className="flex flex-col gap-1">
                            {mainNavItems.map((item) => {
                                const isActive = activeItem?.href === item.href;

                                return isSidebarCollapsed ? (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} onClick={handleNavClick}>
                                                <NavItemContent item={item} isActive={isActive} />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#1E293B] text-white border-none shadow-xl ml-2 font-medium">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Link key={item.href} href={item.href} onClick={handleNavClick}>
                                        <NavItemContent item={item} isActive={isActive} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Create Button */}
                    <div className={cn("px-4", isSidebarCollapsed ? "px-2" : "")}>
                        {isSidebarCollapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/builder/new"
                                        onClick={handleNavClick}
                                        className="flex items-center justify-center p-3 rounded-xl bg-[#0052CC] text-white hover:bg-[#0043A4] transition-all shadow-md shadow-blue-500/20"
                                    >
                                        <PlusCircle className="h-5 w-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#1E293B] text-white border-none shadow-xl ml-2 font-medium">
                                    Tạo Dashboard Mới
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Link
                                href="/builder/new"
                                onClick={handleNavClick}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#0052CC] to-[#0043A4] text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <PlusCircle className="h-5 w-5" />
                                <span className="font-semibold text-sm">Tạo Dashboard Mới</span>
                            </Link>
                        )}
                    </div>

                    {/* Bottom Section */}
                    <div className="mt-auto px-0">
                        {!isSidebarCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 mt-4">
                                Hệ thống
                            </h3>
                        )}
                        <div className="flex flex-col gap-1">
                            {bottomNavItems.map((item) => {
                                const isActive = activeItem?.href === item.href;

                                return isSidebarCollapsed ? (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger>
                                            <Link href={item.href}>
                                                <NavItemContent item={item} isActive={isActive} />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#1E293B] text-white border-none shadow-xl ml-2 font-medium">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Link key={item.href} href={item.href}>
                                        <NavItemContent item={item} isActive={isActive} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer / User Profile */}
                <div className="p-4 border-t border-[#E2E8F0]">
                    {isSidebarCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger>
                                <div className="flex justify-center flex-col gap-3 items-center">
                                    <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    {isAuthenticated && (
                                        <div className="size-9 rounded-full bg-gradient-to-tr from-[#0052CC] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-md">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-[#1E293B] text-white border-none shadow-xl ml-2">
                                {isAuthenticated ? (
                                    <div className="flex flex-col gap-1">
                                        <p className="font-medium">{user?.name}</p>
                                        <p className="text-xs text-white/70">Click to expand</p>
                                    </div>
                                ) : "Mở rộng"}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-3 p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0/50] group hover:border-[#0052CC]/30 transition-colors">
                            {isAuthenticated && user ? (
                                <>
                                    <div className="size-9 rounded-full bg-gradient-to-tr from-[#0052CC] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-[#0F172A] truncate group-hover:text-[#0052CC] transition-colors">{user.name}</p>
                                        <p className="text-[10px] text-[#64748B] font-medium bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] inline-block mt-0.5">
                                            {user.role}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                                        title="Đăng xuất"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center w-full gap-2 text-sm font-medium text-[#64748B] hover:text-[#0052CC]"
                                >
                                    <User className="h-4 w-4" />
                                    <span>Đăng nhập</span>
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
