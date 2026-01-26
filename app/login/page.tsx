"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
    const router = useRouter();
    const { login, register, isLoading, error, clearError } = useAuthStore();

    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg border-border bg-card">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto size-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Activity className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-card-foreground">
                        {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm mt-2">
                        {isRegister
                            ? "Đăng ký để bắt đầu sử dụng VNPT DTP BI Analytics"
                            : "Chào mừng bạn trở lại với VNPT DTP BI Analytics"}
                    </p>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">
                                    Họ và tên
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="h-11"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Email
                            </label>
                            <Input
                                type="email"
                                placeholder="email@example.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="h-11"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">
                                    Xác nhận mật khẩu
                                </label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        setFormData({ ...formData, confirmPassword: e.target.value })
                                    }
                                    className="h-11"
                                />
                            </div>
                        )}

                        {/* Error Messages */}
                        {(validationError || error) && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {validationError || error}
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11"
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
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
                            <button
                                onClick={toggleMode}
                                className="ml-1 text-primary font-medium hover:underline"
                            >
                                {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
                            </button>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
