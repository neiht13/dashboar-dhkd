"use client";

import React from "react";
import { FunnelChartComponent } from "@/components/charts/FunnelChart";
import { TreemapChartComponent } from "@/components/charts/TreemapChart";
import { WaterfallChartComponent } from "@/components/charts/WaterfallChart";
import { SemiCircleGauge, GAUGE_PRESETS } from "@/components/charts/SemiCircleGauge";
import { NetworkCoverageMap } from "@/components/charts/NetworkCoverageMap";
import {
    staticBTSStations,
    staticChurnFunnel,
    staticPackageData,
    staticWaterfallData,
} from "@/lib/mock-telecom-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TelecomDemoPage() {
    // Format currency in VND
    const formatCurrency = (value: number) => {
        if (value >= 1000000000000) {
            return `${(value / 1000000000000).toFixed(1)}T VNĐ`;
        }
        if (value >= 1000000000) {
            return `${(value / 1000000000).toFixed(0)}B VNĐ`;
        }
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(0)}M VNĐ`;
        }
        return `${value.toLocaleString("vi-VN")} VNĐ`;
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Telecom Dashboard Demo</h1>
                <p className="text-muted-foreground">
                    Các biểu đồ và tính năng chuyên biệt cho ngành viễn thông
                </p>
            </div>

            <Tabs defaultValue="charts" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="charts">Biểu đồ mới</TabsTrigger>
                    <TabsTrigger value="gauges">Gauge KPIs</TabsTrigger>
                    <TabsTrigger value="map">Bản đồ mạng</TabsTrigger>
                </TabsList>

                {/* New Charts Tab */}
                <TabsContent value="charts" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Funnel Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Phân tích Churn Rate</CardTitle>
                                <CardDescription>
                                    Funnel Chart - Theo dõi quá trình rời mạng của khách hàng
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FunnelChartComponent
                                    data={staticChurnFunnel.map((item) => ({
                                        name: item.stage,
                                        value: item.count,
                                        percentage: item.percentage,
                                    }))}
                                    height={350}
                                    gradientFill
                                />
                            </CardContent>
                        </Card>

                        {/* Treemap Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Phân bố Gói cước</CardTitle>
                                <CardDescription>
                                    Treemap - Click vào ô để xem chi tiết từng loại gói
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TreemapChartComponent
                                    data={staticPackageData.map((item) => ({
                                        name: item.name,
                                        value: item.subscribers,
                                        children: item.children?.map((child) => ({
                                            name: child.name,
                                            value: child.subscribers,
                                        })),
                                    }))}
                                    height={350}
                                    valueFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                                    enableDrillDown
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Waterfall Chart - Full width */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Phân tích Doanh thu Q3 → Q4</CardTitle>
                            <CardDescription>
                                Waterfall Chart - Thể hiện các yếu tố tăng/giảm doanh thu
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <WaterfallChartComponent
                                data={staticWaterfallData}
                                height={400}
                                valueFormatter={formatCurrency}
                                showLabels
                                showConnectors
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Gauge KPIs Tab */}
                <TabsContent value="gauges" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Network Uptime</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <SemiCircleGauge
                                    value={99.85}
                                    label="Uptime SLA"
                                    thresholds={GAUGE_PRESETS.uptime.thresholds}
                                    size="md"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Call Drop Rate</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <SemiCircleGauge
                                    value={1.2}
                                    min={0}
                                    max={5}
                                    label="Call Drop Rate"
                                    thresholds={GAUGE_PRESETS.callDropRate.thresholds}
                                    size="md"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Network Load</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <SemiCircleGauge
                                    value={72}
                                    label="Tải mạng hiện tại"
                                    thresholds={GAUGE_PRESETS.networkLoad.thresholds}
                                    size="md"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Avg Signal</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <SemiCircleGauge
                                    value={-78}
                                    min={-110}
                                    max={-50}
                                    unit="dBm"
                                    label="Cường độ TB"
                                    thresholds={[
                                        { value: -95, color: "#ef4444", label: "Yếu" },
                                        { value: -85, color: "#f59e0b", label: "TB" },
                                        { value: -70, color: "#84cc16", label: "Tốt" },
                                        { value: -50, color: "#22c55e", label: "XS" },
                                    ]}
                                    size="md"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">CSSR (Call Setup Success)</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center py-4">
                                <SemiCircleGauge
                                    value={98.5}
                                    label="Tỷ lệ thiết lập cuộc gọi"
                                    thresholds={[
                                        { value: 95, color: "#ef4444", label: "Kém" },
                                        { value: 98, color: "#f59e0b", label: "TB" },
                                        { value: 100, color: "#22c55e", label: "Tốt" },
                                    ]}
                                    size="lg"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Handover Success Rate</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center py-4">
                                <SemiCircleGauge
                                    value={97.2}
                                    label="Tỷ lệ chuyển vùng thành công"
                                    thresholds={[
                                        { value: 90, color: "#ef4444", label: "Kém" },
                                        { value: 95, color: "#f59e0b", label: "TB" },
                                        { value: 100, color: "#22c55e", label: "Tốt" },
                                    ]}
                                    size="lg"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Data Packet Success</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center py-4">
                                <SemiCircleGauge
                                    value={99.1}
                                    label="Tỷ lệ gói dữ liệu thành công"
                                    thresholds={[
                                        { value: 95, color: "#ef4444", label: "Kém" },
                                        { value: 98, color: "#f59e0b", label: "TB" },
                                        { value: 100, color: "#22c55e", label: "Tốt" },
                                    ]}
                                    size="lg"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Network Map Tab */}
                <TabsContent value="map" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bản đồ Phủ sóng & Trạm BTS</CardTitle>
                            <CardDescription>
                                Click vào trạm để xem chi tiết. Sử dụng nút Layers để bật/tắt các loại mạng.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <NetworkCoverageMap
                                stations={staticBTSStations}
                                height={600}
                                enableLayers
                                enableClustering
                                onStationClick={(station) => {
                                    console.log("Station clicked:", station);
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
