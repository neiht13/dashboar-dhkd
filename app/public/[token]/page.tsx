import { connectDB } from "@/lib/mongodb";
import Dashboard from "@/models/Dashboard";
import ShareLink from "@/models/ShareLink";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import type { ChartConfig, KPIConfig } from "@/types";

interface PageProps {
    params: Promise<{ token: string }>;
}

async function fetchChartData(config: ChartConfig) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/database/chart-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: config.dataSource.table,
                xAxis: config.dataSource.xAxis,
                yAxis: config.dataSource.yAxis,
                aggregation: config.dataSource.aggregation || 'sum',
                limit: 50,
            }),
            cache: 'no-store',
        });

        const result = await response.json();
        return result.success ? result.data : [];
    } catch {
        return [];
    }
}

export default async function PublicDashboardPage({ params }: PageProps) {
    const { token } = await params;

    await connectDB();

    // Find share link
    const shareLink = await ShareLink.findOne({ token, isActive: true });

    if (!shareLink) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-xl font-bold text-[#0F172A] mb-2">
                            Link không hợp lệ
                        </h1>
                        <p className="text-[#64748B] mb-6">
                            Link này không tồn tại hoặc đã bị thu hồi.
                        </p>
                        <Link
                            href="/"
                            className="text-[#0052CC] hover:underline"
                        >
                            Về trang chủ
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check expiration
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">⏰</div>
                        <h1 className="text-xl font-bold text-[#0F172A] mb-2">
                            Link đã hết hạn
                        </h1>
                        <p className="text-[#64748B] mb-6">
                            Link chia sẻ này đã hết hạn sử dụng.
                        </p>
                        <Link
                            href="/"
                            className="text-[#0052CC] hover:underline"
                        >
                            Về trang chủ
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check max views
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">👁️</div>
                        <h1 className="text-xl font-bold text-[#0F172A] mb-2">
                            Đã đạt giới hạn lượt xem
                        </h1>
                        <p className="text-[#64748B] mb-6">
                            Link này đã đạt số lượt xem tối đa cho phép.
                        </p>
                        <Link
                            href="/"
                            className="text-[#0052CC] hover:underline"
                        >
                            Về trang chủ
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Get dashboard
    const dashboard = await Dashboard.findById(shareLink.dashboardId);

    if (!dashboard) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h1 className="text-xl font-bold text-[#0F172A] mb-2">
                            Dashboard không tồn tại
                        </h1>
                        <p className="text-[#64748B] mb-6">
                            Dashboard này có thể đã bị xóa.
                        </p>
                        <Link
                            href="/"
                            className="text-[#0052CC] hover:underline"
                        >
                            Về trang chủ
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Increment view count
    shareLink.viewCount += 1;
    shareLink.lastAccessedAt = new Date();
    await shareLink.save();

    // Fetch chart data for all chart widgets
    const widgetsWithData = await Promise.all(
        dashboard.widgets.map(async (widget) => {
            if (widget.type === 'chart') {
                const chartData = await fetchChartData(widget.config as ChartConfig);
                return { ...widget, chartData };
            }
            return widget;
        })
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#0F172A]">
                            {dashboard.name}
                        </h1>
                        {dashboard.description && (
                            <p className="text-sm text-[#64748B] mt-1">
                                {dashboard.description}
                            </p>
                        )}
                    </div>
                    <div className="text-xs text-[#94A3B8]">
                        Powered by VNPT DTP BI Analytics
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="max-w-7xl mx-auto p-6">
                {widgetsWithData.length === 0 ? (
                    <div className="text-center py-20 text-[#64748B]">
                        <div className="text-6xl mb-4">📊</div>
                        <p>Dashboard này chưa có widget nào.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-4">
                        {widgetsWithData.map((widget) => {
                            const layout = widget.layout;

                            return (
                                <div
                                    key={widget.id}
                                    className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden"
                                    style={{
                                        gridColumn: `span ${layout.w}`,
                                        minHeight: `${layout.h * 100}px`,
                                    }}
                                >
                                    <div className="p-4 h-full">
                                        {widget.type === 'chart' && (
                                            <DynamicChart
                                                config={widget.config as ChartConfig}
                                                data={(widget as { chartData?: Record<string, unknown>[] }).chartData || []}
                                                height={layout.h * 100 - 40}
                                                enableFilter={true}
                                                onFilterChange={() => {}}
                                            />
                                        )}
                                        {widget.type === 'kpi' && (
                                            <div className="flex flex-col h-full justify-center">
                                                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                                    {(widget.config as KPIConfig).title}
                                                </p>
                                                <h3 className="text-3xl font-bold text-[#0F172A]">
                                                    {formatNumber(12450, (widget.config as KPIConfig).format)}
                                                </h3>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] py-3 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>
                        Quyền xem: {shareLink.permission === 'view' ? 'Chỉ xem' : 'Chỉnh sửa'}
                    </span>
                    <span>
                        Lượt xem: {shareLink.viewCount}
                        {shareLink.maxViews && ` / ${shareLink.maxViews}`}
                    </span>
                </div>
            </footer>
        </div>
    );
}
