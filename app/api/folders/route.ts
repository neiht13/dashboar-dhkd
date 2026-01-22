import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Folder from '@/models/Folder';
import { getCurrentUserFromToken } from '@/lib/auth';

// GET - List folders for current user
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parentId = searchParams.get('parentId');

        const query: Record<string, unknown> = {
            ownerId: user.userId,
        };

        if (parentId) {
            query.parentId = parentId;
        } else if (parentId === null || parentId === '') {
            query.parentId = null;  // Root folders only
        }

        const folders = await Folder.find(query)
            .sort({ order: 1, name: 1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: folders,
        });
    } catch (error) {
        console.error('Error fetching folders:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, parentId, color, icon } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Get max order for positioning
        const maxOrderFolder = await Folder.findOne({
            ownerId: user.userId,
            parentId: parentId || null,
        }).sort({ order: -1 });

        const folder = await Folder.create({
            name: name.trim(),
            description,
            parentId: parentId || null,
            ownerId: user.userId,
            color: color || '#6366f1',
            icon: icon || 'folder',
            order: (maxOrderFolder?.order || 0) + 1,
        });

        return NextResponse.json({
            success: true,
            data: folder,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating folder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
