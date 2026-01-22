import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createToken, createAuthResponse } from '@/lib/auth';
import { checkRateLimit, getClientIP, createRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

// POST /api/auth/login - Login user (Native Driver Version)
export async function POST(request: Request) {
    try {
        // Rate limiting check
        const clientIP = getClientIP(request);
        const rateLimitResult = checkRateLimit(`login:${clientIP}`, RATE_LIMITS.auth);
        
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: rateLimitResult.message },
                { 
                    status: 429,
                    headers: createRateLimitHeaders(rateLimitResult)
                }
            );
        }

        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email và mật khẩu là bắt buộc' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const usersCollection = db.collection('users');
        const emailLower = email.toLowerCase();

        // Find user
        const user = await usersCollection.findOne({ email: emailLower });
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Email hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        // Check if user is active
        if (user.isActive === false) {
            return NextResponse.json(
                { success: false, error: 'Tài khoản đã bị vô hiệu hóa' },
                { status: 403 }
            );
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json(
                { success: false, error: 'Email hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        // Update last login
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date(), updatedAt: new Date() } }
        );

        // Create JWT token
        // We cast user to any to fit createToken signature meant for Mongoose IUser
        const tokenToken = await createToken(user as any);

        // Return response with cookie
        return createAuthResponse({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                },
            },
            message: 'Đăng nhập thành công!',
        }, tokenToken);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Đăng nhập thất bại. Lỗi máy chủ.' },
            { status: 500 }
        );
    }
}
