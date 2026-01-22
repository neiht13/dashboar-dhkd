"use client";

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorThemeSelector } from '@/components/dashboard/ColorThemeSelector';
import { useColorThemeStore } from '@/stores/color-theme-store';
import { Palette, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { getActiveTheme, getChartColors } = useColorThemeStore();
    const activeTheme = getActiveTheme();
    const chartColors = getChartColors(8);

    const themeOptions = [
        { value: 'light', label: 'Sáng', icon: Sun },
        { value: 'dark', label: 'Tối', icon: Moon },
        { value: 'system', label: 'Hệ thống', icon: Monitor },
    ];

    return (
        <div className="flex flex-col h-full">
            <Header 
                title="Cài đặt" 
                subtitle="Tùy chỉnh giao diện và cấu hình hệ thống"
                showDatePicker={false}
                showSearch={false}
            />
            
            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Theme Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Moon className="h-5 w-5" />
                                Giao diện
                            </CardTitle>
                            <CardDescription>
                                Chọn chế độ hiển thị cho ứng dụng
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3">
                                {themeOptions.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <Button
                                            key={option.value}
                                            variant={theme === option.value ? 'default' : 'outline'}
                                            className={cn(
                                                'flex-1 flex-col h-20 gap-2',
                                                theme === option.value && 'ring-2 ring-primary'
                                            )}
                                            onClick={() => setTheme(option.value)}
                                        >
                                            <Icon className="h-6 w-6" />
                                            <span>{option.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chart Color Theme */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Màu sắc Biểu đồ
                            </CardTitle>
                            <CardDescription>
                                Chọn bảng màu cho các biểu đồ trong dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ColorThemeSelector showCustomize={true} />

                            {/* Preview */}
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-3">Xem trước: {activeTheme.name}</p>
                                <div className="flex gap-2">
                                    {chartColors.map((color, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 h-12 rounded-md shadow-sm flex items-end justify-center pb-1"
                                            style={{ backgroundColor: color }}
                                        >
                                            <span className="text-[10px] text-white font-medium drop-shadow">
                                                {i + 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Sample bars */}
                                <div className="flex items-end gap-2 mt-4 h-24">
                                    {[80, 60, 90, 45, 70, 55, 85, 40].map((height, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t-md transition-all hover:opacity-80"
                                            style={{
                                                backgroundColor: chartColors[i % chartColors.length],
                                                height: `${height}%`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info about features */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tính năng mới</CardTitle>
                            <CardDescription>
                                Các tính năng đã được bổ sung
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Undo/Redo:</strong> Hoàn tác và làm lại thao tác (Ctrl+Z, Ctrl+Y)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Version History:</strong> Xem và khôi phục phiên bản dashboard
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Templates:</strong> Sử dụng template có sẵn cho dashboard
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Color Themes:</strong> Tùy chỉnh màu sắc biểu đồ
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Drill-down:</strong> Click vào biểu đồ để xem chi tiết theo cấp
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Cross-filtering:</strong> Lọc dữ liệu giữa các biểu đồ
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Data Alerts:</strong> Thiết lập cảnh báo khi dữ liệu đạt ngưỡng
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Teams:</strong> Quản lý nhóm làm việc và phân quyền
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <strong>Activity Logs:</strong> Theo dõi nhật ký hoạt động
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
