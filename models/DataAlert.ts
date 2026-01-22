import mongoose, { Schema, Document, Model } from 'mongoose';

export type AlertConditionOperator = 
    | 'gt' // greater than
    | 'gte' // greater than or equal
    | 'lt' // less than
    | 'lte' // less than or equal
    | 'eq' // equal
    | 'neq' // not equal
    | 'change_percent' // percent change
    | 'threshold_cross'; // crosses threshold

export type AlertFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

export type AlertChannel = 'email' | 'in_app' | 'webhook';

export interface IAlertCondition {
    field: string;
    operator: AlertConditionOperator;
    value: number;
    compareWith?: 'previous' | 'fixed';
}

export interface IDataAlert extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    dashboardId?: mongoose.Types.ObjectId;
    chartId?: mongoose.Types.ObjectId;
    connectionId: mongoose.Types.ObjectId;
    query: {
        table: string;
        field: string;
        aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
        filters?: Array<{
            field: string;
            operator: string;
            value: unknown;
        }>;
    };
    conditions: IAlertCondition[];
    conditionLogic: 'AND' | 'OR';
    frequency: AlertFrequency;
    channels: AlertChannel[];
    recipients: {
        userIds?: mongoose.Types.ObjectId[];
        emails?: string[];
        webhookUrl?: string;
    };
    isActive: boolean;
    lastTriggeredAt?: Date;
    lastCheckedAt?: Date;
    lastValue?: number;
    triggerCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AlertConditionSchema = new Schema({
    field: { type: String, required: true },
    operator: {
        type: String,
        enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'change_percent', 'threshold_cross'],
        required: true,
    },
    value: { type: Number, required: true },
    compareWith: {
        type: String,
        enum: ['previous', 'fixed'],
        default: 'fixed',
    },
}, { _id: false });

const DataAlertSchema = new Schema<IDataAlert>(
    {
        name: {
            type: String,
            required: [true, 'Alert name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        dashboardId: {
            type: Schema.Types.ObjectId,
            ref: 'Dashboard',
        },
        chartId: {
            type: Schema.Types.ObjectId,
            ref: 'Chart',
        },
        connectionId: {
            type: Schema.Types.ObjectId,
            ref: 'DatabaseConnection',
            required: true,
        },
        query: {
            table: { type: String, required: true },
            field: { type: String, required: true },
            aggregation: {
                type: String,
                enum: ['sum', 'avg', 'count', 'min', 'max'],
                default: 'sum',
            },
            filters: [{
                field: String,
                operator: String,
                value: Schema.Types.Mixed,
            }],
        },
        conditions: [AlertConditionSchema],
        conditionLogic: {
            type: String,
            enum: ['AND', 'OR'],
            default: 'AND',
        },
        frequency: {
            type: String,
            enum: ['realtime', 'hourly', 'daily', 'weekly'],
            default: 'daily',
        },
        channels: [{
            type: String,
            enum: ['email', 'in_app', 'webhook'],
        }],
        recipients: {
            userIds: [{
                type: Schema.Types.ObjectId,
                ref: 'User',
            }],
            emails: [String],
            webhookUrl: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastTriggeredAt: Date,
        lastCheckedAt: Date,
        lastValue: Number,
        triggerCount: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
DataAlertSchema.index({ createdBy: 1, isActive: 1 });
DataAlertSchema.index({ dashboardId: 1 });
DataAlertSchema.index({ isActive: 1, frequency: 1 });

const DataAlert: Model<IDataAlert> = 
    mongoose.models.DataAlert || 
    mongoose.model<IDataAlert>('DataAlert', DataAlertSchema);

export default DataAlert;
