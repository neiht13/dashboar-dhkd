import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction =
    | 'view'
    | 'create'
    | 'update'
    | 'delete'
    | 'share'
    | 'query'
    | 'export'
    | 'login'
    | 'logout';

export type AuditResource =
    | 'dashboard'
    | 'chart'
    | 'connection'
    | 'user'
    | 'folder'
    | 'alert'
    | 'team'
    | 'system';

export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userName?: string;
    userEmail?: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: mongoose.Types.ObjectId;
    resourceName?: string;
    details?: Record<string, unknown>;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    ipAddress?: string;
    userAgent?: string;
    duration?: number;  // For query actions, in ms
    success: boolean;
    errorMessage?: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        userName: {
            type: String,
        },
        userEmail: {
            type: String,
        },
        action: {
            type: String,
            enum: ['view', 'create', 'update', 'delete', 'share', 'query', 'export', 'login', 'logout'],
            required: true,
            index: true,
        },
        resource: {
            type: String,
            enum: ['dashboard', 'chart', 'connection', 'user', 'folder', 'alert', 'team', 'system'],
            required: true,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
        },
        resourceName: {
            type: String,
        },
        details: {
            type: Schema.Types.Mixed,
        },
        changes: {
            before: { type: Schema.Types.Mixed },
            after: { type: Schema.Types.Mixed },
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        duration: {
            type: Number,
        },
        success: {
            type: Boolean,
            default: true,
        },
        errorMessage: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes for efficient querying
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
