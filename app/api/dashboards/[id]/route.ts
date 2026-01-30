import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dashboard from '@/models/Dashboard';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import mongoose from 'mongoose';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id] - Get dashboard by ID
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

        let query: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { slug: id };
        }

        await connectDB();

        const dashboard = await Dashboard.findOne(query).lean();

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Check access permission
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const isShared = dashboard.sharedWith?.some(
            (share) => share.userId.toString() === user._id.toString()
        );
        const isAdmin = user.role === 'admin';

        // Check public token
        const isTokenValid = token && dashboard.publicToken === token;

        if (!isOwner && !isShared && !isAdmin && !isTokenValid) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard' },
            { status: 500 }
        );
    }
}

// PUT /api/dashboards/[id] - Update dashboard
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let query: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { slug: id };
        }

        await connectDB();

        const dashboard = await Dashboard.findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Check edit permission
        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const hasEditAccess = dashboard.sharedWith?.some(
            (share) =>
                share.userId.toString() === user._id.toString() &&
                share.permission === 'edit'
        );
        const isAdmin = user.role === 'admin';

        if (!isOwner && !hasEditAccess && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'No permission to edit this dashboard' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, widgets, layout, tags, isPublic, tabs, activeTabId } = body;

        // Update fields
        if (name !== undefined) dashboard.name = name;
        if (description !== undefined) dashboard.description = description;
        if (widgets !== undefined) dashboard.widgets = widgets;
        if (layout !== undefined) dashboard.layout = layout;
        if (tags !== undefined) dashboard.tags = tags;
        if (tabs !== undefined) dashboard.tabs = tabs;
        if (activeTabId !== undefined) dashboard.activeTabId = activeTabId;
        if (isPublic !== undefined && (isOwner || isAdmin)) {
            dashboard.isPublic = isPublic;
        }

        await dashboard.save();

        return NextResponse.json({
            success: true,
            data: dashboard,
            message: 'Dashboard updated successfully',
        });
    } catch (error) {
        console.error('Error updating dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update dashboard' },
            { status: 500 }
        );
    }
}

// DELETE /api/dashboards/[id] - Delete dashboard
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

        let query: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { slug: id };
        }

        await connectDB();

        const dashboard = await Dashboard.findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Only owner or admin can delete
        const isOwner = dashboard.ownerId.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'No permission to delete this dashboard' },
                { status: 403 }
            );
        }

        await Dashboard.deleteOne(query);

        return NextResponse.json({
            success: true,
            message: 'Dashboard deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete dashboard' },
            { status: 500 }
        );
    }
}
