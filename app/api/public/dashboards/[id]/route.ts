import { NextRequest, NextResponse } from 'next/server';
import { getDb, connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Public dashboard endpoint - authentication handled via public flag or share token
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const shareToken = searchParams.get('token');
        const authToken = searchParams.get('auth'); // JWT provided by integrator

        const db = await getDb();
        await connectDB(); // Ensure mongoose connection for types if needed, though we use native mongo driver mostly here

        let dashboard;
        // Try to find by ObjectId first
        if (ObjectId.isValid(id) && id.length === 24) {
            dashboard = await db.collection('dashboards').findOne({ _id: new ObjectId(id) });
        } else {
            dashboard = await db.collection('dashboards').findOne({ id: id });
        }

        if (!dashboard) {
            return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 });
        }

        // --- ACCESS CONTROL AND VALIDATION ---

        let hasAccess = false;
        let viewMode = 'view'; // 'view' or 'edit'

        // 1. Check if publicly accessible
        if (dashboard.isPublic) {
            hasAccess = true;
            viewMode = dashboard.publicPermission || 'view';
        }

        // 2. Check Share Token (if not already accessible)
        if (!hasAccess && shareToken) {
            const ShareLink = (await import('@/models/ShareLink')).default;
            const { verifyShareToken } = await import('@/lib/jwt');

            const shareLink = await ShareLink.findOne({
                token: shareToken,
                dashboardId: dashboard._id,
                isActive: true
            });

            if (shareLink) {
                // Check expiration
                if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
                    return NextResponse.json({ success: false, error: 'Share link expired' }, { status: 403 });
                }

                // Validate based on type
                if (shareLink.type === 'jwt') {
                    if (!authToken) {
                        return NextResponse.json({ success: false, error: 'Authentication token required' }, { status: 401 });
                    }

                    if (!shareLink.secretKey) {
                        return NextResponse.json({ success: false, error: 'Misconfigured share link' }, { status: 500 });
                    }

                    const verification = await verifyShareToken(authToken, shareLink.secretKey);
                    if (!verification.valid) {
                        return NextResponse.json({ success: false, error: 'Invalid authentication token' }, { status: 401 });
                    }

                    // Access Granted via JWT
                    hasAccess = true;
                    viewMode = shareLink.permission;

                    // Optional: You could log access or use payload info here
                    // const userPayload = verification.payload;
                } else {
                    // Type is 'public' (standard share link)
                    hasAccess = true;
                    viewMode = shareLink.permission;
                }

                // Increment view count (async, fire and forget)
                ShareLink.updateOne({ _id: shareLink._id }, { $inc: { viewCount: 1 }, lastAccessedAt: new Date() }).exec();
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        // Return dashboard data (sanitized)
        const dashboardData = {
            ...dashboard,
            id: dashboard._id?.toString() || dashboard.id,
            // Override permission based on access method
            permission: viewMode
        };

        // Remove sensitive fields
        delete (dashboardData as any).userId;
        delete (dashboardData as any).sharedWith;
        delete (dashboardData as any).publicToken;

        return NextResponse.json({
            success: true,
            data: dashboardData,
        });

    } catch (error) {
        console.error('Error fetching public dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard' },
            { status: 500 }
        );
    }
}
