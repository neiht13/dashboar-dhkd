import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDatasetColumn {
    name: string;
    type: string;
    nullable?: boolean;
    isPrimaryKey?: boolean;
}

export interface IDataset extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    // Source type
    sourceType: 'table' | 'query' | 'import' | 'storedProcedure';
    // Table source
    table?: string;
    schema?: string;
    // Query source
    customQuery?: string;
    // Stored procedure source
    storedProcedureName?: string;
    storedProcedureParams?: Record<string, unknown>;
    // Import source (CSV/Excel)
    importedData?: Record<string, unknown>[];
    importedFileName?: string;
    // Connection
    connectionId?: string;
    // Auto-detected columns
    columns: IDatasetColumn[];
    // Metadata
    rowCount?: number;
    lastRefreshed?: Date;
    // Ownership
    ownerId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const DatasetColumnSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    nullable: { type: Boolean, default: true },
    isPrimaryKey: { type: Boolean, default: false },
}, { _id: false });

const DatasetSchema = new Schema<IDataset>(
    {
        name: {
            type: String,
            required: [true, 'Dataset name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        sourceType: {
            type: String,
            enum: ['table', 'query', 'import', 'storedProcedure'],
            required: true,
        },
        // Table source
        table: { type: String, trim: true },
        schema: { type: String, trim: true, default: 'dbo' },
        // Query source
        customQuery: { type: String },
        // Stored procedure
        storedProcedureName: { type: String, trim: true },
        storedProcedureParams: { type: Schema.Types.Mixed },
        // Import source
        importedData: [{ type: Schema.Types.Mixed }],
        importedFileName: { type: String },
        // Connection
        connectionId: { type: String },
        // Columns
        columns: [DatasetColumnSchema],
        // Metadata
        rowCount: { type: Number },
        lastRefreshed: { type: Date },
        // Owner
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

DatasetSchema.index({ name: 'text', description: 'text' });
DatasetSchema.index({ sourceType: 1 });

// Force model refresh in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.Dataset) {
    delete mongoose.models.Dataset;
}

const Dataset: Model<IDataset> = mongoose.models.Dataset || mongoose.model<IDataset>('Dataset', DatasetSchema);

export default Dataset;
