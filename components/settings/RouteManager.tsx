"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Shield, Trash2, ExternalLink, MoreHorizontal, Layout, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PermissionManager } from "@/components/dashboard-builder/PermissionManager";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

interface DashboardRoute {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    ownerId: string;
}

export function RouteManager() {
    const { user } = useAuthStore();
    const [routes, setRoutes] = useState<DashboardRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRouteName, setNewRouteName] = useState("");
    const [newRouteSlug, setNewRouteSlug] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/routes"); // Use dedicated API
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setRoutes(data.data); // No need to filter client-side
                }
            }
        } catch (error) {
            console.error("Failed to fetch routes", error);
            toast.error("Không thể tải danh sách route");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const handleCreateRoute = async () => {
        if (!newRouteName || !newRouteSlug) {
            toast.error("Vui lòng nhập tên và slug");
            return;
        }

        // Basic slug validation
        if (!/^[a-z0-9-]+$/.test(newRouteSlug)) {
            toast.error("Slug chỉ được chứa chữ thường, số và dấu gạch ngang");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/routes", { // Use dedicated API
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRouteName,
                    slug: newRouteSlug,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Đã tạo route thành công");
                setIsCreateOpen(false);
                setNewRouteName("");
                setNewRouteSlug("");
                fetchRoutes();
            } else {
                toast.error(data.error || "Tạo route thất bại");
            }
        } catch (error) {
            console.error("Error creating route", error);
            toast.error("Lỗi kết nối");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRoute = async (id: string, slug: string) => {
        if (!confirm(`Bạn có chắc muốn xóa route "${slug}"? Hành động này không thể hoàn tác.`)) return;

        try {
            const res = await fetch(`/api/dashboards/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Đã xóa route");
                fetchRoutes();
            } else {
                toast.error("Xóa thất bại");
            }
        } catch (error) {
            toast.error("Lỗi kết nối");
        }
    };

    const filteredRoutes = routes.filter(
        (r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Route & Phân quyền</h2>
                    <p className="text-muted-foreground">
                        Quản lý các dashboard hệ thống và phân quyền truy cập.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm Route
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Thêm Route Mới</DialogTitle>
                            <DialogDescription>
                                Tạo một Dashboard hệ thống mới được bảo vệ bởi RouteGuard.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tên Route</label>
                                <Input
                                    placeholder="Ví dụ: Net Add Dashboard"
                                    value={newRouteName}
                                    onChange={(e) => setNewRouteName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug (URL Path)</label>
                                <Input
                                    placeholder="Ví dụ: net-add"
                                    value={newRouteSlug}
                                    onChange={(e) => setNewRouteSlug(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Đường dẫn sẽ là: /{newRouteSlug}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Hủy
                            </Button>
                            <Button onClick={handleCreateRoute} disabled={creating} className="bg-blue-600 hover:bg-blue-700">
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Tạo Route
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm route..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                />
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Tên</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Cập nhật</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredRoutes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Chưa có route nào được tạo.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRoutes.map((route) => (
                                <TableRow key={route._id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                <Layout className="h-4 w-4" />
                                            </div>
                                            {route.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono text-xs">
                                            /{route.slug}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {route.isPublic ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Public</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">Private</Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                (Protected)
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(route.updatedAt), "dd/MM/yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <PermissionManager
                                                dashboardId={route.slug}
                                                dashboardName={route.name}
                                                resourceType="route"
                                                trigger={
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <Shield className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                }
                                            />

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/${route.slug}`} target="_blank">
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Truy cập
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${route.slug}`)}>
                                                        Copy Link
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteRoute(route._id, route.slug)}
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Xóa Route
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
