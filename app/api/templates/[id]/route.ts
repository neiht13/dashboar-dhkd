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

// GET /api/templates/[id] - Get single template
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const user = await getUserFromToken(request);
        const db = await getDb();

        const template = await db
            .collection('dashboardtemplates')
            .findOne({ _id: new ObjectId(id) });

        if (!template) {
            return NextResponse.json(
                { success: false, error: 'Template not found' },
                { status: 404 }
            );
        }

        // Check access rights
        if (!template.isPublic && template.createdBy?.toString() !== user?.userId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...template,
                _id: template._id.toString(),
                createdBy: template.createdBy?.toString(),
            },
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch template' },
            { status: 500 }
        );
    }
}

// PUT /api/templates/[id] - Update template
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
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const template = await db
            .collection('dashboardtemplates')
            .findOne({ _id: new ObjectId(id) });

        if (!template) {
            return NextResponse.json(
                { success: false, error: 'Template not found' },
                { status: 404 }
            );
        }

        // Only owner or admin can update
        if (template.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, category, widgets, layout, isPublic, tags, thumbnail } = body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (widgets !== undefined) updateData.widgets = widgets;
        if (layout !== undefined) updateData.layout = layout;
        if (isPublic !== undefined) updateData.isPublic = isPublic;
        if (tags !== undefined) updateData.tags = tags;
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

        await db
            .collection('dashboardtemplates')
            .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        return NextResponse.json({
            success: true,
            message: 'Template updated successfully',
        });
    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update template' },
            { status: 500 }
        );
    }
}

// DELETE /api/templates/[id] - Delete template
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
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const template = await db
            .collection('dashboardtemplates')
            .findOne({ _id: new ObjectId(id) });

        if (!template) {
            return NextResponse.json(
                { success: false, error: 'Template not found' },
                { status: 404 }
            );
        }

        // Only owner or admin can delete
        if (template.createdBy?.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Don't allow deleting default templates
        if (template.isDefault) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete default templates' },
                { status: 400 }
            );
        }

        await db.collection('dashboardtemplates').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({
            success: true,
            message: 'Template deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete template' },
            { status: 500 }
        );
    }
}

// POST /api/templates/[id]/use - Use template to create dashboard
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
                { success: false, error: 'Invalid template ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const template = await db
            .collection('dashboardtemplates')
            .findOne({ _id: new ObjectId(id) });

        if (!template) {
            return NextResponse.json(
                { success: false, error: 'Template not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, connectionId } = body;

        // Create new dashboard from template
        const dashboard = {
            name: name || `${template.name} - Copy`,
            description: template.description,
            widgets: template.widgets.map((w: Record<string, unknown>) => ({
                ...w,
                id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            })),
            layout: template.layout,
            connectionId: connectionId ? new ObjectId(connectionId) : null,
            createdBy: new ObjectId(user.userId),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('dashboards').insertOne(dashboard);

        // Increment template usage count
        await db
            .collection('dashboardtemplates')
            .updateOne({ _id: new ObjectId(id) }, { $inc: { usageCount: 1 } });

        return NextResponse.json({
            success: true,
            data: {
                dashboardId: result.insertedId.toString(),
            },
        });
    } catch (error) {
        console.error('Error using template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create dashboard from template' },
            { status: 500 }
        );
    }
}
