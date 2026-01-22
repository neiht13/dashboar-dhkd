"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
    Users, 
    Plus, 
    Trash2, 
    Pencil, 
    UserPlus,
    Crown,
    Shield,
    User,
    Eye,
    Loader2,
    MoreVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamMember {
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: string;
    user?: {
        _id: string;
        name: string;
        email: string;
    };
}

interface Team {
    _id: string;
    name: string;
    description?: string;
    avatar?: string;
    members: TeamMember[];
    ownerId: string;
    owner?: {
        _id: string;
        name: string;
        email: string;
    };
    memberCount: number;
    dashboards?: Array<{ _id: string; name: string }>;
    isActive: boolean;
    createdAt: string;
}

const ROLE_CONFIG = {
    owner: { label: 'Chủ sở hữu', icon: Crown, color: 'text-amber-500' },
    admin: { label: 'Quản trị', icon: Shield, color: 'text-blue-500' },
    member: { label: 'Thành viên', icon: User, color: 'text-green-500' },
    viewer: { label: 'Xem', icon: Eye, color: 'text-gray-500' },
};

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [saving, setSaving] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const fetchTeams = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/teams');
            const data = await response.json();
            if (data.success) {
                setTeams(data.data);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
            toast.error('Không thể tải danh sách nhóm');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleOpenCreate = () => {
        setEditingTeam(null);
        setFormData({ name: '', description: '' });
        setDialogOpen(true);
    };

    const handleOpenEdit = (team: Team) => {
        setEditingTeam(team);
        setFormData({ name: team.name, description: team.description || '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên nhóm');
            return;
        }

        setSaving(true);
        try {
            const url = editingTeam ? `/api/teams/${editingTeam._id}` : '/api/teams';
            const method = editingTeam ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(editingTeam ? 'Đã cập nhật nhóm' : 'Đã tạo nhóm');
                setDialogOpen(false);
                fetchTeams();
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error saving team:', error);
            toast.error('Không thể lưu nhóm');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (teamId: string) => {
        if (!confirm('Bạn có chắc muốn xóa nhóm này?')) return;

        try {
            const response = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                toast.success('Đã xóa nhóm');
                fetchTeams();
            } else {
                toast.error(data.error || 'Không thể xóa nhóm');
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !selectedTeam) {
            toast.error('Vui lòng nhập email');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`/api/teams/${selectedTeam._id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Đã thêm thành viên');
                setInviteDialogOpen(false);
                setInviteEmail('');
                fetchTeams();
            } else {
                toast.error(data.error || 'Không thể thêm thành viên');
            }
        } catch (error) {
            console.error('Error inviting member:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMember = async (teamId: string, userId: string) => {
        if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;

        try {
            const response = await fetch(`/api/teams/${teamId}/members?userId=${userId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Đã xóa thành viên');
                fetchTeams();
            } else {
                toast.error(data.error || 'Không thể xóa thành viên');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <Header 
                title="Quản lý Nhóm" 
                subtitle="Tạo và quản lý các nhóm làm việc"
                showDatePicker={false}
                showSearch={false}
                actions={
                    <Button onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo nhóm
                    </Button>
                }
            />
            
            <div className="flex-1 p-6 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Users className="h-12 w-12 mb-2 opacity-50" />
                        <p>Bạn chưa có nhóm nào</p>
                        <Button variant="link" onClick={handleOpenCreate}>
                            Tạo nhóm đầu tiên
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team) => (
                            <Card key={team._id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{team.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground">
                                                    {team.memberCount} thành viên
                                                </p>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEdit(team)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Chỉnh sửa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => {
                                                        setSelectedTeam(team);
                                                        setInviteDialogOpen(true);
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Thêm thành viên
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(team._id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Xóa nhóm
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {team.description && (
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            {team.description}
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">Thành viên</p>
                                        <div className="flex flex-wrap gap-2">
                                            {team.members?.slice(0, 5).map((member) => {
                                                const roleConfig = ROLE_CONFIG[member.role];
                                                const Icon = roleConfig.icon;
                                                
                                                return (
                                                    <div
                                                        key={member.userId}
                                                        className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
                                                    >
                                                        <Icon className={cn('h-3 w-3', roleConfig.color)} />
                                                        <span>{member.user?.name || 'Unknown'}</span>
                                                    </div>
                                                );
                                            })}
                                            {team.members && team.members.length > 5 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{team.members.length - 5}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Team Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTeam ? 'Chỉnh sửa nhóm' : 'Tạo nhóm mới'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tên nhóm *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nhập tên nhóm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mô tả</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả về nhóm..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTeam ? 'Cập nhật' : 'Tạo nhóm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite Member Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm thành viên</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Nhập email thành viên"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vai trò</Label>
                            <div className="flex gap-2">
                                {(['admin', 'member', 'viewer'] as const).map((role) => {
                                    const config = ROLE_CONFIG[role];
                                    const Icon = config.icon;
                                    return (
                                        <Button
                                            key={role}
                                            variant={inviteRole === role ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setInviteRole(role)}
                                        >
                                            <Icon className="h-4 w-4 mr-1" />
                                            {config.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleInvite} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Thêm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
