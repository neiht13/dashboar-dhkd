"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorIllustration } from "@/components/errors/ErrorIllustration";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
            <div className="max-w-2xl w-full text-center">
                <div className="mb-8 flex justify-center">
                    <ErrorIllustration type="500" />
                </div>
                <h1 className="text-6xl font-bold text-[#0F172A] mb-4">500</h1>
                <h2 className="text-2xl font-semibold text-[#1E293B] mb-3">
                    Đã xảy ra lỗi
                </h2>
                <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                    {error.message || "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau."}
                </p>
                <div className="flex items-center justify-center gap-4">
                    <Button onClick={reset} variant="default" className="bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] hover:from-[#2563EB] hover:to-[#1E3A8A]">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Thử lại
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Về trang chủ
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
