import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import crypto from 'crypto';
import { checkRateLimit, getClientIP, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limit';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: Request) {
    try {
        // Rate limiting - 3 requests per hour per IP
        const ip = getClientIP(request);
        const rateLimitResult = checkRateLimit(`forgot-password:${ip}`, RATE_LIMITS.passwordReset);
        
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: rateLimitResult.message },
                { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email là bắt buộc' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find user
        const user = await db.collection('users').findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({
                success: true,
                message: 'Nếu email tồn tại, chúng tôi sẽ gửi link đặt lại mật khẩu.',
            });
        }

        // Invalidate existing tokens
        await db.collection('passwordresets').updateMany(
            { userId: user._id, usedAt: null },
            { $set: { expiresAt: new Date() } }
        );

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.collection('passwordresets').insertOne({
            userId: user._id,
            token,
            expiresAt,
            createdAt: new Date(),
        });

        // In production, you would send an email here
        // For development, we'll log the reset URL
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        console.log('Password reset URL:', resetUrl);

        // TODO: Implement email sending
        // await sendEmail({
        //     to: user.email,
        //     subject: 'Đặt lại mật khẩu - VNPT BI',
        //     template: 'password-reset',
        //     data: {
        //         name: user.name,
        //         resetUrl,
        //     },
        // });

        return NextResponse.json({
            success: true,
            message: 'Nếu email tồn tại, chúng tôi sẽ gửi link đặt lại mật khẩu.',
            // Only include token in development
            ...(process.env.NODE_ENV === 'development' && { token }),
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        return NextResponse.json(
            { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
