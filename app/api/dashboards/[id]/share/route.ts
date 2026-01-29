import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dashboard from '@/models/Dashboard';
import ShareLink from '@/models/ShareLink';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id]/share - Get all share links for dashboard
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid dashboard ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const dashboard = await Dashboard.findById(id);
        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Only owner or admin can view share links
        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const shareLinks = await ShareLink.find({
            dashboardId: id,
            isActive: true
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            data: shareLinks,
        });
    } catch (error) {
        console.error('Error fetching share links:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch share links' },
            { status: 500 }
        );
    }
}

// POST /api/dashboards/[id]/share - Create new share link
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid dashboard ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const dashboard = await Dashboard.findById(id);
        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Only owner, editors, or admin can create share links
        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const hasEditAccess = dashboard.sharedWith?.some(
            (share) =>
                share.userId.toString() === user._id.toString() &&
                share.permission === 'edit'
        );
        const isAdmin = user.role === 'admin';

        if (!isOwner && !hasEditAccess && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'No permission to share this dashboard' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { permission = 'view', expiresIn, maxViews, type = 'public', allowedDomains } = body;

        // Calculate expiration date
        let expiresAt: Date | undefined;
        if (expiresIn) {
            const now = new Date();
            switch (expiresIn) {
                case '1h': expiresAt = new Date(now.getTime() + 60 * 60 * 1000); break;
                case '1d': expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
                case '7d': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
                case '30d': expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
                case 'never': expiresAt = undefined; break;
            }
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');

        // Generate secret key for JWT type
        const secretKey = type === 'jwt' ? crypto.randomBytes(32).toString('hex') : undefined;

        const shareLink = await ShareLink.create({
            dashboardId: id,
            token,
            type,
            secretKey,
            allowedDomains: allowedDomains || [],
            permission,
            expiresAt,
            maxViews: maxViews || undefined,
            createdBy: user._id,
        });

        // Build the public URL with token
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
        const publicUrl = `${baseUrl}/share/${id}?token=${token}`;

        return NextResponse.json({
            success: true,
            data: {
                ...shareLink.toObject(),
                publicUrl,
            },
            message: 'Share link created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating share link:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create share link' },
            { status: 500 }
        );
    }
}

// DELETE /api/dashboards/[id]/share - Revoke share link
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const linkId = searchParams.get('linkId');

        if (!linkId || !mongoose.Types.ObjectId.isValid(linkId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid link ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const dashboard = await Dashboard.findById(id);
        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Only owner or admin can revoke links
        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'No permission to revoke share links' },
                { status: 403 }
            );
        }

        await ShareLink.findByIdAndUpdate(linkId, { isActive: false });

        return NextResponse.json({
            success: true,
            message: 'Share link revoked successfully',
        });
    } catch (error) {
        console.error('Error revoking share link:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to revoke share link' },
            { status: 500 }
        );
    }
}
