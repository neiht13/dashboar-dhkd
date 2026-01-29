/**
 * Stored Procedure Validator - Safe execution of stored procedures
 * 
 * This module provides secure stored procedure execution with database-driven whitelist.
 * Only procedures registered in MongoDB can be executed.
 */

import { StoredProcedure, IStoredProcedure, IStoredProcedureParam } from '@/models/StoredProcedure';
import { connectDB } from '@/lib/mongodb';

export interface StoredProcedureConfig {
    name: string;
    description: string;
    parameters: IStoredProcedureParam[];
    connectionId?: string;
    allowedRoles?: string[];
    isActive: boolean;
}

/**
 * Get stored procedure config by name from database
 */
export async function getStoredProcedureConfig(name: string): Promise<IStoredProcedure | null> {
    await connectDB();
    const normalized = name.toUpperCase().replace(/\s+/g, '');

    // Find case-insensitive match
    const procedure = await StoredProcedure.findOne({
        isActive: true,
        $expr: {
            $eq: [
                { $toUpper: { $replaceAll: { input: "$name", find: " ", replacement: "" } } },
                normalized
            ]
        }
    });

    return procedure;
}

/**
 * Check if stored procedure is in whitelist (database)
 */
export async function isAllowedStoredProcedure(name: string): Promise<boolean> {
    const config = await getStoredProcedureConfig(name);
    return config !== null;
}

/**
 * Validate stored procedure parameters
 */
export function validateStoredProcedureParams(
    config: IStoredProcedure,
    params: Record<string, unknown>
): { isValid: boolean; error?: string; sanitizedParams: Record<string, unknown> } {
    const sanitizedParams: Record<string, unknown> = {};

    for (const paramConfig of config.parameters) {
        const value = params[paramConfig.name];

        // Check required
        if (paramConfig.required && (value === undefined || value === null || value === '')) {
            return {
                isValid: false,
                error: `Parameter '${paramConfig.name}' is required`,
                sanitizedParams: {},
            };
        }

        // Use default if not provided
        if (value === undefined || value === null || value === '') {
            if (paramConfig.defaultValue !== undefined) {
                sanitizedParams[paramConfig.name] = paramConfig.defaultValue;
            }
            continue;
        }

        // Type validation
        switch (paramConfig.type) {
            case 'number':
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    return {
                        isValid: false,
                        error: `Parameter '${paramConfig.name}' must be a number`,
                        sanitizedParams: {},
                    };
                }
                sanitizedParams[paramConfig.name] = numValue;
                break;

            case 'string':
                // Sanitize string to prevent injection
                const strValue = String(value).replace(/[;'"\\]/g, '');
                if (strValue.length > 500) {
                    return {
                        isValid: false,
                        error: `Parameter '${paramConfig.name}' is too long`,
                        sanitizedParams: {},
                    };
                }
                sanitizedParams[paramConfig.name] = strValue;
                break;

            case 'date':
                const dateValue = new Date(value as string);
                if (isNaN(dateValue.getTime())) {
                    return {
                        isValid: false,
                        error: `Parameter '${paramConfig.name}' must be a valid date`,
                        sanitizedParams: {},
                    };
                }
                sanitizedParams[paramConfig.name] = dateValue.toISOString().split('T')[0];
                break;
        }
    }

    return { isValid: true, sanitizedParams };
}

/**
 * Build EXEC command with parameterized values
 */
export function buildExecCommand(
    config: IStoredProcedure,
    params: Record<string, unknown>
): string {
    // Build parameter list in order
    const paramValues = config.parameters
        .map(p => {
            const value = params[p.name];
            if (value === undefined || value === null) {
                return 'NULL';
            }
            if (p.type === 'string' || p.type === 'date') {
                return `N'${String(value).replace(/'/g, "''")}'`;
            }
            return String(value);
        })
        .join(', ');

    return `EXEC ${config.name} ${paramValues}`;
}

/**
 * Get list of all allowed stored procedures (for UI)
 */
export async function getAllowedProcedures(): Promise<StoredProcedureConfig[]> {
    await connectDB();
    const procedures = await StoredProcedure.find({ isActive: true })
        .select('-__v')
        .sort({ name: 1 })
        .lean();

    return procedures as StoredProcedureConfig[];
}

/**
 * Create or update a stored procedure in whitelist (Admin only)
 */
export async function upsertStoredProcedure(
    data: Partial<StoredProcedureConfig> & { name: string },
    userId?: string
): Promise<IStoredProcedure> {
    await connectDB();

    const procedure = await StoredProcedure.findOneAndUpdate(
        { name: data.name },
        {
            ...data,
            ...(userId && { createdBy: userId }),
        },
        { upsert: true, new: true }
    );

    return procedure;
}

/**
 * Delete a stored procedure from whitelist (Admin only)
 */
export async function deleteStoredProcedure(name: string): Promise<boolean> {
    await connectDB();
    const result = await StoredProcedure.deleteOne({ name });
    return result.deletedCount > 0;
}

/**
 * Seed default stored procedures (run once on setup)
 */
export async function seedDefaultProcedures(): Promise<void> {
    await connectDB();

    const defaults: Partial<StoredProcedureConfig>[] = [
        {
            name: "REPORTSERVICE.dbo.sp_rpt_ThongKe_PTM_Theo_C2",
            description: "Thống kê PTM theo C2",
            parameters: [
                { name: "Month", type: "number", required: true },
                { name: "Year", type: "number", required: true },
            ],
            isActive: true,
        },
    ];

    for (const sp of defaults) {
        await StoredProcedure.findOneAndUpdate(
            { name: sp.name },
            sp,
            { upsert: true }
        );
    }
}
