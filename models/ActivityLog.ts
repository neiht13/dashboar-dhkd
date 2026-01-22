import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityAction = 
    | 'login'
    | 'logout'
    | 'register'
    | 'password_reset'
    | 'dashboard_create'
    | 'dashboard_update'
    | 'dashboard_delete'
    | 'dashboard_share'
    | 'dashboard_view'
    | 'chart_create'
    | 'chart_update'
    | 'chart_delete'
    | 'template_create'
    | 'template_use'
    | 'connection_create'
    | 'connection_update'
    | 'connection_delete'
    | 'query_execute'
    | 'export_data'
    | 'user_update'
    | 'team_create'
    | 'team_update'
    | 'alert_create'
    | 'alert_trigger';

export interface IActivityLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    action: ActivityAction;
    resourceType?: 'dashboard' | 'chart' | 'template' | 'connection' | 'user' | 'team' | 'alert';
    resourceId?: mongoose.Types.ObjectId;
    resourceName?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'login', 'logout', 'register', 'password_reset',
                'dashboard_create', 'dashboard_update', 'dashboard_delete', 'dashboard_share', 'dashboard_view',
                'chart_create', 'chart_update', 'chart_delete',
                'template_create', 'template_use',
                'connection_create', 'connection_update', 'connection_delete',
                'query_execute', 'export_data',
                'user_update', 'team_create', 'team_update',
                'alert_create', 'alert_trigger'
            ],
            index: true,
        },
        resourceType: {
            type: String,
            enum: ['dashboard', 'chart', 'template', 'connection', 'user', 'team', 'alert'],
        },
        resourceId: {
            type: Schema.Types.ObjectId,
        },
        resourceName: String,
        details: {
            type: Schema.Types.Mixed,
        },
        ipAddress: String,
        userAgent: String,
        status: {
            type: String,
            enum: ['success', 'failure'],
            default: 'success',
        },
        errorMessage: String,
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes for common queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1 });

// TTL index - auto delete logs older than 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ActivityLog: Model<IActivityLog> = 
    mongoose.models.ActivityLog || 
    mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
