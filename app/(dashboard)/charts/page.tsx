"use client";

import React from "react";
import Link from "next/link";
import { Plus, BarChart3, LineChart, PieChart, Trash2, Edit, Copy } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartStore } from "@/stores/chart-store";

const chartIcons: Record<string, React.ReactNode> = {
    bar: <BarChart3 className="h-8 w-8" />,
    line: <LineChart className="h-8 w-8" />,
    pie: <PieChart className="h-8 w-8" />,
    area: <BarChart3 className="h-8 w-8" />,
    radar: <BarChart3 className="h-8 w-8" />,
};

export default function ChartsPage() {
    const { charts, setCharts, deleteChart, saveChart } = useChartStore();
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchCharts = async () => {
            try {
                const response = await fetch('/api/charts');
                const result = await response.json();
                if (result.success) {
                    setCharts(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch charts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCharts();
    }, [setCharts]);


    const formatDate = (date?: Date) => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(date));
    };

    const handleDuplicate = async (chart: any) => {
        try {
            // Create a copy of the chart config
            // Remove ID and audit fields to create a new record
            const { _id, id, createdAt, updatedAt, ...chartConfig } = chart;

            const newChart = {
                ...chartConfig,
                name: `${chartConfig.name} (Copy)`,
            };

            const response = await fetch('/api/charts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChart),
            });

            const result = await response.json();
            if (result.success && result.data) {
                // Update local store
                saveChart(result.data);
                // toast.success("Đã nhân bản biểu đồ"); // Assuming sonner is available or will use alert/console for now if not imported
            } else {
                console.error("Failed to duplicate:", result.error);
            }
        } catch (error) {
            console.error("Error duplicating chart:", error);
        }
    };

    return (
        <>
            <Header
                title="My Charts"
                subtitle="Thư viện"
                showDatePicker={false}
                actions={
                    <Link href="/charts/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tạo Chart Mới
                        </Button>
                    </Link>
                }
            />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[1400px] mx-auto">
                    {charts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="size-20 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                                <BarChart3 className="h-10 w-10 text-[#64748B]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                                Chưa có biểu đồ nào
                            </h3>
                            <p className="text-sm text-[#64748B] max-w-md mb-4">
                                Tạo biểu đồ đầu tiên của bạn bằng Chart Designer để bắt đầu xây dựng
                                dashboards.
                            </p>
                            <Link href="/charts/new">
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Tạo Chart Mới
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {charts.map((chart) => (
                                <Card key={chart.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-12 rounded-lg bg-[#0052CC]/10 flex items-center justify-center text-[#0052CC]">
                                                    {chartIcons[chart.type] || <BarChart3 className="h-6 w-6" />}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{chart.name}</CardTitle>
                                                    <CardDescription className="capitalize">
                                                        {chart.type} Chart
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="text-xs text-[#64748B]">
                                                <p>
                                                    <span className="font-medium">Table:</span>{" "}
                                                    {chart.dataSource?.table || 'N/A'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">X-Axis:</span>{" "}
                                                    {chart.dataSource?.xAxis || 'N/A'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Y-Axis:</span>{" "}
                                                    {(chart.dataSource?.yAxis || []).join(", ")}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                                                <span className="text-xs text-[#64748B]">
                                                    Created {formatDate(chart.createdAt ? new Date(chart.createdAt) : undefined)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Link href={`/charts/new?edit=${chart.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-[#0052CC] hover:text-[#0052CC]"
                                                        onClick={() => handleDuplicate(chart)}
                                                        title="Nhân bản"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-[#D10029] hover:text-[#D10029]"
                                                        onClick={() => deleteChart(chart.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Create New Chart Card */}
                            <Link href="/charts/new">
                                <Card className="hover:shadow-md hover:border-[#0052CC] transition-all cursor-pointer h-full border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                        <div className="size-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-3">
                                            <Plus className="h-6 w-6 text-[#64748B]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[#0F172A]">
                                            Tạo Chart Mới
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
