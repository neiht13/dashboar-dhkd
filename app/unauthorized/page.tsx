import Link from "next/link";
import { ErrorIllustration } from "@/components/errors/ErrorIllustration";
import { Button } from "@/components/ui/button";
import { Home, LogIn, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
            <div className="max-w-2xl w-full text-center">
                <div className="mb-8 flex justify-center">
                    <ErrorIllustration type="401" />
                </div>
                <h1 className="text-6xl font-bold text-[#0F172A] mb-4">401</h1>
                <h2 className="text-2xl font-semibold text-[#1E293B] mb-3">
                    Yêu cầu đăng nhập
                </h2>
                <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                    Bạn cần đăng nhập để truy cập trang này. Vui lòng đăng nhập để tiếp tục.
                </p>
                <div className="flex items-center justify-center gap-4">
                    <Button asChild variant="default" className="bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] hover:from-[#2563EB] hover:to-[#1E3A8A]">
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Đăng nhập
                        </Link>
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
