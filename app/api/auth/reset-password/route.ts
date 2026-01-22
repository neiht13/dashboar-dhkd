import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { checkRateLimit, getClientIP, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limit';

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: Request) {
    try {
        // Rate limiting - strict for password reset
        const ip = getClientIP(request);
        const rateLimitResult = checkRateLimit(`reset-password:${ip}`, RATE_LIMITS.passwordReset);
        
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: rateLimitResult.message },
                { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { token, password } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token là bắt buộc' },
                { status: 400 }
            );
        }

        if (!password) {
            return NextResponse.json(
                { success: false, error: 'Mật khẩu mới là bắt buộc' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find valid reset token
        const resetRequest = await db.collection('passwordresets').findOne({
            token,
            expiresAt: { $gt: new Date() },
            usedAt: null,
        });

        if (!resetRequest) {
            return NextResponse.json(
                { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' },
                { status: 400 }
            );
        }

        // Mark token as used
        await db.collection('passwordresets').updateOne(
            { _id: resetRequest._id },
            { $set: { usedAt: new Date() } }
        );

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user password
        await db.collection('users').updateOne(
            { _id: new ObjectId(resetRequest.userId) },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
            }
        );

        // Log activity
        await db.collection('activitylogs').insertOne({
            userId: new ObjectId(resetRequest.userId),
            action: 'password_reset',
            resourceType: 'user',
            resourceId: new ObjectId(resetRequest.userId),
            details: { method: 'email_token' },
            ipAddress: ip,
            userAgent: request.headers.get('user-agent'),
            status: 'success',
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}

// GET /api/auth/reset-password - Verify reset token
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token là bắt buộc' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find valid reset token
        const resetRequest = await db.collection('passwordresets').findOne({
            token,
            expiresAt: { $gt: new Date() },
            usedAt: null,
        });

        if (!resetRequest) {
            return NextResponse.json(
                { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Token hợp lệ',
        });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        return NextResponse.json(
            { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
