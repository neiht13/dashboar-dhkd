import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createToken, createAuthResponse } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST /api/auth/register - Register new user (Native Driver Version)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json(
                { success: false, error: 'Email, mật khẩu và tên là bắt buộc' },
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
        const usersCollection = db.collection('users');
        const emailLower = email.toLowerCase();

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: emailLower });
        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email đã được đăng ký' },
                { status: 409 }
            );
        }

        // Check if this is the first user (make them admin)
        const userCount = await usersCollection.countDocuments();
        const role = userCount === 0 ? 'admin' : 'viewer';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user object
        const newUser = {
            email: emailLower,
            password: hashedPassword,
            name,
            role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Insert user
        const result = await usersCollection.insertOne(newUser);

        // Prepare user for token (without password)
        const userForToken: any = {
            _id: result.insertedId,
            email: emailLower,
            name,
            role,
        };

        // Create JWT token
        const token = await createToken(userForToken);

        // Return response with cookie
        return createAuthResponse({
            success: true,
            data: {
                user: {
                    id: result.insertedId.toString(),
                    email: emailLower,
                    name,
                    role,
                },
            },
            message: role === 'admin'
                ? 'Đăng ký thành công! Bạn là admin đầu tiên.'
                : 'Đăng ký thành công!',
        }, token, 201);
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { success: false, error: 'Đăng ký thất bại. Lỗi máy chủ.' },
            { status: 500 }
        );
    }
}
