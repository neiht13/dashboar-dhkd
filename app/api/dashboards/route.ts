import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dashboard from '@/models/Dashboard';
import { getCurrentUser } from '@/lib/auth';

// GET /api/dashboards - Get all dashboards for current user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        // Get dashboards owned by user or shared with user
        // Admins can also see all system dashboards (with slugs)
        const conditions: any[] = [
            { ownerId: user._id },
            { 'sharedWith.userId': user._id },
        ];

        if (user.role === 'admin') {
            conditions.push({ slug: { $exists: true, $ne: null } });
        }

        const dashboards = await Dashboard.find({
            $or: conditions,
        })
            .sort({ updatedAt: -1 })
            .select('-__v')
            .lean();

        return NextResponse.json({
            success: true,
            data: dashboards,
        });
    } catch (error) {
        console.error('Error fetching dashboards:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboards' },
            { status: 500 }
        );
    }
}

// POST /api/dashboards - Create new dashboard
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, widgets = [], layout = [], tags = [], slug } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Dashboard name is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if slug exists if provided
        if (slug) {
            const existing = await Dashboard.findOne({ slug });
            if (existing) {
                return NextResponse.json(
                    { success: false, error: 'Dashboard with this slug already exists' },
                    { status: 400 }
                );
            }
        }

        const dashboard = await Dashboard.create({
            name,
            slug,
            description,
            widgets,
            layout,
            tags,
            ownerId: user._id,
        });

        return NextResponse.json({
            success: true,
            data: dashboard,
            message: 'Dashboard created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create dashboard' },
            { status: 500 }
        );
    }
}
