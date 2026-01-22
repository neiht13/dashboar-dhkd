import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDashboardTemplate extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    category: 'analytics' | 'sales' | 'marketing' | 'operations' | 'finance' | 'custom';
    thumbnail?: string;
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
    isPublic: boolean;
    isDefault: boolean;
    createdBy?: mongoose.Types.ObjectId;
    usageCount: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const TemplateWidgetLayoutSchema = new Schema({
    i: { type: String, required: true },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 4 },
    h: { type: Number, required: true, default: 3 },
}, { _id: false });

const TemplateWidgetSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    layout: { type: TemplateWidgetLayoutSchema, required: true },
}, { _id: false });

const DashboardTemplateSchema = new Schema<IDashboardTemplate>(
    {
        name: {
            type: String,
            required: [true, 'Template name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        category: {
            type: String,
            enum: ['analytics', 'sales', 'marketing', 'operations', 'finance', 'custom'],
            default: 'custom',
        },
        thumbnail: String,
        widgets: [TemplateWidgetSchema],
        layout: [TemplateWidgetLayoutSchema],
        isPublic: {
            type: Boolean,
            default: false,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        tags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes
DashboardTemplateSchema.index({ category: 1, isPublic: 1 });
DashboardTemplateSchema.index({ tags: 1 });
DashboardTemplateSchema.index({ usageCount: -1 });

const DashboardTemplate: Model<IDashboardTemplate> = 
    mongoose.models.DashboardTemplate || 
    mongoose.model<IDashboardTemplate>('DashboardTemplate', DashboardTemplateSchema);

export default DashboardTemplate;
