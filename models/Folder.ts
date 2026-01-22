import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFolder extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    parentId?: mongoose.Types.ObjectId;  // For nested folders
    ownerId: mongoose.Types.ObjectId;
    color?: string;
    icon?: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
    {
        name: {
            type: String,
            required: [true, 'Folder name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: 'Folder',
            default: null,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        color: {
            type: String,
            default: '#6366f1',  // Default indigo color
        },
        icon: {
            type: String,
            default: 'folder',
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
FolderSchema.index({ ownerId: 1, parentId: 1 });
FolderSchema.index({ ownerId: 1, order: 1 });

// Prevent model recompilation in development
const Folder: Model<IFolder> = mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);

export default Folder;
