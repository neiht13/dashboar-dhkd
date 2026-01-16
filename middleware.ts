import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'default-secret-change-in-production'
);

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

export async function middleware(request: NextRequest) {
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
