import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';
import { getCurrentUserFromToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

// GET - List audit logs (admin only)
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin permission
        const userRole = (user.role || 'viewer') as 'admin' | 'editor' | 'viewer';
        if (!hasPermission(userRole, 'admin:audit')) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');
        const resource = searchParams.get('resource');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build query
        const query: Record<string, unknown> = {};

        if (userId) query.userId = userId;
        if (action) query.action = action;
        if (resource) query.resource = resource;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
            if (endDate) (query.createdAt as Record<string, Date>).$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Get audit log stats (admin only)
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const user = await getCurrentUserFromToken(request);
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (user.role || 'viewer') as 'admin' | 'editor' | 'viewer';
        if (!hasPermission(userRole, 'admin:audit')) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { type } = body;

        if (type === 'stats') {
            // Get stats for last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const [actionStats, resourceStats, dailyStats] = await Promise.all([
                // Actions breakdown
                AuditLog.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: '$action', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]),
                // Resources breakdown
                AuditLog.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: '$resource', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]),
                // Daily activity
                AuditLog.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
            ]);

            return NextResponse.json({
                success: true,
                data: {
                    actionStats,
                    resourceStats,
                    dailyStats,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
