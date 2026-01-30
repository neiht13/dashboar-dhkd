"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Share2,
    Users,
    User,
    Globe,
    Lock,
    Search,
    X,
    Crown,
    Eye,
    Pencil,
    Trash2,
    Copy,
    Check,
    Link,
    Loader2,
    UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface SharePermission {
    userId: { _id: string; toString(): string };
    permission: "view" | "edit";
    addedAt: Date;
    user?: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
}

interface TeamSharePermission {
    teamId: { _id: string; toString(): string };
    permission: "view" | "edit";
    addedAt: Date;
    team?: {
        _id: string;
        name: string;
        description?: string;
        avatar?: string;
        memberCount?: number;
        members?: Array<{ userId: string }>;
    };
}

interface PermissionData {
    dashboardId: string;
    dashboardName: string;
    owner: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    sharedWithUsers: SharePermission[];
    sharedWithTeams: TeamSharePermission[];
    isPublic: boolean;
    publicToken: string | null;
    publicPermission: "view" | "edit" | null;
}

interface SearchResult {
    users: Array<{
        _id: string;
        name: string;
        email: string;
        avatar?: string;
        role: string;
    }>;
    teams: Array<{
        _id: string;
        name: string;
        description?: string;
        avatar?: string;
        memberCount: number;
    }>;
}

interface PermissionManagerProps {
    dashboardId: string;
    dashboardName?: string;
    trigger?: React.ReactNode;
    onPermissionChange?: () => void;
    resourceType?: "dashboard" | "route";
}

export function PermissionManager({
    dashboardId,
    dashboardName,
    trigger,
    onPermissionChange,
    resourceType = "dashboard",
}: PermissionManagerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [permissionData, setPermissionData] = useState<PermissionData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [activeTab, setActiveTab] = useState<"users" | "teams">("users");

    const debouncedSearch = useDebounce(searchQuery, 300);

    const apiBase = resourceType === "route" ? "/api/routes" : "/api/dashboards";

    // Fetch permissions when dialog opens
    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/${dashboardId}/permissions`);
            const data = await res.json();
            if (data.success) {
                setPermissionData(data.data);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
        } finally {
            setLoading(false);
        }
    }, [dashboardId]);

    useEffect(() => {
        if (open) {
            fetchPermissions();
        }
    }, [open, fetchPermissions]);

    // Search users/teams
    useEffect(() => {
        const searchUsersAndTeams = async () => {
            if (!debouncedSearch || debouncedSearch.length < 2) {
                setSearchResults(null);
                return;
            }

            setSearchLoading(true);
            try {
                // Get existing IDs to exclude
                const excludeUserIds = permissionData?.sharedWithUsers
                    ?.map((s) => s.userId?.toString?.() || s.userId?._id)
                    .filter(Boolean) || [];
                const excludeTeamIds = permissionData?.sharedWithTeams
                    ?.map((s) => s.teamId?.toString?.() || s.teamId?._id)
                    .filter(Boolean) || [];
                const excludeIds = [...excludeUserIds, ...excludeTeamIds];

                const res = await fetch(
                    `/api/users/search?q=${encodeURIComponent(debouncedSearch)}&exclude=${excludeIds.join(",")}`
                );
                const data = await res.json();
                if (data.success) {
                    setSearchResults(data.data);
                }
            } catch (error) {
                console.error("Error searching:", error);
            } finally {
                setSearchLoading(false);
            }
        };

        searchUsersAndTeams();
    }, [debouncedSearch, permissionData?.sharedWithUsers, permissionData?.sharedWithTeams]);

    // Add permission
    const addPermission = async (
        type: "user" | "team",
        targetId: string,
        permission: "view" | "edit" = "view"
    ) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/permissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, targetId, permission }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchPermissions();
                setSearchQuery("");
                setSearchResults(null);
                onPermissionChange?.();
                toast.success("Đã thêm quyền truy cập");
            } else {
                toast.error(data.error || "Thêm quyền thất bại");
            }
        } catch (error) {
            console.error("Error adding permission:", error);
            toast.error("Lỗi kết nối");
        } finally {
            setSaving(false);
        }
    };

    // Update permission
    const updatePermission = async (
        type: "user" | "team",
        targetId: string,
        permission: "view" | "edit"
    ) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/permissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, targetId, permission }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchPermissions();
                onPermissionChange?.();
                toast.success("Đã cập nhật quyền");
            } else {
                toast.error(data.error || "Cập nhật thất bại");
            }
        } catch (error) {
            console.error("Error updating permission:", error);
            toast.error("Lỗi kết nối");
        } finally {
            setSaving(false);
        }
    };

    // Remove permission
    const removePermission = async (type: "user" | "team", targetId: string) => {
        setSaving(true);
        try {
            const res = await fetch(
                `${apiBase}/${dashboardId}/permissions?type=${type}&targetId=${targetId}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (data.success) {
                await fetchPermissions();
                onPermissionChange?.();
                toast.success("Đã xóa quyền");
            } else {
                toast.error(data.error || "Xóa thất bại");
            }
        } catch (error) {
            console.error("Error removing permission:", error);
            toast.error("Lỗi kết nối");
        } finally {
            setSaving(false);
        }
    };

    // Toggle public access
    const togglePublicAccess = async (isPublic: boolean) => {
        setSaving(true);
        try {
            const res = await fetch(`${apiBase}/${dashboardId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublic }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchPermissions();
                onPermissionChange?.();
            }
        } catch (error) {
            console.error("Error updating public access:", error);
        } finally {
            setSaving(false);
        }
    };

    // Copy public link
    const copyPublicLink = () => {
        if (permissionData?.publicToken) {
            const link = `${window.location.origin}/share/${permissionData.publicToken}`;
            navigator.clipboard.writeText(link);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Chia sẻ
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Chia sẻ Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        {dashboardName || permissionData?.dashboardName || "Dashboard"}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        {/* Search & Add */}
                        <div className="space-y-3">
                            <Label>Thêm người dùng hoặc nhóm</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm theo tên hoặc email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                                {searchLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                                )}
                            </div>

                            {/* Search Results */}
                            {searchResults && (searchResults.users.length > 0 || searchResults.teams.length > 0) && (
                                <div className="border rounded-lg overflow-hidden">
                                    <ScrollArea className="max-h-[200px]">
                                        {searchResults.users.length > 0 && (
                                            <div>
                                                <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    Người dùng
                                                </div>
                                                {searchResults.users.map((user) => (
                                                    <button
                                                        key={user._id}
                                                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                                                        onClick={() => addPermission("user", user._id)}
                                                        disabled={saving}
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            {user.avatar && <AvatarImage src={user.avatar} />}
                                                            <AvatarFallback className="text-xs">
                                                                {getInitials(user.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-medium">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {user.role}
                                                        </Badge>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.teams.length > 0 && (
                                            <div>
                                                <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <UsersRound className="h-3 w-3" />
                                                    Nhóm
                                                </div>
                                                {searchResults.teams.map((team) => (
                                                    <button
                                                        key={team._id}
                                                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                                                        onClick={() => addPermission("team", team._id)}
                                                        disabled={saving}
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            {team.avatar && <AvatarImage src={team.avatar} />}
                                                            <AvatarFallback className="text-xs bg-primary/10">
                                                                <UsersRound className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-medium">{team.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {team.memberCount} thành viên
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Current Permissions */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "teams")}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="users" className="gap-1">
                                    <User className="h-4 w-4" />
                                    Người dùng ({(permissionData?.sharedWithUsers?.length || 0) + 1})
                                </TabsTrigger>
                                <TabsTrigger value="teams" className="gap-1">
                                    <UsersRound className="h-4 w-4" />
                                    Nhóm ({permissionData?.sharedWithTeams?.length || 0})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="users" className="mt-3">
                                <ScrollArea className="h-[200px] pr-4">
                                    <div className="space-y-2">
                                        {/* Owner */}
                                        {permissionData?.owner && (
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                                <Avatar className="h-9 w-9">
                                                    {permissionData.owner.avatar && (
                                                        <AvatarImage src={permissionData.owner.avatar} />
                                                    )}
                                                    <AvatarFallback>
                                                        {getInitials(permissionData.owner.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium flex items-center gap-1">
                                                        {permissionData.owner.name}
                                                        <Crown className="h-3 w-3 text-yellow-500" />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {permissionData.owner.email}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">Chủ sở hữu</Badge>
                                            </div>
                                        )}

                                        {/* Shared Users */}
                                        {permissionData?.sharedWithUsers?.map((share) => (
                                            <div
                                                key={share.user?._id || share.userId?.toString?.() || share.userId?._id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                                            >
                                                <Avatar className="h-9 w-9">
                                                    {share.user?.avatar && (
                                                        <AvatarImage src={share.user.avatar} />
                                                    )}
                                                    <AvatarFallback>
                                                        {share.user ? getInitials(share.user.name) : "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium">
                                                        {share.user?.name || "Người dùng không xác định"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {share.user?.email}
                                                    </div>
                                                </div>
                                                <Select
                                                    value={share.permission}
                                                    onValueChange={(v) =>
                                                        updatePermission(
                                                            "user",
                                                            share.user?._id || share.userId?.toString?.() || share.userId?._id || "",
                                                            v as "view" | "edit"
                                                        )
                                                    }
                                                    disabled={saving}
                                                >
                                                    <SelectTrigger className="w-[100px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="view">
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                Xem
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="edit">
                                                            <div className="flex items-center gap-1">
                                                                <Pencil className="h-3 w-3" />
                                                                Chỉnh sửa
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        removePermission(
                                                            "user",
                                                            share.user?._id || share.userId?.toString?.() || share.userId?._id || ""
                                                        )
                                                    }
                                                    disabled={saving}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {(!permissionData?.sharedWithUsers || permissionData.sharedWithUsers.length === 0) && (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                                Chưa chia sẻ với người dùng nào
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="teams" className="mt-3">
                                <ScrollArea className="h-[200px] pr-4">
                                    <div className="space-y-2">
                                        {permissionData?.sharedWithTeams?.map((share) => (
                                            <div
                                                key={share.team?._id || share.teamId?.toString?.() || share.teamId?._id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                                            >
                                                <Avatar className="h-9 w-9">
                                                    {share.team?.avatar && (
                                                        <AvatarImage src={share.team.avatar} />
                                                    )}
                                                    <AvatarFallback className="bg-primary/10">
                                                        <UsersRound className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium">
                                                        {share.team?.name || "Nhóm không xác định"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {share.team?.memberCount || share.team?.members?.length || 0} thành viên
                                                    </div>
                                                </div>
                                                <Select
                                                    value={share.permission}
                                                    onValueChange={(v) =>
                                                        updatePermission(
                                                            "team",
                                                            share.team?._id || share.teamId?.toString?.() || share.teamId?._id || "",
                                                            v as "view" | "edit"
                                                        )
                                                    }
                                                    disabled={saving}
                                                >
                                                    <SelectTrigger className="w-[100px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="view">
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                Xem
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="edit">
                                                            <div className="flex items-center gap-1">
                                                                <Pencil className="h-3 w-3" />
                                                                Chỉnh sửa
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        removePermission(
                                                            "team",
                                                            share.team?._id || share.teamId?.toString?.() || share.teamId?._id || ""
                                                        )
                                                    }
                                                    disabled={saving}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {(!permissionData?.sharedWithTeams || permissionData.sharedWithTeams.length === 0) && (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                                Chưa chia sẻ với nhóm nào
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>

                        <Separator />

                        {/* Public Access */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {permissionData?.isPublic ? (
                                        <Globe className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div>
                                        <Label className="text-sm font-medium">Truy cập công khai</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {permissionData?.isPublic
                                                ? "Ai có link đều có thể xem"
                                                : "Chỉ những người được chia sẻ mới có thể xem"}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={permissionData?.isPublic || false}
                                    onCheckedChange={togglePublicAccess}
                                    disabled={saving}
                                />
                            </div>

                            {permissionData?.isPublic && permissionData.publicToken && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${permissionData.publicToken}`}
                                        className="text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyPublicLink}
                                    >
                                        {copiedLink ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default PermissionManager;
