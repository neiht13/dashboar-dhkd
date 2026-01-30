"use client";

import dynamic from "next/dynamic";

import { RouteGuard } from "@/components/security/RouteGuard";

export default function NetAddPage() {
    const DashboardNetAdd = dynamic(
        () => import("@/components/example2").then((mod) => mod.default),
        {
            ssr: false,
            loading: () => (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="animate-pulse text-slate-500">Đang tải dashboard...</div>
                </div>
            )
        }
    );

    return (
        <RouteGuard slug="net-add" title="Chương trình Net Add">
            <div className="min-h-screen bg-slate-50">
                <DashboardNetAdd />
            </div>
        </RouteGuard>
    );
}
