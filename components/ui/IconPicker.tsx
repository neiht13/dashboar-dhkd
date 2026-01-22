"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface IconPickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

// Danh sách icon phổ biến từ Lucide React
const COMMON_ICONS = [
    "Activity", "AlertCircle", "AlertTriangle", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight",
    "BarChart", "BarChart2", "BarChart3", "BarChart4", "Bell", "Calendar", "Camera",
    "Check", "CheckCircle", "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp",
    "Clock", "Cloud", "Code", "Coffee", "Compass", "Copy", "CreditCard", "Database",
    "DollarSign", "Download", "Edit", "Edit2", "Edit3", "Eye", "EyeOff", "File",
    "FileText", "Filter", "Flag", "Folder", "FolderOpen", "Gift", "Globe", "Grid",
    "Heart", "Home", "Image", "Inbox", "Info", "Key", "Layers", "Lightbulb", "Link",
    "Lock", "Mail", "Map", "MapPin", "Maximize", "Menu", "MessageCircle", "MessageSquare",
    "Minimize", "Minus", "MinusCircle", "Monitor", "Moon", "MoreHorizontal", "MoreVertical",
    "MousePointer", "Music", "Navigation", "Package", "Paperclip", "Pause", "PauseCircle",
    "Percent", "Phone", "PieChart", "Play", "PlayCircle", "Plus", "PlusCircle", "Power",
    "Printer", "Radio", "RefreshCw", "Repeat", "RotateCcw", "RotateCw", "Save", "Scissors",
    "Search", "Send", "Settings", "Share", "Shield", "ShoppingBag", "ShoppingCart",
    "Shuffle", "Sidebar", "SkipBack", "SkipForward", "Slash", "Sliders", "Smartphone",
    "Speaker", "Square", "Star", "Sun", "Tablet", "Tag", "Target", "Terminal", "ThumbsDown",
    "ThumbsUp", "Tool", "Trash", "Trash2", "TrendingDown", "TrendingUp", "Triangle",
    "Truck", "Tv", "Type", "Umbrella", "Unlock", "Upload", "User", "UserCheck", "UserMinus",
    "UserPlus", "Users", "Video", "VideoOff", "Voicemail", "Volume", "Volume2", "Watch",
    "Wifi", "WifiOff", "Wind", "X", "XCircle", "Zap", "ZoomIn", "ZoomOut",
    // Thêm các icon phổ biến cho telecom
    "Signal", "PhoneCall", "PhoneForwarded", "PhoneIncoming", "PhoneMissed", "PhoneOutgoing",
    "Wifi", "Router", "Server", "Cloud", "CloudDownload", "CloudUpload", "Radio",
    "Antenna", "Tower", "Satellite", "Globe", "Network", "Cable", "Settings2",
    "Gauge", "Activity", "BarChart2", "LineChart", "PieChart", "TrendingUp", "TrendingDown",
    "DollarSign", "CreditCard", "Receipt", "Wallet", "PiggyBank", "Banknote"
];

export function IconPicker({ value, onChange, placeholder = "Chọn icon...", className }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Lọc icon theo search term
    const filteredIcons = useMemo(() => {
        if (!searchTerm) return COMMON_ICONS;
        return COMMON_ICONS.filter(icon =>
            icon.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    // Icon hiện tại được chọn
    const SelectedIcon = value && icons[value as keyof typeof icons]
        ? icons[value as keyof typeof icons] as React.ComponentType<{ className?: string }>
        : null;

    const handleSelectIcon = (iconName: string) => {
        onChange(iconName);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    {SelectedIcon ? (
                        <div className="flex items-center gap-2">
                            <SelectedIcon className="h-4 w-4" />
                            <span>{value}</span>
                        </div>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 border-b">
                    <Input
                        placeholder="Tìm kiếm icon..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9"
                    />
                </div>
                <ScrollArea className="h-64">
                    <div className="grid grid-cols-8 gap-2 p-4">
                        {filteredIcons.map((iconName) => {
                            const IconComponent = icons[iconName as keyof typeof icons] as React.ComponentType<{ className?: string }>;
                            if (!IconComponent) return null;

                            return (
                                <Button
                                    key={iconName}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-10 w-10 p-0 hover:bg-accent",
                                        value === iconName && "bg-accent"
                                    )}
                                    onClick={() => handleSelectIcon(iconName)}
                                    title={iconName}
                                >
                                    <IconComponent className="h-4 w-4" />
                                </Button>
                            );
                        })}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            Không tìm thấy icon nào
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}