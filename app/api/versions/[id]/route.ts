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

// GET /api/versions/[id] - Get specific version
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid version ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const version = await db
            .collection('dashboardversions')
            .findOne({ _id: new ObjectId(id) });

        if (!version) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        // Check dashboard ownership
        const dashboard = await db
            .collection('dashboards')
            .findOne({ _id: version.dashboardId });

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Associated dashboard not found' },
                { status: 404 }
            );
        }

        if (dashboard.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...version,
                _id: version._id.toString(),
                dashboardId: version.dashboardId.toString(),
                createdBy: version.createdBy?.toString(),
            },
        });
    } catch (error) {
        console.error('Error fetching version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch version' },
            { status: 500 }
        );
    }
}

// POST /api/versions/[id]/restore - Restore dashboard to this version
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid version ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const version = await db
            .collection('dashboardversions')
            .findOne({ _id: new ObjectId(id) });

        if (!version) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        // Check dashboard ownership
        const dashboard = await db
            .collection('dashboards')
            .findOne({ _id: version.dashboardId });

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Associated dashboard not found' },
                { status: 404 }
            );
        }

        if (dashboard.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // First, create a backup of current state
        const latestVersion = await db
            .collection('dashboardversions')
            .findOne(
                { dashboardId: version.dashboardId },
                { sort: { version: -1 } }
            );

        const backupVersionNumber = (latestVersion?.version || 0) + 1;

        await db.collection('dashboardversions').insertOne({
            dashboardId: version.dashboardId,
            version: backupVersionNumber,
            name: dashboard.name,
            description: dashboard.description,
            widgets: dashboard.widgets || [],
            layout: dashboard.layout || [],
            tabs: dashboard.tabs,
            activeTabId: dashboard.activeTabId,
            createdBy: new ObjectId(user.userId),
            changeDescription: `Backup before restore to v${version.version}`,
            createdAt: new Date(),
        });

        // Restore dashboard to version state
        await db.collection('dashboards').updateOne(
            { _id: version.dashboardId },
            {
                $set: {
                    name: version.name,
                    description: version.description,
                    widgets: version.widgets,
                    layout: version.layout,
                    tabs: version.tabs,
                    activeTabId: version.activeTabId,
                    updatedAt: new Date(),
                },
            }
        );

        return NextResponse.json({
            success: true,
            message: `Dashboard restored to version ${version.version}`,
            data: {
                restoredVersion: version.version,
                backupVersion: backupVersionNumber,
            },
        });
    } catch (error) {
        console.error('Error restoring version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to restore version' },
            { status: 500 }
        );
    }
}

// DELETE /api/versions/[id] - Delete specific version
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid version ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const version = await db
            .collection('dashboardversions')
            .findOne({ _id: new ObjectId(id) });

        if (!version) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        // Check dashboard ownership
        const dashboard = await db
            .collection('dashboards')
            .findOne({ _id: version.dashboardId });

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Associated dashboard not found' },
                { status: 404 }
            );
        }

        if (dashboard.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        await db.collection('dashboardversions').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({
            success: true,
            message: 'Version deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete version' },
            { status: 500 }
        );
    }
}
