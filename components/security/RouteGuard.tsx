"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteGuardProps {
    slug: string;
    children: React.ReactNode;
    title?: string;
}

export function RouteGuard({ slug, children, title = "Protected Route" }: RouteGuardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [access, setAccess] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboardId, setDashboardId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false); // To show Setup button

    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    useEffect(() => {
        const checkAccess = async () => {
            setLoading(true);
            try {
                // Check permissions via API
                // Include token if present
                const url = token
                    ? `/api/routes/${slug}/permissions?token=${token}`
                    : `/api/routes/${slug}/permissions`;

                const res = await fetch(url);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setAccess(true);
                        setDashboardId(data.data.dashboardId);
                    } else {
                        setAccess(false);
                    }
                } else if (res.status === 403) {
                    // Forbidden - Try fetching content directly (maybe public or shared view)
                    // Pass token here too
                    // Note: System Routes don't have a content API like dashboards, so if permissions are forbidden, it's just forbidden.
                    // But we might want to check the route itself if needed, though permission check should suffice.
                    setAccess(false);
                    setError("Bạn không có quyền truy cập trang này.");
                } else if (res.status === 404) {
                    // Not found - implies Dashboard doesn't exist yet (for this slug).
                    // STRICT MODE: Block uninitialized routes.
                    setAccess(false);
                    setError("System Dashboard not initialized.");

                    // Allow admin to initialize
                    setIsAdmin(true);
                } else {
                    setAccess(false);
                    setError("Dashboard/User checking failed.");
                }
            } catch (err) {
                console.error("Auth check failed", err);
                setError("Lỗi kết nối.");
                setAccess(false);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [slug, token]);

    const handleInitialize = async () => {
        if (!confirm("Initialize security for this route? This will create a restrictive dashboard entry.")) return;

        try {
            const res = await fetch("/api/routes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: title,
                    slug: slug,
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Security initialized. Reloading...");
                window.location.reload();
            } else {
                alert("Failed: " + data.error);
            }
        } catch (e) {
            alert("Error initializing");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-500 text-sm">Đang kiểm tra quyền truy cập...</p>
            </div>
        );
    }

    if (!access) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Quyền truy cập bị từ chối</h2>
                    <p className="text-slate-500 mb-6">{error || "Bạn không có quyền xem bảng điều khiển này."}</p>

                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => router.push("/")}>
                            Quay lại trang chủ
                        </Button>

                        {isAdmin && error?.includes("not initialized") && (
                            <Button onClick={handleInitialize} className="bg-blue-600 hover:bg-blue-700">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Khởi tạo bảo mật
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
