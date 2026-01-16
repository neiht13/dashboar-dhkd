import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDatabaseConnection extends Document {
    name: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    encrypt: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DatabaseConnectionSchema = new Schema<IDatabaseConnection>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        host: {
            type: String,
            required: true,
            trim: true,
        },
        port: {
            type: Number,
            required: true,
            default: 1433,
        },
        database: {
            type: String,
            required: true,
            trim: true,
        },
        user: {
            type: String,
            required: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        encrypt: {
            type: Boolean,
            default: false,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure only one default connection
DatabaseConnectionSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await mongoose.model('DatabaseConnection').updateMany(
            { _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Check if model already exists to prevent recompilation errors
const DatabaseConnection: Model<IDatabaseConnection> =
    mongoose.models.DatabaseConnection ||
    mongoose.model<IDatabaseConnection>('DatabaseConnection', DatabaseConnectionSchema);

export default DatabaseConnection;
