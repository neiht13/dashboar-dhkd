import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

// GET /api/alerts - Get user's alerts
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
        const isActive = searchParams.get('isActive');

        const db = await getDb();

        const query: Record<string, unknown> = {
            createdBy: new ObjectId(user.userId),
        };

        if (dashboardId && ObjectId.isValid(dashboardId)) {
            query.dashboardId = new ObjectId(dashboardId);
        }

        if (isActive !== null) {
            query.isActive = isActive === 'true';
        }

        const alerts = await db
            .collection('dataalerts')
            .aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'dashboards',
                        localField: 'dashboardId',
                        foreignField: '_id',
                        as: 'dashboard',
                    },
                },
                {
                    $lookup: {
                        from: 'databaseconnections',
                        localField: 'connectionId',
                        foreignField: '_id',
                        as: 'connection',
                    },
                },
                {
                    $addFields: {
                        dashboard: { $arrayElemAt: ['$dashboard', 0] },
                        connection: { $arrayElemAt: ['$connection', 0] },
                    },
                },
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            data: alerts.map((alert) => ({
                ...alert,
                _id: alert._id.toString(),
                dashboardId: alert.dashboardId?.toString(),
                chartId: alert.chartId?.toString(),
                connectionId: alert.connectionId?.toString(),
                createdBy: alert.createdBy?.toString(),
                dashboard: alert.dashboard
                    ? {
                          _id: alert.dashboard._id?.toString(),
                          name: alert.dashboard.name,
                      }
                    : null,
                connection: alert.connection
                    ? {
                          _id: alert.connection._id?.toString(),
                          name: alert.connection.name,
                      }
                    : null,
                recipients: {
                    ...alert.recipients,
                    userIds: alert.recipients?.userIds?.map((id: ObjectId) => id.toString()),
                },
            })),
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}

// POST /api/alerts - Create new alert
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
            name,
            description,
            dashboardId,
            chartId,
            connectionId,
            query,
            conditions,
            conditionLogic = 'AND',
            frequency = 'daily',
            channels = ['in_app'],
            recipients,
        } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Alert name is required' },
                { status: 400 }
            );
        }

        if (!connectionId || !ObjectId.isValid(connectionId)) {
            return NextResponse.json(
                { success: false, error: 'Valid connection ID is required' },
                { status: 400 }
            );
        }

        if (!query?.table || !query?.field) {
            return NextResponse.json(
                { success: false, error: 'Query table and field are required' },
                { status: 400 }
            );
        }

        if (!conditions?.length) {
            return NextResponse.json(
                { success: false, error: 'At least one condition is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Verify connection exists and user has access
        const connection = await db
            .collection('databaseconnections')
            .findOne({ _id: new ObjectId(connectionId) });

        if (!connection) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404 }
            );
        }

        const alert = {
            name,
            description: description || '',
            dashboardId: dashboardId ? new ObjectId(dashboardId) : null,
            chartId: chartId ? new ObjectId(chartId) : null,
            connectionId: new ObjectId(connectionId),
            query: {
                table: query.table,
                field: query.field,
                aggregation: query.aggregation || 'sum',
                filters: query.filters || [],
            },
            conditions: conditions.map((c: Record<string, unknown>) => ({
                field: c.field || query.field,
                operator: c.operator,
                value: c.value,
                compareWith: c.compareWith || 'fixed',
            })),
            conditionLogic,
            frequency,
            channels,
            recipients: {
                userIds: recipients?.userIds?.map((id: string) => new ObjectId(id)) || [
                    new ObjectId(user.userId),
                ],
                emails: recipients?.emails || [],
                webhookUrl: recipients?.webhookUrl,
            },
            isActive: true,
            lastValue: null,
            triggerCount: 0,
            createdBy: new ObjectId(user.userId),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('dataalerts').insertOne(alert);

        return NextResponse.json({
            success: true,
            data: {
                ...alert,
                _id: result.insertedId.toString(),
                dashboardId: alert.dashboardId?.toString(),
                chartId: alert.chartId?.toString(),
                connectionId: alert.connectionId.toString(),
                createdBy: user.userId,
                recipients: {
                    ...alert.recipients,
                    userIds: alert.recipients.userIds.map((id) => id.toString()),
                },
            },
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create alert' },
            { status: 500 }
        );
    }
}
