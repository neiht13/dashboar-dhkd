import { NextResponse } from 'next/server';
import { getCurrentUserFromToken } from '@/lib/auth';

// GET /api/auth/me - Get current user info from token (Fast version)
export async function GET() {
    try {
        const payload = await getCurrentUserFromToken();

        if (!payload) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated', data: null },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: payload.userId,
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                },
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get user info' },
            { status: 500 }
        );
    }
}
