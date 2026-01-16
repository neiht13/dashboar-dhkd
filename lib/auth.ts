import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'VNPT DTP BI-analytics-secret-key-2024'
);

const TOKEN_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    name: string;
}

// Create JWT token
export async function createToken(user: any): Promise<string> {
    const payload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
    };

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(JWT_SECRET);

    return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

// Get current user from request (Native Driver Version)
export async function getCurrentUser(request?: NextRequest): Promise<any | null> {
    try {
        let token: string | undefined;

        if (request) {
            token = request.cookies.get(TOKEN_NAME)?.value;
        } else {
            const cookieStore = await cookies();
            token = cookieStore.get(TOKEN_NAME)?.value;
        }

        if (!token) {
            return null;
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return null;
        }

        const db = await getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });
        return user;
    } catch {
        return null;
    }
}

// Get user from token only (no DB lookup)
export async function getCurrentUserFromToken(request?: NextRequest): Promise<JWTPayload | null> {
    try {
        let token: string | undefined;

        if (request) {
            token = request.cookies.get(TOKEN_NAME)?.value;
        } else {
            const cookieStore = await cookies();
            token = cookieStore.get(TOKEN_NAME)?.value;
        }

        if (!token) {
            return null;
        }

        return await verifyToken(token);
    } catch {
        return null;
    }
}

// Create cookie options
export function getAuthCookieOptions() {
    return {
        name: TOKEN_NAME,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    };
}

// Create response with auth cookie
export function createAuthResponse(data: object, token: string, status = 200): NextResponse {
    const response = NextResponse.json(data, { status });

    response.cookies.set({
        ...getAuthCookieOptions(),
        value: token,
    });

    return response;
}

// Create response that clears auth cookie
export function createLogoutResponse(data: object): NextResponse {
    const response = NextResponse.json(data);

    response.cookies.set({
        name: TOKEN_NAME,
        value: '',
        maxAge: 0,
        path: '/',
    });

    return response;
}

// Check if user has permission
export function hasPermission(
    userRole: string,
    requiredRole: 'admin' | 'editor' | 'viewer'
): boolean {
    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    return (roleHierarchy[userRole as keyof typeof roleHierarchy] || 0) >= roleHierarchy[requiredRole];
}
