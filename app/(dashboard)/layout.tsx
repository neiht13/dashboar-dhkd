"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SidebarSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [children]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileSidebarOpen]);

    if (!mounted) {
        return (
            <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-gray-950">
                <div className="hidden lg:block">
                    <SidebarSkeleton />
                </div>
                <main className="flex-1 flex flex-col h-screen overflow-hidden">
                    <div className="animate-pulse p-6">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-4" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-gray-950">
            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
            <div className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:transform-none",
                isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full bg-muted/40">
                {/* Conditionally render header based on path - Builder pages have their own header */}
                {!(pathname?.startsWith('/builder') || pathname?.startsWith('/charts/new')) && (
                    <Header
                        title={getTitle(pathname)}
                        subtitle="Quản lý dữ liệu tập trung"
                        onMenuClick={() => setIsMobileSidebarOpen(true)}
                    />
                )}
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </main>
        </div>
    );
}

function getTitle(pathname: string) {
    if (!pathname) return 'Tổng quan';
    if (pathname === '/' || pathname === '/dashboard') return 'Tổng quan';
    if (pathname.startsWith('/charts')) return 'Thư viện biểu đồ';
    if (pathname.startsWith('/builder')) return 'Thiết kế Dashboard';
    if (pathname.startsWith('/database')) return 'Dữ liệu';
    if (pathname.startsWith('/settings')) return 'Cài đặt';
    if (pathname.startsWith('/teams')) return 'Nhóm làm việc';
    if (pathname.startsWith('/alerts')) return 'Cảnh báo';
    return 'Dashboard';
}
