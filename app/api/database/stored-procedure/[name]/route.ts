/**
 * API Route: Single Stored Procedure operations
 * 
 * GET /api/database/stored-procedure/[name] - Get single procedure
 * DELETE /api/database/stored-procedure/[name] - Delete procedure
 */

import { NextRequest, NextResponse } from "next/server";
import {
    getStoredProcedureConfig,
    deleteStoredProcedure,
} from "@/lib/security/stored-procedure-validator";
import { logger } from "@/lib/security/logger";

interface RouteParams {
    params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { name } = await params;
        const decodedName = decodeURIComponent(name);

        const procedure = await getStoredProcedureConfig(decodedName);

        if (!procedure) {
            return NextResponse.json(
                { success: false, error: "Stored procedure not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: procedure,
        });
    } catch (error) {
        logger.error('Error getting stored procedure', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: "Failed to get stored procedure" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        // TODO: Add admin role check

        const { name } = await params;
        const decodedName = decodeURIComponent(name);

        const deleted = await deleteStoredProcedure(decodedName);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Stored procedure not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Stored procedure deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting stored procedure', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: "Failed to delete stored procedure" },
            { status: 500 }
        );
    }
}
