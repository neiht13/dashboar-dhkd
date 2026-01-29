"use client";

import React from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, Globe, Lock, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionBadgeProps {
    type: "owner" | "shared" | "team" | "public" | "private";
    permission?: "view" | "edit";
    count?: number;
    className?: string;
    showLabel?: boolean;
}

const badgeConfig = {
    owner: {
        icon: Crown,
        label: "Chủ sở hữu",
        variant: "default" as const,
        className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    shared: {
        icon: Users,
        label: "Đã chia sẻ",
        variant: "secondary" as const,
        className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    team: {
        icon: Users,
        label: "Chia sẻ nhóm",
        variant: "secondary" as const,
        className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    public: {
        icon: Globe,
        label: "Công khai",
        variant: "secondary" as const,
        className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    private: {
        icon: Lock,
        label: "Riêng tư",
        variant: "outline" as const,
        className: "bg-muted text-muted-foreground",
    },
};

export function PermissionBadge({
    type,
    permission,
    count,
    className,
    showLabel = false,
}: PermissionBadgeProps) {
    const config = badgeConfig[type];
    const Icon = config.icon;

    const permissionLabel = permission === "edit" ? "Chỉnh sửa" : "Chỉ xem";
    const PermissionIcon = permission === "edit" ? Pencil : Eye;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant={config.variant}
                        className={cn(
                            "gap-1 px-2 py-0.5 text-xs font-normal cursor-default",
                            config.className,
                            className
                        )}
                    >
                        <Icon className="h-3 w-3" />
                        {showLabel && <span>{config.label}</span>}
                        {count !== undefined && count > 0 && (
                            <span className="font-medium">{count}</span>
                        )}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">{config.label}</span>
                        {permission && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <PermissionIcon className="h-3 w-3" />
                                {permissionLabel}
                            </span>
                        )}
                        {count !== undefined && count > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {count} {type === "team" ? "nhóm" : "người"}
                            </span>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface PermissionIndicatorProps {
    isOwner?: boolean;
    sharedUserCount?: number;
    sharedTeamCount?: number;
    isPublic?: boolean;
    className?: string;
}

export function PermissionIndicator({
    isOwner,
    sharedUserCount = 0,
    sharedTeamCount = 0,
    isPublic,
    className,
}: PermissionIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            {isOwner && <PermissionBadge type="owner" />}
            {sharedUserCount > 0 && (
                <PermissionBadge type="shared" count={sharedUserCount} />
            )}
            {sharedTeamCount > 0 && (
                <PermissionBadge type="team" count={sharedTeamCount} />
            )}
            {isPublic ? (
                <PermissionBadge type="public" />
            ) : !isOwner && sharedUserCount === 0 && sharedTeamCount === 0 ? (
                <PermissionBadge type="private" />
            ) : null}
        </div>
    );
}

export default PermissionBadge;
