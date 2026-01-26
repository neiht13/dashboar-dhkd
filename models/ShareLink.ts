import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IShareLink extends Document {
    _id: mongoose.Types.ObjectId;
    dashboardId: mongoose.Types.ObjectId;
    token: string;
    type: 'public' | 'jwt';
    secretKey?: string;
    allowedDomains?: string[];
    permission: 'view' | 'edit';
    expiresAt?: Date;
    maxViews?: number;
    viewCount: number;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    lastAccessedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
    {
        dashboardId: {
            type: Schema.Types.ObjectId,
            ref: 'Dashboard',
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: () => crypto.randomBytes(32).toString('hex'),
        },
        type: {
            type: String,
            enum: ['public', 'jwt'],
            default: 'public',
        },
        secretKey: {
            type: String,
            // Only required if type is jwt, but we'll handle generation in logic
        },
        allowedDomains: [{
            type: String,
        }],
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view',
        },
        expiresAt: {
            type: Date,
        },
        maxViews: {
            type: Number,
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        lastAccessedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Check if link is still valid
ShareLinkSchema.methods.isValid = function (): boolean {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.maxViews && this.viewCount >= this.maxViews) return false;
    return true;
};

// Increment view count
ShareLinkSchema.methods.incrementView = async function (): Promise<void> {
    this.viewCount += 1;
    this.lastAccessedAt = new Date();
    await this.save();
};

ShareLinkSchema.index({ dashboardId: 1, isActive: 1 });
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const ShareLink: Model<IShareLink> = mongoose.models.ShareLink || mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);

export default ShareLink;
