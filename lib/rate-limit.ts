/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solution
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Custom message when limit exceeded */
    message?: string;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
}

/**
 * Check rate limit for a given identifier (usually IP or user ID)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = {
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    }
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // Create new entry if doesn't exist or expired
    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            success: true,
            remaining: config.max - 1,
            resetTime: now + config.windowMs,
        };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.max) {
        return {
            success: false,
            remaining: 0,
            resetTime: entry.resetTime,
            message: config.message || `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil((entry.resetTime - now) / 1000)} giây.`,
        };
    }

    return {
        success: true,
        remaining: config.max - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    // Auth endpoints - stricter limits
    auth: {
        max: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.',
    },
    // Password reset - very strict
    passwordReset: {
        max: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng đợi 1 giờ.',
    },
    // API endpoints - more lenient
    api: {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
    },
    // Database queries - moderate
    database: {
        max: 50,
        windowMs: 5 * 60 * 1000, // 5 minutes
    },
} as const;

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    
    return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
    return {
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
    };
}
