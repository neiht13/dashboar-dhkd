"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Search, 
    LayoutDashboard, 
    TrendingUp, 
    ShoppingCart, 
    Megaphone,
    Settings,
    DollarSign,
    Sparkles,
    Check,
    Loader2,
    Wifi,
    Activity,
    MapPin,
    Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_TEMPLATES } from '@/components/dashboards/dashboard-templates';

interface Template {
    _id: string;
    name: string;
    description?: string;
    category: string;
    thumbnail?: string;
    widgets: unknown[];
    layout: unknown[];
    isPublic: boolean;
    usageCount: number;
    tags: string[];
    targetRoles?: string[];
    persona?: string;
    // Built-in template fields
    isBuiltIn?: boolean;
    tabs?: unknown[];
}

interface TemplateSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectTemplate: (template: Template) => Promise<void>;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
    all: { label: 'Tất cả', icon: LayoutDashboard },
    telecom: { label: 'Viễn thông', icon: Wifi },
    sales: { label: 'Bán hàng', icon: ShoppingCart },
    kpi: { label: 'KPI', icon: TrendingUp },
    general: { label: 'Tổng hợp', icon: Settings },
    geographic: { label: 'Bản đồ', icon: MapPin },
    analytics: { label: 'Analytics', icon: Activity },
    custom: { label: 'Tùy chỉnh', icon: Sparkles },
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Lanh dao',
    editor: 'Dieu hanh',
    viewer: 'Kinh doanh',
    user: 'Kinh doanh',
};

// Convert built-in templates to the Template interface
function getBuiltInTemplates(): Template[] {
    return ALL_TEMPLATES.map((t) => {
        // Collect all widgets from all tabs
        const allWidgets = t.tabs.flatMap((tab) => tab.widgets);
        const allLayout = t.tabs.flatMap((tab) => tab.layout);

        return {
            _id: `builtin-${t.id}`,
            name: t.name,
            description: t.description,
            category: t.category,
            widgets: allWidgets,
            layout: allLayout,
            isPublic: true,
            usageCount: 0,
            tags: [t.category, 'built-in'],
            isBuiltIn: true,
            tabs: t.tabs,
        };
    });
}

export function TemplateSelector({ open, onOpenChange, onSelectTemplate }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [applying, setApplying] = useState(false);
    const userRole = useAuthStore((state) => state.user?.role);

    useEffect(() => {
        if (open) {
            fetchTemplates();
        }
    }, [open]);

    useEffect(() => {
        let filtered = templates;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter((t) => t.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.name.toLowerCase().includes(query) ||
                    t.description?.toLowerCase().includes(query) ||
                    t.tags.some((tag) => tag.toLowerCase().includes(query))
            );
        }

        setFilteredTemplates(filtered);
    }, [templates, selectedCategory, searchQuery]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            // Start with built-in templates (always available)
            const builtIn = getBuiltInTemplates();

            // Fetch remote templates from API
            let remote: Template[] = [];
            try {
                const params = new URLSearchParams({ includePrivate: 'true' });
                if (userRole) {
                    params.set('role', userRole);
                }
                const response = await fetch(`/api/templates?${params.toString()}`);
                const data = await response.json();
                if (data.success) {
                    remote = data.data;
                }
            } catch {
                // API templates are optional - built-in always work
            }

            // Merge: built-in first, then remote
            setTemplates([...builtIn, ...remote]);
        } catch (error) {
            console.error('Error fetching templates:', error);
            // At least show built-in templates
            setTemplates(getBuiltInTemplates());
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate) return;

        setApplying(true);
        try {
            await onSelectTemplate(selectedTemplate);
            onOpenChange(false);
        } catch (error) {
            console.error('Error applying template:', error);
        } finally {
            setApplying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Chọn Template Dashboard</DialogTitle>
                    <DialogDescription>
                        Chọn một template để bắt đầu nhanh chóng với các widget đã được cấu hình sẵn
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm template..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Categories */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                        {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
                            <TabsTrigger
                                key={key}
                                value={key}
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={selectedCategory} className="mt-4 flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <LayoutDashboard className="h-12 w-12 mb-2 opacity-50" />
                                <p>Không tìm thấy template nào</p>
                                {searchQuery && (
                                    <Button
                                        variant="link"
                                        className="mt-2"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        Xóa tìm kiếm
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                                {filteredTemplates.map((template) => (
                                    <Card
                                        key={template._id}
                                        className={cn(
                                            'cursor-pointer transition-all hover:shadow-md',
                                            selectedTemplate?._id === template._id &&
                                                'ring-2 ring-primary'
                                        )}
                                        onClick={() => setSelectedTemplate(template)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="aspect-video bg-muted rounded-md mb-3 relative overflow-hidden">
                                                {template.thumbnail ? (
                                                    <img
                                                        src={template.thumbnail}
                                                        alt={template.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <LayoutDashboard className="h-8 w-8 text-muted-foreground/50" />
                                                    </div>
                                                )}
                                                {selectedTemplate?._id === template._id && (
                                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <h4 className="font-semibold text-sm truncate">
                                                {template.name}
                                            </h4>
                                            {template.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                    {template.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {template.isBuiltIn && (
                                                    <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
                                                        Mẫu có sẵn
                                                    </Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">
                                                    {template.widgets.length} widgets
                                                </Badge>
                                                {template.tabs && (template.tabs as unknown[]).length > 1 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {(template.tabs as unknown[]).length} trang
                                                    </Badge>
                                                )}
                                                {template.targetRoles && template.targetRoles.length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {template.targetRoles.map((r) => ROLE_LABELS[r] || r).join(', ')}
                                                    </Badge>
                                                )}
                                                {template.persona && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {template.persona}
                                                    </Badge>
                                                )}
                                                {template.usageCount > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {template.usageCount} lượt dùng
                                                    </Badge>
                                                )}
                                            </div>

                                            {template.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {template.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        {selectedTemplate ? (
                            <span>
                                Đã chọn: <strong>{selectedTemplate.name}</strong>
                            </span>
                        ) : (
                            'Chọn một template để tiếp tục'
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleApplyTemplate}
                            disabled={!selectedTemplate || applying}
                        >
                            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sử dụng Template
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
