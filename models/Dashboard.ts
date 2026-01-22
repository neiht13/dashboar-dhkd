import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWidget {
    id: string;
    type: 'chart' | 'kpi' | 'table' | 'text';
    config: Record<string, unknown>;
    layout: {
        i: string;
        x: number;
        y: number;
        w: number;
        h: number;
        minW?: number;
        minH?: number;
        maxW?: number;
        maxH?: number;
    };
}

export interface ISharePermission {
    userId: mongoose.Types.ObjectId;
    permission: 'view' | 'edit';
    addedAt: Date;
}

export interface IDashboardTab {
    id: string;
    name: string;
    widgets: IWidget[];
    layout: IWidget['layout'][];
}

export interface IDashboard extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    widgets: IWidget[];
    layout: IWidget['layout'][];
    tabs?: IDashboardTab[];
    activeTabId?: string;
    ownerId: mongoose.Types.ObjectId;
    sharedWith: ISharePermission[];
    isPublic: boolean;
    publicToken?: string;
    publicPermission?: 'view' | 'edit';
    thumbnail?: string;
    tags: string[];
    // Organization & Tracking
    folderId?: mongoose.Types.ObjectId;
    isFavorite: boolean;
    lastViewedAt?: Date;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const WidgetLayoutSchema = new Schema({
    i: { type: String, required: true },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 4 },
    h: { type: Number, required: true, default: 3 },
    minW: { type: Number },
    minH: { type: Number },
    maxW: { type: Number },
    maxH: { type: Number },
}, { _id: false });

const WidgetSchema = new Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['chart', 'kpi', 'table', 'text'],
        required: true
    },
    config: { type: Schema.Types.Mixed, required: true },
    layout: { type: WidgetLayoutSchema, required: true },
}, { _id: false });

const SharePermissionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    addedAt: { type: Date, default: Date.now },
}, { _id: false });

const DashboardSchema = new Schema<IDashboard>(
    {
        name: {
            type: String,
            required: [true, 'Dashboard name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        widgets: [WidgetSchema],
        layout: [WidgetLayoutSchema],
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sharedWith: [SharePermissionSchema],
        isPublic: {
            type: Boolean,
            default: false,
        },
        publicToken: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        publicPermission: {
            type: String,
            enum: ['view', 'edit'],
        },
        thumbnail: {
            type: String,
        },
        tags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        tabs: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            widgets: [WidgetSchema],
            layout: [WidgetLayoutSchema],
        }],
        activeTabId: {
            type: String,
        },
        // Organization & Tracking
        folderId: {
            type: Schema.Types.ObjectId,
            ref: 'Folder',
            index: true,
        },
        isFavorite: {
            type: Boolean,
            default: false,
            index: true,
        },
        lastViewedAt: {
            type: Date,
        },
        viewCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
DashboardSchema.index({ ownerId: 1, createdAt: -1 });
DashboardSchema.index({ 'sharedWith.userId': 1 });
DashboardSchema.index({ tags: 1 });

const Dashboard: Model<IDashboard> = mongoose.models.Dashboard || mongoose.model<IDashboard>('Dashboard', DashboardSchema);

export default Dashboard;
