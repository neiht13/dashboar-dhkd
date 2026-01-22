import mongoose from 'mongoose';
import User from '@/models/User';

/**
 * Query quota configuration per role
 */
export const QUERY_QUOTAS = {
    admin: {
        maxQueriesPerHour: Infinity,
        maxRowsPerQuery: 100000,
        queryTimeout: 120, // seconds
    },
    editor: {
        maxQueriesPerHour: 1000,
        maxRowsPerQuery: 10000,
        queryTimeout: 60,
    },
    viewer: {
        maxQueriesPerHour: 100,
        maxRowsPerQuery: 1000,
        queryTimeout: 30,
    },
} as const;

export type UserRole = 'admin' | 'editor' | 'viewer';

interface QueryQuotaResult {
    allowed: boolean;
    remaining?: number;
    resetAt?: Date;
    message?: string;
}

interface QueryLimitResult {
    maxRows: number;
    timeout: number;
}

/**
 * Check if user has remaining query quota
 */
export async function checkQueryQuota(userId: string): Promise<QueryQuotaResult> {
    try {
        const user = await User.findById(userId).select('role queryCount');

        if (!user) {
            return { allowed: false, message: 'User not found' };
        }

        const role = (user.role || 'viewer') as UserRole;
        const quota = QUERY_QUOTAS[role];

        // Admin has unlimited queries
        if (quota.maxQueriesPerHour === Infinity) {
            return { allowed: true, remaining: Infinity };
        }

        // Check query count
        const queryCount = (user as any).queryCount || { hour: 0, lastReset: new Date() };
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Reset counter if more than an hour has passed
        if (queryCount.lastReset < hourAgo) {
            await User.updateOne(
                { _id: userId },
                { $set: { 'queryCount.hour': 0, 'queryCount.lastReset': now } }
            );
            return {
                allowed: true,
                remaining: quota.maxQueriesPerHour,
                resetAt: new Date(now.getTime() + 60 * 60 * 1000),
            };
        }

        // Check if quota exceeded
        if (queryCount.hour >= quota.maxQueriesPerHour) {
            const resetAt = new Date(queryCount.lastReset.getTime() + 60 * 60 * 1000);
            return {
                allowed: false,
                remaining: 0,
                resetAt,
                message: `Đã hết quota query. Thử lại sau ${Math.ceil((resetAt.getTime() - now.getTime()) / 60000)} phút.`,
            };
        }

        return {
            allowed: true,
            remaining: quota.maxQueriesPerHour - queryCount.hour,
            resetAt: new Date(queryCount.lastReset.getTime() + 60 * 60 * 1000),
        };
    } catch (error) {
        console.error('Error checking query quota:', error);
        // Allow on error to not block users
        return { allowed: true };
    }
}

/**
 * Increment query count for user
 */
export async function incrementQueryCount(userId: string): Promise<void> {
    try {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Try to increment or reset if expired
        const result = await User.updateOne(
            {
                _id: userId,
                'queryCount.lastReset': { $gte: hourAgo },
            },
            { $inc: { 'queryCount.hour': 1 } }
        );

        // If no document updated, reset the counter
        if (result.modifiedCount === 0) {
            await User.updateOne(
                { _id: userId },
                {
                    $set: {
                        'queryCount.hour': 1,
                        'queryCount.lastReset': now,
                    },
                },
                { upsert: true }
            );
        }
    } catch (error) {
        console.error('Error incrementing query count:', error);
    }
}

/**
 * Get query limits for user
 */
export async function getQueryLimits(userId: string): Promise<QueryLimitResult> {
    try {
        const user = await User.findById(userId).select('role');
        const role = (user?.role || 'viewer') as UserRole;
        const quota = QUERY_QUOTAS[role];

        return {
            maxRows: quota.maxRowsPerQuery,
            timeout: quota.queryTimeout,
        };
    } catch (error) {
        console.error('Error getting query limits:', error);
        // Return most restrictive limits on error
        return {
            maxRows: QUERY_QUOTAS.viewer.maxRowsPerQuery,
            timeout: QUERY_QUOTAS.viewer.queryTimeout,
        };
    }
}

/**
 * Apply row limit to SQL query
 */
export function applyRowLimit(query: string, maxRows: number): string {
    const upperQuery = query.toUpperCase().trim();

    // Check if query already has TOP (SQL Server) or LIMIT (MySQL/PostgreSQL)
    if (upperQuery.includes(' TOP ') || upperQuery.includes('LIMIT ')) {
        return query;
    }

    // For SQL Server, add TOP after SELECT
    if (upperQuery.startsWith('SELECT')) {
        return query.replace(/^SELECT/i, `SELECT TOP ${maxRows}`);
    }

    return query;
}

/**
 * Get quota status for display
 */
export async function getQuotaStatus(userId: string): Promise<{
    role: UserRole;
    queriesUsed: number;
    queriesLimit: number;
    rowLimit: number;
    timeoutSeconds: number;
    resetAt?: Date;
}> {
    const user = await User.findById(userId).select('role queryCount');
    const role = (user?.role || 'viewer') as UserRole;
    const quota = QUERY_QUOTAS[role];
    const queryCount = (user as any)?.queryCount || { hour: 0, lastReset: new Date() };

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const isReset = queryCount.lastReset < hourAgo;

    return {
        role,
        queriesUsed: isReset ? 0 : queryCount.hour,
        queriesLimit: quota.maxQueriesPerHour === Infinity ? -1 : quota.maxQueriesPerHour,
        rowLimit: quota.maxRowsPerQuery,
        timeoutSeconds: quota.queryTimeout,
        resetAt: isReset
            ? new Date(now.getTime() + 60 * 60 * 1000)
            : new Date(queryCount.lastReset.getTime() + 60 * 60 * 1000),
    };
}
