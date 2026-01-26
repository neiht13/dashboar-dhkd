import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Get JWT secret from environment - REQUIRED in production
function getJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;
    
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                'JWT_SECRET or BETTER_AUTH_SECRET environment variable is required in production. ' +
                'Please set it in your environment configuration.'
            );
        }
        // Only allow fallback in development
        console.warn(
            '⚠️  WARNING: JWT_SECRET not set. Using fallback secret. ' +
            'This should NEVER be used in production!'
        );
        return new TextEncoder().encode('DEV-SECRET-ONLY-DO-NOT-USE-IN-PRODUCTION');
    }
    
    // Validate secret length (minimum 32 characters for security)
    if (secret.length < 32) {
        throw new Error(
            'JWT_SECRET must be at least 32 characters long for security. ' +
            `Current length: ${secret.length}`
        );
    }
    
    return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJWTSecret();

const protectedRoutes = [
    '/builder',
    '/charts',
    '/database',
    '/reports',
    '/settings',
];

const publicRoutes = [
    '/login',
    '/public',
];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow API routes (they handle their own auth)
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Allow static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Check if route needs protection
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // For dashboard home page, also protect
    const isDashboardHome = pathname === '/';

    if (isProtectedRoute || isDashboardHome) {
        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        try {
            await jwtVerify(token, JWT_SECRET);
            return NextResponse.next();
        } catch {
            // Invalid token, redirect to login
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('auth_token');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
