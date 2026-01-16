import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Chart from '@/models/Chart';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/charts/[id] - Get chart by ID
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid chart ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const chart = await Chart.findById(id).lean();

        if (!chart) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (chart.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...chart,
                id: chart._id.toString(),
            },
        });
    } catch (error) {
        console.error('Error fetching chart:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch chart' },
            { status: 500 }
        );
    }
}

// PUT /api/charts/[id] - Update chart
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid chart ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const chart = await Chart.findById(id);

        if (!chart) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (chart.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'No permission to edit this chart' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, type, dataSource, style } = body;

        if (name !== undefined) chart.name = name;
        if (type !== undefined) chart.type = type;
        if (dataSource !== undefined) chart.dataSource = dataSource;
        if (style !== undefined) chart.style = style;

        await chart.save();

        return NextResponse.json({
            success: true,
            data: {
                ...chart.toObject(),
                id: chart._id.toString(),
            },
            message: 'Chart updated successfully',
        });
    } catch (error) {
        console.error('Error updating chart:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update chart' },
            { status: 500 }
        );
    }
}

// DELETE /api/charts/[id] - Delete chart
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid chart ID' },
                { status: 400 }
            );
        }

        await connectDB();

        const chart = await Chart.findById(id);

        if (!chart) {
            return NextResponse.json(
                { success: false, error: 'Chart not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (chart.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'No permission to delete this chart' },
                { status: 403 }
            );
        }

        await Chart.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Chart deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting chart:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete chart' },
            { status: 500 }
        );
    }
}
