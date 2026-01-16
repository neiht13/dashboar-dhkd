import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { testConnection, DatabaseConnectionConfig } from '@/lib/db';
import { getCurrentUserFromToken, hasPermission } from '@/lib/auth';

// Helper to check admin access
async function requireAdmin(request: NextRequest) {
    const user = await getCurrentUserFromToken(request);
    if (!user) {
        return { error: 'Unauthorized - Please login', status: 401 };
    }
    if (!hasPermission(user.role, 'admin')) {
        return { error: 'Forbidden - Admin access required', status: 403 };
    }
    return null;
}

// POST /api/connections/[id]/test - Test a connection (Admin only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check admin access
        const authError = await requireAdmin(request);
        if (authError) {
            return NextResponse.json({
                success: false,
                error: authError.error,
            }, { status: authError.status });
        }

        const { id } = await params;
        const db = await getDb();

        const connection = await db.collection('databaseconnections').findOne({
            _id: new ObjectId(id)
        });

        if (!connection) {
            return NextResponse.json({
                success: false,
                error: 'Connection not found',
            }, { status: 404 });
        }

        const connConfig: DatabaseConnectionConfig = {
            name: connection.name,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            user: connection.user,
            password: connection.password,
            encrypt: connection.encrypt,
        };

        const result = await testConnection(connConfig);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Connection successful',
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to test connection',
        }, { status: 500 });
    }
}
