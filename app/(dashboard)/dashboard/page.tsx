"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MoreVertical, Calendar, Users, BarChart3, RefreshCw, Loader2, Database } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { Dashboard } from "@/types";

export default function DashboardsPage() {
    const { dashboards, setDashboards } = useDashboardStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartsCount, setChartsCount] = useState(0);

    // Fetch dashboards from API
    const fetchDashboards = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/dashboards');
            const result = await response.json();

            if (result.success && result.data) {
                // Map MongoDB _id to id for consistency
                const mappedDashboards = result.data.map((d: any) => ({
                    ...d,
                    id: d._id || d.id,
                    createdAt: new Date(d.createdAt),
                    updatedAt: new Date(d.updatedAt),
                }));
                setDashboards(mappedDashboards);
            } else if (response.status === 401) {
                // Not authenticated - use local storage data
                console.log('Not authenticated, using local storage');
            } else {
                setError(result.error || 'Không thể tải danh sách dashboard');
            }
        } catch (err) {
            console.error('Error fetching dashboards:', err);
            // Don't show error if we have local data
            if (dashboards.length === 0) {
                setError('Không thể kết nối đến server');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch charts count
    const fetchChartsCount = async () => {
        try {
            const response = await fetch('/api/charts');
            const result = await response.json();
            if (result.success && result.data) {
                setChartsCount(result.data.length);
            }
        } catch (err) {
            console.error('Error fetching charts count:', err);
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchDashboards();
        fetchChartsCount();
    }, []);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(date));
    };

    return (
        <>
            <Header
                title="Bảng điều khiển"
                subtitle="Quản lý"
                showDatePicker={false}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchDashboards}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </Button>
                        <Link href="/builder/new">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Tạo Dashboard
                            </Button>
                        </Link>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[1400px] mx-auto">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-lg bg-[#0052CC]/10 flex items-center justify-center">
                                        <BarChart3 className="h-6 w-6 text-[#0052CC]" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#0F172A]">
                                            {dashboards.length}
                                        </p>
                                        <p className="text-sm text-[#64748B]">Tổng Dashboard</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Users className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#0F172A]">{chartsCount}</p>
                                        <p className="text-sm text-[#64748B]">Biểu đồ đã lưu</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-lg bg-[#B38600]/10 flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-[#B38600]" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#0F172A]">
                                            {formatDate(new Date())}
                                        </p>
                                        <p className="text-sm text-[#64748B]">Cập nhật cuối</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Loading State */}
                    {isLoading && dashboards.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-[#0052CC] mb-4" />
                            <p className="text-[#64748B]">Đang tải danh sách dashboard...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && dashboards.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Database className="h-16 w-16 text-[#CBD5E1] mb-4" />
                            <p className="text-lg font-medium text-[#0F172A] mb-2">Không thể tải dữ liệu</p>
                            <p className="text-[#64748B] mb-4">{error}</p>
                            <Button onClick={fetchDashboards} variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Thử lại
                            </Button>
                        </div>
                    )}

                    {/* Dashboard Grid */}
                    {!isLoading && dashboards.length === 0 && !error && (
                        <div className="text-center py-16">
                            <Database className="h-16 w-16 text-[#CBD5E1] mx-auto mb-4" />
                            <p className="text-lg font-medium text-[#0F172A] mb-2">Chưa có dashboard nào</p>
                            <p className="text-[#64748B] mb-6">Bắt đầu tạo dashboard đầu tiên của bạn</p>
                            <Link href="/builder/new">
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Tạo Dashboard
                                </Button>
                            </Link>
                        </div>
                    )}

                    {dashboards.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dashboards.map((dashboard) => (
                                <Link key={dashboard.id} href={`/builder/${dashboard.id}`}>
                                    <Card className="hover:shadow-md hover:border-[#0052CC]/50 transition-all cursor-pointer h-full">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {dashboard.description || "Không có mô tả"}
                                                    </CardDescription>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 -mr-2"
                                                    onClick={(e) => e.preventDefault()}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {/* Dashboard Preview Placeholder */}
                                            <div className="h-32 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] mb-4 flex items-center justify-center">
                                                <div className="grid grid-cols-4 gap-1 w-3/4 h-3/4 p-2">
                                                    <div className="col-span-2 bg-[#0052CC]/20 rounded" />
                                                    <div className="col-span-2 bg-[#B38600]/20 rounded" />
                                                    <div className="col-span-1 bg-[#6A00CC]/20 rounded" />
                                                    <div className="col-span-3 bg-[#D10029]/20 rounded" />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-[#64748B]">
                                                <span>{dashboard.widgets?.length || 0} widgets</span>
                                                <span>Cập nhật {formatDate(dashboard.updatedAt)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}

                            {/* Create New Dashboard Card */}
                            <Link href="/builder/new">
                                <Card className="hover:shadow-md hover:border-[#0052CC] transition-all cursor-pointer h-full border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center h-full min-h-[250px]">
                                        <div className="size-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                                            <Plus className="h-8 w-8 text-[#64748B]" />
                                        </div>
                                        <p className="text-lg font-semibold text-[#0F172A]">
                                            Tạo Dashboard Mới
                                        </p>
                                        <p className="text-sm text-[#64748B] text-center mt-1">
                                            Xây dựng dashboard tùy chỉnh với drag & drop
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
