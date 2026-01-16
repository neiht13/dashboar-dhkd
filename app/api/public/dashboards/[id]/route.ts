import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Public dashboard endpoint - no authentication required
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();

        let dashboard;

        // Try to find by ObjectId first
        if (ObjectId.isValid(id) && id.length === 24) {
            dashboard = await db.collection('dashboards').findOne(
                { _id: new ObjectId(id) },
                { projection: { userId: 0 } } // Exclude sensitive fields
            );
        }

        // If not found, try to find by custom id field
        if (!dashboard) {
            dashboard = await db.collection('dashboards').findOne(
                { id: id },
                { projection: { userId: 0 } }
            );
        }

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...dashboard,
                id: dashboard._id?.toString() || dashboard.id,
            },
        });
    } catch (error) {
        console.error('Error fetching public dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard' },
            { status: 500 }
        );
    }
}
