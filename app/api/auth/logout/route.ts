import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createToken, createAuthResponse } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// POST /api/auth/logout - Logout user
export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Đăng xuất thành công!',
    });

    response.cookies.set({
        name: 'auth_token',
        value: '',
        maxAge: 0,
        path: '/',
    });

    return response;
}
