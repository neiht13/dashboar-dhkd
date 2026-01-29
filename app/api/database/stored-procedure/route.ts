/**
 * API Route: Execute Stored Procedure
 * 
 * POST /api/database/stored-procedure - Execute a stored procedure
 * GET /api/database/stored-procedure - Get list of allowed procedures
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
    isAllowedStoredProcedure,
    getStoredProcedureConfig,
    validateStoredProcedureParams,
    buildExecCommand,
    getAllowedProcedures,
    upsertStoredProcedure,
    seedDefaultProcedures,
} from "@/lib/security/stored-procedure-validator";
import { logger } from "@/lib/security/logger";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { procedureName, parameters = {}, connectionId } = body;

        // Validate procedure name
        if (!procedureName || typeof procedureName !== 'string') {
            return NextResponse.json(
                { success: false, error: "procedureName is required" },
                { status: 400 }
            );
        }

        // Check if procedure is in whitelist (database)
        const config = await getStoredProcedureConfig(procedureName);
        if (!config) {
            logger.warn('Attempted to execute non-whitelisted stored procedure', { procedureName });
            return NextResponse.json(
                {
                    success: false,
                    error: `Stored procedure '${procedureName}' is not allowed. Add it via Database Management.`
                },
                { status: 403 }
            );
        }

        // Check connectionId restriction
        if (config.connectionId && connectionId && config.connectionId !== connectionId) {
            return NextResponse.json(
                { success: false, error: "Procedure is not available for this connection" },
                { status: 403 }
            );
        }

        // Validate parameters
        const validation = validateStoredProcedureParams(config, parameters);
        if (!validation.isValid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        // Build EXEC command
        const execCommand = buildExecCommand(config, validation.sanitizedParams);

        logger.info('Executing stored procedure', {
            procedureName: config.name,
            params: validation.sanitizedParams,
            connectionId: connectionId || config.connectionId
        });

        // Execute
        const pool = await getPool(connectionId || config.connectionId);
        const result = await pool.request().query(execCommand);

        logger.info('Stored procedure executed successfully', {
            procedureName: config.name,
            recordCount: result.recordset?.length || 0
        });

        return NextResponse.json({
            success: true,
            data: result.recordset || [],
            recordCount: result.recordset?.length || 0,
        });

    } catch (error) {
        logger.error('Error executing stored procedure', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to execute stored procedure"
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/database/stored-procedure
 * 
 * Returns list of allowed stored procedures
 * Query params:
 * - seed=true: Seed default procedures first
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Seed if requested
        if (searchParams.get('seed') === 'true') {
            await seedDefaultProcedures();
        }

        const procedures = await getAllowedProcedures();
        return NextResponse.json({
            success: true,
            data: procedures,
            count: procedures.length,
        });
    } catch (error) {
        logger.error('Error getting procedures list', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: "Failed to get procedures list" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/database/stored-procedure - Create or update a stored procedure
 * Admin only
 */
export async function PUT(request: NextRequest) {
    try {
        // TODO: Add admin role check

        const body = await request.json();
        const { name, description, parameters = [], connectionId, allowedRoles = [], isActive = true } = body;

        if (!name || !description) {
            return NextResponse.json(
                { success: false, error: "name and description are required" },
                { status: 400 }
            );
        }

        // Validate procedure name format
        if (!/^[\w.]+$/.test(name)) {
            return NextResponse.json(
                { success: false, error: "Invalid procedure name format" },
                { status: 400 }
            );
        }

        const procedure = await upsertStoredProcedure({
            name,
            description,
            parameters,
            connectionId,
            allowedRoles,
            isActive,
        });

        return NextResponse.json({
            success: true,
            data: procedure,
            message: 'Stored procedure saved successfully',
        });
    } catch (error) {
        logger.error('Error saving stored procedure', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: "Failed to save stored procedure" },
            { status: 500 }
        );
    }
}
