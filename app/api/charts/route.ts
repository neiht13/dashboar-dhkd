import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Chart from '@/models/Chart';
import { getCurrentUser } from '@/lib/auth';

// GET /api/charts - Get all charts for current user
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

        const charts = await Chart.find({ ownerId: user._id })
            .sort({ updatedAt: -1 })
            .select('-__v')
            .lean();

        return NextResponse.json({
            success: true,
            data: charts.map((c) => ({
                ...c,
                id: c._id.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching charts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch charts' },
            { status: 500 }
        );
    }
}

// POST /api/charts - Create new chart
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
        const { name, type, dataSource, style } = body;

        if (!name || !type || !dataSource) {
            return NextResponse.json(
                { success: false, error: 'Name, type, and dataSource are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const chart = await Chart.create({
            name,
            type,
            dataSource,
            style: style || {},
            ownerId: user._id,
        });

        return NextResponse.json({
            success: true,
            data: {
                ...chart.toObject(),
                id: chart._id.toString(),
            },
            message: 'Chart created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating chart:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create chart' },
            { status: 500 }
        );
    }
}
