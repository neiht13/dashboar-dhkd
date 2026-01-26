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

// GET /api/activity - Get activity logs
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
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');
        const resourceType = searchParams.get('resourceType');
        const resourceId = searchParams.get('resourceId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const db = await getDb();

        // Build query
        const query: Record<string, unknown> = {};

        // Non-admin users can only see their own logs
        if (user.role !== 'admin') {
            query.userId = new ObjectId(user.userId);
        } else if (userId && ObjectId.isValid(userId)) {
            query.userId = new ObjectId(userId);
        }

        if (action) {
            query.action = action;
        }

        if (resourceType) {
            query.resourceType = resourceType;
        }

        if (resourceId && ObjectId.isValid(resourceId)) {
            query.resourceId = new ObjectId(resourceId);
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
            }
            if (endDate) {
                (query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
            }
        }

        const logs = await db
            .collection('activitylogs')
            .aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $skip: offset },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                {
                    $addFields: {
                        user: { $arrayElemAt: ['$user', 0] },
                    },
                },
                {
                    $project: {
                        'user.password': 0,
                    },
                },
            ])
            .toArray();

        const total = await db.collection('activitylogs').countDocuments(query);

        return NextResponse.json({
            success: true,
            data: logs.map((log) => ({
                ...log,
                _id: log._id.toString(),
                userId: log.userId?.toString(),
                resourceId: log.resourceId?.toString(),
                user: log.user
                    ? {
                        _id: log.user._id?.toString(),
                        name: log.user.name,
                        email: log.user.email,
                    }
                    : null,
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + logs.length < total,
            },
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch activity logs' },
            { status: 500 }
        );
    }
}

// POST /api/activity - Log an activity (internal use)
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
        const {
            action,
            resourceType,
            resourceId,
            resourceName,
            details,
            status = 'success',
            errorMessage,
        } = body;

        if (!action) {
            return NextResponse.json(
                { success: false, error: 'Action is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        const log = {
            userId: new ObjectId(user.userId),
            action,
            resourceType,
            resourceId: resourceId ? new ObjectId(resourceId) : undefined,
            resourceName,
            details,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent'),
            status,
            errorMessage,
            createdAt: new Date(),
        };

        const result = await db.collection('activitylogs').insertOne(log);

        return NextResponse.json({
            success: true,
            data: {
                _id: result.insertedId.toString(),
            },
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to log activity' },
            { status: 500 }
        );
    }
}

// Helper function to log activity (for server-side use)
export async function logActivity({
    userId,
    action,
    resourceType,
    resourceId,
    resourceName,
    details,
    ipAddress,
    userAgent,
    status = 'success',
    errorMessage,
}: {
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
    errorMessage?: string;
}) {
    try {
        const db = await getDb();

        await db.collection('activitylogs').insertOne({
            userId: new ObjectId(userId),
            action,
            resourceType,
            resourceId: resourceId ? new ObjectId(resourceId) : undefined,
            resourceName,
            details,
            ipAddress,
            userAgent,
            status,
            errorMessage,
            createdAt: new Date(),
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}
