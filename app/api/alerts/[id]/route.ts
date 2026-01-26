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

// GET /api/alerts/[id] - Get single alert
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
                { success: false, error: 'Invalid alert ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await db.collection('dataalerts').findOne({
            _id: new ObjectId(id),
            createdBy: new ObjectId(user.userId),
        });

        if (!alert) {
            return NextResponse.json(
                { success: false, error: 'Alert not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...alert,
                _id: alert._id.toString(),
                dashboardId: alert.dashboardId?.toString(),
                chartId: alert.chartId?.toString(),
                connectionId: alert.connectionId?.toString(),
                createdBy: alert.createdBy?.toString(),
                recipients: {
                    ...alert.recipients,
                    userIds: alert.recipients?.userIds?.map((id: ObjectId) => id.toString()),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching alert:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch alert' },
            { status: 500 }
        );
    }
}

// PUT /api/alerts/[id] - Update alert
export async function PUT(
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
                { success: false, error: 'Invalid alert ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await db.collection('dataalerts').findOne({
            _id: new ObjectId(id),
            createdBy: new ObjectId(user.userId),
        });

        if (!alert) {
            return NextResponse.json(
                { success: false, error: 'Alert not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const {
            name,
            description,
            query,
            conditions,
            conditionLogic,
            frequency,
            channels,
            recipients,
            isActive,
        } = body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (query !== undefined) {
            updateData.query = {
                table: query.table,
                field: query.field,
                aggregation: query.aggregation || 'sum',
                filters: query.filters || [],
            };
        }
        if (conditions !== undefined) {
            updateData.conditions = conditions.map((c: Record<string, unknown>) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                compareWith: c.compareWith || 'fixed',
            }));
        }
        if (conditionLogic !== undefined) updateData.conditionLogic = conditionLogic;
        if (frequency !== undefined) updateData.frequency = frequency;
        if (channels !== undefined) updateData.channels = channels;
        if (recipients !== undefined) {
            updateData.recipients = {
                userIds: recipients.userIds?.map((id: string) => new ObjectId(id)),
                emails: recipients.emails,
                webhookUrl: recipients.webhookUrl,
            };
        }
        if (isActive !== undefined) updateData.isActive = isActive;

        await db.collection('dataalerts').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        return NextResponse.json({
            success: true,
            message: 'Alert updated successfully',
        });
    } catch (error) {
        console.error('Error updating alert:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update alert' },
            { status: 500 }
        );
    }
}

// DELETE /api/alerts/[id] - Delete alert
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
                { success: false, error: 'Invalid alert ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const result = await db.collection('dataalerts').deleteOne({
            _id: new ObjectId(id),
            createdBy: new ObjectId(user.userId),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Alert not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Alert deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting alert:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete alert' },
            { status: 500 }
        );
    }
}

// POST /api/alerts/[id]/test - Test alert trigger
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
                { success: false, error: 'Invalid alert ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await db.collection('dataalerts').findOne({
            _id: new ObjectId(id),
            createdBy: new ObjectId(user.userId),
        });

        if (!alert) {
            return NextResponse.json(
                { success: false, error: 'Alert not found' },
                { status: 404 }
            );
        }

        // Here you would typically:
        // 1. Execute the query
        // 2. Check conditions
        // 3. Return test results

        // For now, return a mock result
        return NextResponse.json({
            success: true,
            data: {
                alertId: id,
                testResult: {
                    currentValue: 12500,
                    conditionsResults: alert.conditions.map((c: Record<string, unknown>) => ({
                        condition: c,
                        met: Math.random() > 0.5,
                    })),
                    wouldTrigger: Math.random() > 0.5,
                },
                message: 'Alert test completed',
            },
        });
    } catch (error) {
        console.error('Error testing alert:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to test alert' },
            { status: 500 }
        );
    }
}
