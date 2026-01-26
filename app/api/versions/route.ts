import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

// GET /api/versions?dashboardId=xxx - Get version history for a dashboard
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const dashboardId = searchParams.get('dashboardId');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!dashboardId || !ObjectId.isValid(dashboardId)) {
            return NextResponse.json(
                { success: false, error: 'Valid dashboard ID is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Check dashboard ownership
        const dashboard = await db
            .collection('dashboards')
            .findOne({ _id: new ObjectId(dashboardId) });

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        if (dashboard.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const versions = await db
            .collection('dashboardversions')
            .find({ dashboardId: new ObjectId(dashboardId) })
            .sort({ version: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        const total = await db
            .collection('dashboardversions')
            .countDocuments({ dashboardId: new ObjectId(dashboardId) });

        return NextResponse.json({
            success: true,
            data: versions.map((v) => ({
                ...v,
                _id: v._id.toString(),
                dashboardId: v.dashboardId.toString(),
                createdBy: v.createdBy?.toString(),
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + versions.length < total,
            },
        });
    } catch (error) {
        console.error('Error fetching versions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch versions' },
            { status: 500 }
        );
    }
}

// POST /api/versions - Create new version snapshot
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { dashboardId, changeDescription } = body;

        if (!dashboardId || !ObjectId.isValid(dashboardId)) {
            return NextResponse.json(
                { success: false, error: 'Valid dashboard ID is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Get current dashboard state
        const dashboard = await db
            .collection('dashboards')
            .findOne({ _id: new ObjectId(dashboardId) });

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (dashboard.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get latest version number
        const latestVersion = await db
            .collection('dashboardversions')
            .findOne(
                { dashboardId: new ObjectId(dashboardId) },
                { sort: { version: -1 } }
            );

        const newVersionNumber = (latestVersion?.version || 0) + 1;

        // Create version snapshot
        const version = {
            dashboardId: new ObjectId(dashboardId),
            version: newVersionNumber,
            name: dashboard.name,
            description: dashboard.description,
            widgets: dashboard.widgets || [],
            layout: dashboard.layout || [],
            tabs: dashboard.tabs,
            activeTabId: dashboard.activeTabId,
            createdBy: new ObjectId(user.userId),
            changeDescription: changeDescription || `Version ${newVersionNumber}`,
            createdAt: new Date(),
        };

        const result = await db.collection('dashboardversions').insertOne(version);

        // Cleanup old versions (keep last 50)
        const versionsToDelete = await db
            .collection('dashboardversions')
            .find({ dashboardId: new ObjectId(dashboardId) })
            .sort({ version: -1 })
            .skip(50)
            .project({ _id: 1 })
            .toArray();

        if (versionsToDelete.length > 0) {
            await db.collection('dashboardversions').deleteMany({
                _id: { $in: versionsToDelete.map((v) => v._id) },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                _id: result.insertedId.toString(),
                version: newVersionNumber,
            },
        });
    } catch (error) {
        console.error('Error creating version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create version' },
            { status: 500 }
        );
    }
}
