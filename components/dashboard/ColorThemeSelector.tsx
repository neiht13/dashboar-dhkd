"use client";

import React, { useState } from 'react';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { 
    Palette, 
    Check, 
    Plus, 
    Trash2, 
    Copy,
    Pencil 
} from 'lucide-react';
import { useColorThemeStore, PRESET_THEMES, ColorTheme } from '@/stores/color-theme-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ColorThemeSelectorProps {
    onThemeChange?: (theme: ColorTheme) => void;
    showCustomize?: boolean;
}

export function ColorThemeSelector({ onThemeChange, showCustomize = true }: ColorThemeSelectorProps) {
    const { 
        activeThemeId, 
        setActiveTheme, 
        getActiveTheme, 
        getAllThemes,
        createCustomTheme,
        updateCustomTheme,
        deleteCustomTheme,
        duplicateTheme,
    } = useColorThemeStore();

    const [open, setOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState<ColorTheme | null>(null);
    const [newThemeName, setNewThemeName] = useState('');
    const [newThemeColors, setNewThemeColors] = useState<string[]>([]);

    const allThemes = getAllThemes();
    const activeTheme = getActiveTheme();
    const customThemes = allThemes.filter((t) => t.isCustom);

    const handleSelectTheme = (theme: ColorTheme) => {
        setActiveTheme(theme.id);
        onThemeChange?.(theme);
        toast.success(`Đã chọn theme "${theme.name}"`);
    };

    const handleCreateTheme = () => {
        setEditingTheme(null);
        setNewThemeName('Theme mới');
        setNewThemeColors([...PRESET_THEMES[0].colors]);
        setEditDialogOpen(true);
    };

    const handleEditTheme = (theme: ColorTheme) => {
        setEditingTheme(theme);
        setNewThemeName(theme.name);
        setNewThemeColors([...theme.colors]);
        setEditDialogOpen(true);
    };

    const handleDuplicateTheme = (theme: ColorTheme) => {
        const newTheme = duplicateTheme(theme.id, `${theme.name} (Copy)`);
        if (newTheme) {
            toast.success('Đã sao chép theme');
        }
    };

    const handleDeleteTheme = (theme: ColorTheme) => {
        if (!theme.isCustom) return;
        deleteCustomTheme(theme.id);
        toast.success('Đã xóa theme');
    };

    const handleSaveTheme = () => {
        if (!newThemeName.trim()) {
            toast.error('Vui lòng nhập tên theme');
            return;
        }

        if (editingTheme) {
            updateCustomTheme(editingTheme.id, {
                name: newThemeName,
                colors: newThemeColors,
            });
            toast.success('Đã cập nhật theme');
        } else {
            createCustomTheme(newThemeName, newThemeColors);
            toast.success('Đã tạo theme mới');
        }

        setEditDialogOpen(false);
    };

    const handleColorChange = (index: number, color: string) => {
        const newColors = [...newThemeColors];
        newColors[index] = color;
        setNewThemeColors(newColors);
    };

    const addColor = () => {
        if (newThemeColors.length < 12) {
            setNewThemeColors([...newThemeColors, '#000000']);
        }
    };

    const removeColor = (index: number) => {
        if (newThemeColors.length > 2) {
            setNewThemeColors(newThemeColors.filter((_, i) => i !== index));
        }
    };

    const ThemePreview = ({ theme, size = 'md' }: { theme: ColorTheme; size?: 'sm' | 'md' }) => (
        <div className={cn('flex gap-0.5', size === 'sm' ? 'h-4' : 'h-6')}>
            {theme.colors.slice(0, size === 'sm' ? 5 : 8).map((color, i) => (
                <div
                    key={i}
                    className={cn(
                        'flex-1 first:rounded-l last:rounded-r',
                        size === 'sm' ? 'min-w-[8px]' : 'min-w-[12px]'
                    )}
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2">
                        <Palette className="h-4 w-4" />
                        <span className="flex-1 text-left truncate">{activeTheme.name}</span>
                        <div className="w-20">
                            <ThemePreview theme={activeTheme} size="sm" />
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                    <Tabs defaultValue="presets">
                        <TabsList className="w-full grid grid-cols-2 p-1">
                            <TabsTrigger value="presets">Có sẵn</TabsTrigger>
                            <TabsTrigger value="custom">Tùy chỉnh</TabsTrigger>
                        </TabsList>

                        <TabsContent value="presets" className="p-0">
                            <ScrollArea className="h-[300px]">
                                <div className="p-2 space-y-1">
                                    {PRESET_THEMES.map((theme) => (
                                        <div
                                            key={theme.id}
                                            className={cn(
                                                'p-3 rounded-lg cursor-pointer transition-all',
                                                'hover:bg-muted',
                                                activeThemeId === theme.id && 'bg-muted ring-2 ring-primary'
                                            )}
                                            onClick={() => handleSelectTheme(theme)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">{theme.name}</span>
                                                {activeThemeId === theme.id && (
                                                    <Check className="h-4 w-4 text-primary" />
                                                )}
                                            </div>
                                            <ThemePreview theme={theme} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="custom" className="p-0">
                            <ScrollArea className="h-[300px]">
                                <div className="p-2 space-y-1">
                                    {showCustomize && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-2 mb-2"
                                            onClick={handleCreateTheme}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Tạo theme mới
                                        </Button>
                                    )}

                                    {customThemes.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Chưa có theme tùy chỉnh
                                        </div>
                                    ) : (
                                        customThemes.map((theme) => (
                                            <div
                                                key={theme.id}
                                                className={cn(
                                                    'p-3 rounded-lg cursor-pointer transition-all',
                                                    'hover:bg-muted',
                                                    activeThemeId === theme.id && 'bg-muted ring-2 ring-primary'
                                                )}
                                                onClick={() => handleSelectTheme(theme)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm">{theme.name}</span>
                                                    <div className="flex items-center gap-1">
                                                        {activeThemeId === theme.id && (
                                                            <Check className="h-4 w-4 text-primary mr-1" />
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditTheme(theme);
                                                            }}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDuplicateTheme(theme);
                                                            }}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTheme(theme);
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <ThemePreview theme={theme} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </PopoverContent>
            </Popover>

            {/* Edit/Create Theme Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTheme ? 'Chỉnh sửa theme' : 'Tạo theme mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tên theme</Label>
                            <Input
                                value={newThemeName}
                                onChange={(e) => setNewThemeName(e.target.value)}
                                placeholder="Nhập tên theme"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Xem trước</Label>
                            <div className="p-4 bg-muted rounded-lg">
                                <ThemePreview theme={{ id: 'preview', name: '', colors: newThemeColors }} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Màu sắc ({newThemeColors.length})</Label>
                                {newThemeColors.length < 12 && (
                                    <Button variant="ghost" size="sm" onClick={addColor}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Thêm màu
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {newThemeColors.map((color, index) => (
                                    <div key={index} className="relative">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => handleColorChange(index, e.target.value)}
                                            className="w-full h-10 rounded cursor-pointer border-0"
                                        />
                                        {newThemeColors.length > 2 && (
                                            <button
                                                onClick={() => removeColor(index)}
                                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveTheme}>
                            {editingTheme ? 'Cập nhật' : 'Tạo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
