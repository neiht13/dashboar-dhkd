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
        title: "Quản lý Route",
        href: "/settings/routes",
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
        return <div className="w-[70px] bg-sidebar h-screen border-r border-sidebar-border" />;
    }

    const NavItemContent = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-all duration-300 group relative rounded-xl mx-2",
                isActive
                    ? "bg-gradient-to-r from-primary/15 to-transparent text-primary font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1",
                isSidebarCollapsed ? "justify-center px-2" : ""
            )}
        >
            <div className={cn(
                "transition-colors duration-300 relative z-10",
                isActive ? "text-primary drop-shadow-sm" : "text-muted-foreground group-hover:text-sidebar-foreground"
            )}>
                {item.icon}
            </div>

            {!isSidebarCollapsed && (
                <span className={cn(
                    "text-[14px] whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10",
                    isActive ? "font-semibold" : "font-medium"
                )}>
                    {item.title}
                </span>
            )}

            {isActive && !isSidebarCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
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
                "flex-shrink-0 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/60 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-50 shadow-xl shadow-black/5",
                isSidebarCollapsed ? "w-[80px]" : "w-[280px]"
            )}
            style={{
                backgroundImage: 'radial-gradient(circle at top left, var(--sidebar-primary-foreground) 0%, transparent 15%)'
            }}
        >
            <div className="flex flex-col h-full">
                {/* Logo Header */}
                <div className={cn(
                    "h-[80px] flex items-center mb-2",
                    isSidebarCollapsed ? "justify-center px-0" : "px-6 justify-between"
                )}>
                    <div className="flex items-center gap-3.5">
                        <div className="relative flex items-center justify-center group cursor-pointer"
                            onClick={() => isSidebarCollapsed && toggleSidebar()}
                        >
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all opacity-50"></div>
                            <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25 text-primary-foreground relative z-10 group-hover:scale-105 transition-transform duration-300">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 size-3.5 bg-emerald-500 border-[3px] border-sidebar rounded-full z-20"></div>
                        </div>

                        {!isSidebarCollapsed && (
                            <div className="flex flex-col">
                                <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground leading-none font-display">
                                    VNPT BI
                                </h1>
                                <span className="text-[10px] text-muted-foreground/80 font-bold tracking-[0.2em] mt-1 uppercase">Analytics</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Mobile close button */}
                        {onClose && !isSidebarCollapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="lg:hidden h-8 w-8 rounded-full text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
                                className="hidden lg:flex h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-8 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20">
                    {/* Main Section */}
                    <div className="px-0">
                        {!isSidebarCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3 pl-8">
                                Menu chính
                            </h3>
                        )}
                        <div className="flex flex-col gap-1.5">
                            {mainNavItems.map((item) => {
                                const isActive = activeItem?.href === item.href;

                                return isSidebarCollapsed ? (
                                    <Tooltip key={item.href} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} onClick={handleNavClick}>
                                                <NavItemContent item={item} isActive={isActive} />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium ml-2 bg-popover text-popover-foreground border-border shadow-xl">
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
                    <div className={cn("px-4 my-2", isSidebarCollapsed ? "px-2" : "")}>
                        {isSidebarCollapsed ? (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/builder/new"
                                        onClick={handleNavClick}
                                        className="flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-105"
                                    >
                                        <PlusCircle className="h-6 w-6" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium ml-2 bg-popover text-popover-foreground border-border shadow-xl">
                                    Tạo Dashboard Mới
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Link
                                href="/builder/new"
                                onClick={handleNavClick}
                                className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 overflow-hidden mx-2"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                <div className="p-1 bg-white/20 rounded-lg">
                                    <PlusCircle className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="font-bold text-sm tracking-tight">Tạo Dashboard</span>
                                    <span className="text-[10px] text-white/80 font-medium">Kéo thả tùy chỉnh</span>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Bottom Section */}
                    <div className="mt-auto px-0 pb-4">
                        {!isSidebarCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3 pl-8 mt-4">
                                Hệ thống
                            </h3>
                        )}
                        <div className="flex flex-col gap-1.5">
                            {bottomNavItems.map((item) => {
                                const isActive = activeItem?.href === item.href;

                                return isSidebarCollapsed ? (
                                    <Tooltip key={item.href} delayDuration={0}>
                                        <TooltipTrigger>
                                            <Link href={item.href}>
                                                <NavItemContent item={item} isActive={isActive} />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium ml-2 bg-popover text-popover-foreground border-border shadow-xl">
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
                <div className="p-4 mx-2 mb-2 bg-sidebar-accent/30 rounded-2xl border border-sidebar-border/50 backdrop-blur-sm">
                    {isSidebarCollapsed ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger>
                                <div className="flex justify-center flex-col gap-4 items-center">
                                    <button onClick={toggleSidebar} className="p-2.5 rounded-xl hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all">
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                    {isAuthenticated && (
                                        <div className="size-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-background shadow-lg">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2 bg-popover text-popover-foreground border-border shadow-xl">
                                {isAuthenticated ? (
                                    <div className="flex flex-col gap-1">
                                        <p className="font-medium">{user?.name}</p>
                                        <p className="text-xs text-muted-foreground">Click to expand</p>
                                    </div>
                                ) : "Mở rộng"}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-3 group">
                            {isAuthenticated && user ? (
                                <>
                                    <div className="relative">
                                        <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-background group-hover:scale-105 transition-transform duration-300">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-background rounded-full"></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{user.name}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {user.role}
                                        </p>
                                    </div>

                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={handleLogout}
                                                className="p-2 rounded-xl text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                                            >
                                                <LogOut className="h-5 w-5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Đăng xuất</TooltipContent>
                                    </Tooltip>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center w-full gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-1"
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
