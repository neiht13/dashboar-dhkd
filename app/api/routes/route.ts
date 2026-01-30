import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Route from '@/models/Route'; // Updated Model
import { getCurrentUser } from '@/lib/auth';

// GET /api/routes - Get all System Routes
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        await connectDB();

        const routes = await Route.find({}) // Fetch all from routes collection
            .sort({ updatedAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: routes,
        });
    } catch (error) {
        console.error('Error fetching routes:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch routes' },
            { status: 500 }
        );
    }
}

// POST /api/routes - Create a new System Route
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, slug } = body;

        if (!name || !slug) {
            return NextResponse.json(
                { success: false, error: 'Name and Slug are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if slug exists in Routes collection
        const existing = await Route.findOne({ slug });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Route with this slug already exists' },
                { status: 400 }
            );
        }

        const newRoute = await Route.create({
            name,
            slug,
            description: `System Route for ${slug}`,
            tags: ["system"],
            ownerId: user._id,
            isPublic: false
        });

        return NextResponse.json({
            success: true,
            data: newRoute,
            message: 'Route created successfully',
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating route:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create route' },
            { status: 500 }
        );
    }
}
