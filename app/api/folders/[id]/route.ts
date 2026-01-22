import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Folder from '@/models/Folder';
import Dashboard from '@/models/Dashboard';
import { getCurrentUserFromToken } from '@/lib/auth';

// GET - Get folder by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const folder = await Folder.findOne({
            _id: params.id,
            ownerId: user.userId,
        }).lean();

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: folder,
        });
    } catch (error) {
        console.error('Error fetching folder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update folder
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, color, icon, parentId, order } = body;

        const folder = await Folder.findOneAndUpdate(
            { _id: params.id, ownerId: user.userId },
            {
                $set: {
                    ...(name && { name: name.trim() }),
                    ...(description !== undefined && { description }),
                    ...(color && { color }),
                    ...(icon && { icon }),
                    ...(parentId !== undefined && { parentId }),
                    ...(order !== undefined && { order }),
                },
            },
            { new: true }
        );

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: folder,
        });
    } catch (error) {
        console.error('Error updating folder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete folder
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if folder exists and belongs to user
        const folder = await Folder.findOne({
            _id: params.id,
            ownerId: user.userId,
        });

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Move child folders to parent
        await Folder.updateMany(
            { parentId: params.id },
            { $set: { parentId: folder.parentId } }
        );

        // Remove folder reference from dashboards
        await Dashboard.updateMany(
            { folderId: params.id },
            { $unset: { folderId: 1 } }
        );

        // Delete folder
        await Folder.deleteOne({ _id: params.id });

        return NextResponse.json({
            success: true,
            message: 'Folder deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting folder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
