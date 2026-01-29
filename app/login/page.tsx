"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, BarChart3, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { AuthIllustration } from "@/components/auth/AuthIllustration";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const { login, register, isLoading, error, clearError } = useAuthStore();

    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        confirmPassword: "",
    });
    const [validationError, setValidationError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError("");
        clearError();

        // Validation
        if (!formData.email || !formData.password) {
            setValidationError("Vui lòng điền đầy đủ thông tin");
            return;
        }

        if (isRegister) {
            if (!formData.name) {
                setValidationError("Vui lòng nhập tên của bạn");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setValidationError("Mật khẩu xác nhận không khớp");
                return;
            }
            if (formData.password.length < 6) {
                setValidationError("Mật khẩu phải có ít nhất 6 ký tự");
                return;
            }

            const success = await register(formData.email, formData.password, formData.name);
            if (success) {
                router.push("/");
            }
        } else {
            const success = await login(formData.email, formData.password);
            if (success) {
                router.push("/");
            }
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setValidationError("");
        clearError();
        setFormData({
            email: formData.email,
            password: "",
            name: "",
            confirmPassword: "",
        });
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                <div className="w-full max-w-md">
                    {/* Logo/Brand */}
                    <div className="mb-8 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] rounded-lg">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] bg-clip-text text-transparent">
                                Analytics Dashboard
                            </h1>
                        </div>
                        <p className="text-sm text-slate-600 hidden lg:block">
                            Quản lý và phân tích dữ liệu thông minh
                        </p>
                    </div>

                    {/* Login Card */}
                    <Card className="border-0 shadow-xl">
                        <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-2xl font-bold text-slate-900">
                                {isRegister ? "Tạo tài khoản" : "Chào mừng trở lại"}
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                                {isRegister
                                    ? "Điền thông tin để tạo tài khoản mới"
                                    : "Đăng nhập để tiếp tục sử dụng hệ thống"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {isRegister && (
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-slate-700">
                                            Họ và tên
                                        </label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Nguyễn Văn A"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            className="h-11 border-slate-200 focus:border-[#667EEA] focus:ring-[#667EEA]"
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-700">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="h-11 border-slate-200 focus:border-[#667EEA] focus:ring-[#667EEA]"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                        Mật khẩu
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) =>
                                                setFormData({ ...formData, password: e.target.value })
                                            }
                                            className="h-11 pr-10 border-slate-200 focus:border-[#667EEA] focus:ring-[#667EEA]"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                            disabled={isLoading}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {isRegister && (
                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={formData.confirmPassword}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                                }
                                                className="h-11 pr-10 border-slate-200 focus:border-[#667EEA] focus:ring-[#667EEA]"
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                                disabled={isLoading}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(error || validationError) && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                                        {error || validationError}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] hover:from-[#2563EB] hover:to-[#1E3A8A] text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : isRegister ? (
                                        "Tạo tài khoản"
                                    ) : (
                                        "Đăng nhập"
                                    )}
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-500">Hoặc</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className="w-full text-sm text-slate-600 hover:text-slate-900 transition-colors"
                                    disabled={isLoading}
                                >
                                    {isRegister ? (
                                        <>
                                            Đã có tài khoản?{" "}
                                            <span className="font-semibold text-[#3B82F6]">Đăng nhập</span>
                                        </>
                                    ) : (
                                        <>
                                            Chưa có tài khoản?{" "}
                                            <span className="font-semibold text-[#3B82F6]">Đăng ký ngay</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Features List - Mobile Only */}
                    <div className="mt-8 lg:hidden grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-white/60 rounded-lg border border-slate-200">
                            <BarChart3 className="h-5 w-5 text-[#3B82F6] mx-auto mb-1" />
                            <p className="text-xs text-slate-600">Analytics</p>
                        </div>
                        <div className="p-3 bg-white/60 rounded-lg border border-slate-200">
                            <TrendingUp className="h-5 w-5 text-[#60A5FA] mx-auto mb-1" />
                            <p className="text-xs text-slate-600">Insights</p>
                        </div>
                        <div className="p-3 bg-white/60 rounded-lg border border-slate-200">
                            <Zap className="h-5 w-5 text-[#2563EB] mx-auto mb-1" />
                            <p className="text-xs text-slate-600">Real-time</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Illustration (Desktop Only) */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#3B82F6] via-[#1E40AF] to-[#3B82F6] relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
                    {/* Illustration */}
                    <div className="mb-8 w-full max-w-2xl">
                        <AuthIllustration />
                    </div>

                    {/* Features */}
                    <div className="mt-8 space-y-6 max-w-md">
                        <h2 className="text-3xl font-bold mb-2">
                            Phân tích dữ liệu thông minh
                        </h2>
                        <p className="text-lg text-white/90 mb-8">
                            Tạo dashboard chuyên nghiệp, phân tích dữ liệu trực quan và đưa ra quyết định dựa trên dữ liệu
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Biểu đồ đa dạng</h3>
                                    <p className="text-sm text-white/80">
                                        Hỗ trợ nhiều loại biểu đồ: cột, đường, tròn, bản đồ và nhiều hơn nữa
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Phân tích nâng cao</h3>
                                    <p className="text-sm text-white/80">
                                        Drill-down, cross-filtering và các tính năng phân tích mạnh mẽ
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                                    <Zap className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Cập nhật real-time</h3>
                                    <p className="text-sm text-white/80">
                                        Dữ liệu được cập nhật tự động với refresh scheduling linh hoạt
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
