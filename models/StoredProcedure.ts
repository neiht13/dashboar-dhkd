/**
 * StoredProcedure Model - MongoDB schema for allowed stored procedures whitelist
 * 
 * Admins can manage this through the connections/database management UI
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IStoredProcedureParam {
    name: string;
    type: 'number' | 'string' | 'date';
    required: boolean;
    defaultValue?: string | number | null;
    description?: string;
}

export interface IStoredProcedure extends Document {
    name: string;           // Full procedure name (e.g., "REPORTSERVICE.dbo.sp_rpt_ThongKe_PTM_Theo_C2")
    description: string;
    parameters: IStoredProcedureParam[];
    connectionId?: string;  // Optional: restrict to specific database connection
    allowedRoles: string[]; // If empty, all authenticated users can access
    isActive: boolean;      // Enable/disable without deleting
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StoredProcedureParamSchema = new Schema<IStoredProcedureParam>({
    name: { type: String, required: true },
    type: { type: String, enum: ['number', 'string', 'date'], required: true },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    description: { type: String },
});

const StoredProcedureSchema = new Schema<IStoredProcedure>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        parameters: [StoredProcedureParamSchema],
        connectionId: { type: String },
        allowedRoles: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String },
    },
    { timestamps: true }
);

// Index for faster lookups
StoredProcedureSchema.index({ name: 1 });
StoredProcedureSchema.index({ isActive: 1 });
StoredProcedureSchema.index({ connectionId: 1 });

export const StoredProcedure = mongoose.models.StoredProcedure ||
    mongoose.model<IStoredProcedure>('StoredProcedure', StoredProcedureSchema);

export default StoredProcedure;
