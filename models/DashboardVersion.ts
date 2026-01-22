import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDashboardVersion extends Document {
    _id: mongoose.Types.ObjectId;
    dashboardId: mongoose.Types.ObjectId;
    version: number;
    name: string;
    description?: string;
    widgets: Array<{
        id: string;
        type: string;
        config: Record<string, unknown>;
        layout: {
            i: string;
            x: number;
            y: number;
            w: number;
            h: number;
        };
    }>;
    layout: Array<{
        i: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    tabs?: Array<{
        id: string;
        name: string;
        widgets: unknown[];
        layout: unknown[];
    }>;
    activeTabId?: string;
    createdBy: mongoose.Types.ObjectId;
    changeDescription?: string;
    createdAt: Date;
}

const VersionWidgetLayoutSchema = new Schema({
    i: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
}, { _id: false });

const VersionWidgetSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    layout: { type: VersionWidgetLayoutSchema, required: true },
}, { _id: false });

const DashboardVersionSchema = new Schema<IDashboardVersion>(
    {
        dashboardId: {
            type: Schema.Types.ObjectId,
            ref: 'Dashboard',
            required: true,
            index: true,
        },
        version: {
            type: Number,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: String,
        widgets: [VersionWidgetSchema],
        layout: [VersionWidgetLayoutSchema],
        tabs: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            widgets: [Schema.Types.Mixed],
            layout: [Schema.Types.Mixed],
        }],
        activeTabId: String,
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        changeDescription: String,
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound index for efficient version lookup
DashboardVersionSchema.index({ dashboardId: 1, version: -1 });

// Limit versions per dashboard (keep last 50)
DashboardVersionSchema.statics.cleanupOldVersions = async function(dashboardId: mongoose.Types.ObjectId, keepCount = 50) {
    const versions = await this.find({ dashboardId })
        .sort({ version: -1 })
        .skip(keepCount)
        .select('_id');
    
    if (versions.length > 0) {
        await this.deleteMany({ _id: { $in: versions.map(v => v._id) } });
    }
};

const DashboardVersion: Model<IDashboardVersion> = 
    mongoose.models.DashboardVersion || 
    mongoose.model<IDashboardVersion>('DashboardVersion', DashboardVersionSchema);

export default DashboardVersion;
