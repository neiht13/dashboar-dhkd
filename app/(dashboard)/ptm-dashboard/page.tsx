"use client";

import dynamic from "next/dynamic";

// Dynamic import để tránh SSR issues với MapLibre
const UltimateDashboard = dynamic(
    () => import("@/components/example").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Đang tải dashboard...</div>
            </div>
        )
    }
);

export default function PTMDashboardPage() {
    return <UltimateDashboard />;
}
