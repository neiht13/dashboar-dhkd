"use client";

import dynamic from "next/dynamic";

import { RouteGuard } from "@/components/security/RouteGuard";

const DashboardKpiNhanVien = dynamic(
    () => import("@/components/dashboards/kpinhanvien").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Đang tải dashboard...</div>
            </div>
        )
    }
);

export default function KpiNhanVienPage() {
    return (
        <RouteGuard slug="kpi-nhanvien" title="KPI Nhân Viên">
            <div className="min-h-screen bg-slate-50">
                <DashboardKpiNhanVien />
            </div>
        </RouteGuard>
    );
}
