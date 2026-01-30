import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISharePermission {
    userId: mongoose.Types.ObjectId;
    permission: 'view' | 'edit';
    addedAt: Date;
    addedBy?: mongoose.Types.ObjectId;
}

export interface ITeamSharePermission {
    teamId: mongoose.Types.ObjectId;
    permission: 'view' | 'edit';
    addedAt: Date;
    addedBy?: mongoose.Types.ObjectId;
}

export interface IRoute extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    ownerId: mongoose.Types.ObjectId;
    sharedWith: ISharePermission[];
    sharedWithTeams: ITeamSharePermission[];
    isPublic: boolean;
    publicToken?: string;
    publicPermission?: 'view' | 'edit'; // 'view' is standard for public
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const SharePermissionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const TeamSharePermissionSchema = new Schema({
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const RouteSchema = new Schema<IRoute>(
    {
        name: {
            type: String,
            required: [true, 'Route name is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        description: {
            type: String,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sharedWith: [SharePermissionSchema],
        sharedWithTeams: [TeamSharePermissionSchema],
        isPublic: {
            type: Boolean,
            default: false,
        },
        publicToken: {
            type: String,
            unique: true,
            sparse: true,
        },
        publicPermission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view',
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

RouteSchema.index({ ownerId: 1 });
RouteSchema.index({ 'sharedWith.userId': 1 });

const Route: Model<IRoute> = mongoose.models.Route || mongoose.model<IRoute>('Route', RouteSchema);

export default Route;
