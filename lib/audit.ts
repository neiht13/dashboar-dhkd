import mongoose from 'mongoose';
import AuditLog, { AuditAction, AuditResource } from '@/models/AuditLog';

interface AuditLogParams {
    userId: string | mongoose.Types.ObjectId;
    userName?: string;
    userEmail?: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string | mongoose.Types.ObjectId;
    resourceName?: string;
    details?: Record<string, unknown>;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
}

/**
 * Log an action to the audit log
 */
export async function logAction(params: AuditLogParams): Promise<void> {
    try {
        await AuditLog.create({
            userId: new mongoose.Types.ObjectId(params.userId.toString()),
            userName: params.userName,
            userEmail: params.userEmail,
            action: params.action,
            resource: params.resource,
            resourceId: params.resourceId
                ? new mongoose.Types.ObjectId(params.resourceId.toString())
                : undefined,
            resourceName: params.resourceName,
            details: params.details,
            changes: params.changes,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            duration: params.duration,
            success: params.success ?? true,
            errorMessage: params.errorMessage,
        });
    } catch (error) {
        // Don't throw - audit logging should not break the main flow
        console.error('Failed to create audit log:', error);
    }
}

/**
 * Log a view action
 */
export async function logView(
    userId: string,
    resource: AuditResource,
    resourceId: string,
    resourceName?: string,
    userInfo?: { name?: string; email?: string; ip?: string; userAgent?: string }
): Promise<void> {
    await logAction({
        userId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        action: 'view',
        resource,
        resourceId,
        resourceName,
        ipAddress: userInfo?.ip,
        userAgent: userInfo?.userAgent,
    });
}

/**
 * Log a create action
 */
export async function logCreate(
    userId: string,
    resource: AuditResource,
    resourceId: string,
    resourceName?: string,
    details?: Record<string, unknown>,
    userInfo?: { name?: string; email?: string; ip?: string; userAgent?: string }
): Promise<void> {
    await logAction({
        userId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        action: 'create',
        resource,
        resourceId,
        resourceName,
        details,
        ipAddress: userInfo?.ip,
        userAgent: userInfo?.userAgent,
    });
}

/**
 * Log an update action with before/after changes
 */
export async function logUpdate(
    userId: string,
    resource: AuditResource,
    resourceId: string,
    resourceName?: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    userInfo?: { name?: string; email?: string; ip?: string; userAgent?: string }
): Promise<void> {
    await logAction({
        userId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        action: 'update',
        resource,
        resourceId,
        resourceName,
        changes,
        ipAddress: userInfo?.ip,
        userAgent: userInfo?.userAgent,
    });
}

/**
 * Log a delete action
 */
export async function logDelete(
    userId: string,
    resource: AuditResource,
    resourceId: string,
    resourceName?: string,
    userInfo?: { name?: string; email?: string; ip?: string; userAgent?: string }
): Promise<void> {
    await logAction({
        userId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        action: 'delete',
        resource,
        resourceId,
        resourceName,
        ipAddress: userInfo?.ip,
        userAgent: userInfo?.userAgent,
    });
}

/**
 * Log a query action with duration
 */
export async function logQuery(
    userId: string,
    resourceId: string,
    resourceName: string,
    duration: number,
    success: boolean = true,
    errorMessage?: string,
    userInfo?: { name?: string; email?: string; ip?: string; userAgent?: string }
): Promise<void> {
    await logAction({
        userId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        action: 'query',
        resource: 'connection',
        resourceId,
        resourceName,
        duration,
        success,
        errorMessage,
        ipAddress: userInfo?.ip,
        userAgent: userInfo?.userAgent,
    });
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
    userId: string,
    limit: number = 50
): Promise<unknown[]> {
    return AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

/**
 * Get resource history
 */
export async function getResourceHistory(
    resource: AuditResource,
    resourceId: string,
    limit: number = 100
): Promise<unknown[]> {
    return AuditLog.find({ resource, resourceId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

/**
 * Get audit logs with filters (for admin)
 */
export async function getAuditLogs(filters: {
    userId?: string;
    action?: AuditAction | AuditAction[];
    resource?: AuditResource | AuditResource[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
}): Promise<{ logs: unknown[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.userId) {
        query.userId = new mongoose.Types.ObjectId(filters.userId);
    }
    if (filters.action) {
        query.action = Array.isArray(filters.action)
            ? { $in: filters.action }
            : filters.action;
    }
    if (filters.resource) {
        query.resource = Array.isArray(filters.resource)
            ? { $in: filters.resource }
            : filters.resource;
    }
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
            (query.createdAt as Record<string, Date>).$gte = filters.startDate;
        }
        if (filters.endDate) {
            (query.createdAt as Record<string, Date>).$lte = filters.endDate;
        }
    }

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(filters.skip || 0)
            .limit(filters.limit || 50)
            .lean(),
        AuditLog.countDocuments(query),
    ]);

    return { logs, total };
}
