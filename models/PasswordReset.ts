import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordReset extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    usedAt?: Date;
    createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        usedAt: Date,
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// TTL index - auto delete expired tokens
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate token
PasswordResetSchema.statics.generateToken = function(): string {
    return crypto.randomBytes(32).toString('hex');
};

// Static method to create reset request
PasswordResetSchema.statics.createResetRequest = async function(
    userId: mongoose.Types.ObjectId,
    expiresInHours = 1
): Promise<IPasswordReset> {
    // Invalidate existing tokens for this user
    await this.updateMany(
        { userId, usedAt: null },
        { $set: { expiresAt: new Date() } }
    );

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    return this.create({
        userId,
        token,
        expiresAt,
    });
};

// Static method to verify and use token
PasswordResetSchema.statics.verifyAndUseToken = async function(
    token: string
): Promise<IPasswordReset | null> {
    const resetRequest = await this.findOne({
        token,
        expiresAt: { $gt: new Date() },
        usedAt: null,
    });

    if (!resetRequest) {
        return null;
    }

    resetRequest.usedAt = new Date();
    await resetRequest.save();

    return resetRequest;
};

const PasswordReset: Model<IPasswordReset> = 
    mongoose.models.PasswordReset || 
    mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);

export default PasswordReset;
