import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Dataset from '@/models/Dataset';
import { getCurrentUser } from '@/lib/auth';

// GET /api/datasets/:id - Get single dataset
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        await connectDB();

        const dataset = await Dataset.findOne({
            _id: id,
            ownerId: user._id,
        }).lean();

        if (!dataset) {
            return NextResponse.json(
                { success: false, error: 'Dataset not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...dataset,
                id: dataset._id.toString(),
            },
        });
    } catch (error) {
        console.error('Error fetching dataset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dataset' },
            { status: 500 }
        );
    }
}

// PUT /api/datasets/:id - Update dataset
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();

        await connectDB();

        const dataset = await Dataset.findOneAndUpdate(
            { _id: id, ownerId: user._id },
            { $set: body },
            { new: true, runValidators: true }
        ).lean();

        if (!dataset) {
            return NextResponse.json(
                { success: false, error: 'Dataset not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...dataset,
                id: dataset._id.toString(),
            },
            message: 'Dataset updated successfully',
        });
    } catch (error) {
        console.error('Error updating dataset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update dataset' },
            { status: 500 }
        );
    }
}

// DELETE /api/datasets/:id - Delete dataset
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        await connectDB();

        const dataset = await Dataset.findOneAndDelete({
            _id: id,
            ownerId: user._id,
        });

        if (!dataset) {
            return NextResponse.json(
                { success: false, error: 'Dataset not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Dataset deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting dataset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete dataset' },
            { status: 500 }
        );
    }
}
