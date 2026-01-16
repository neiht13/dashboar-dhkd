import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
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

// GET /api/connections - List all database connections (Admin only)
export async function GET(request: NextRequest) {
    try {
        // Check admin access
        const authError = await requireAdmin(request);
        if (authError) {
            return NextResponse.json({
                success: false,
                error: authError.error,
            }, { status: authError.status });
        }

        const db = await getDb();
        const connections = await db.collection('databaseconnections')
            .find({})
            .project({ password: 0 }) // SECURITY: Never return passwords
            .sort({ isDefault: -1, name: 1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: connections.map(conn => ({
                ...conn,
                _id: conn._id.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching connections:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch connections',
        }, { status: 500 });
    }
}

// POST /api/connections - Create new database connection (Admin only)
export async function POST(request: NextRequest) {
    try {
        // Check admin access
        const authError = await requireAdmin(request);
        if (authError) {
            return NextResponse.json({
                success: false,
                error: authError.error,
            }, { status: authError.status });
        }

        const body = await request.json();
        const { name, host, port = 1433, database, user, password, encrypt = false, isDefault = false, testBeforeSave = true } = body;

        // Validate required fields
        if (!name || !host || !database || !user || !password) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: name, host, database, user, password',
            }, { status: 400 });
        }

        const connectionConfig: DatabaseConnectionConfig = {
            name,
            host,
            port: parseInt(port),
            database,
            user,
            password,
            encrypt: Boolean(encrypt),
        };

        // Test connection before saving (optional)
        if (testBeforeSave) {
            const testResult = await testConnection(connectionConfig);
            if (!testResult.success) {
                return NextResponse.json({
                    success: false,
                    error: `Connection test failed: ${testResult.error}`,
                }, { status: 400 });
            }
        }

        const db = await getDb();

        // If this is set as default, unset other defaults
        if (isDefault) {
            await db.collection('databaseconnections').updateMany(
                {},
                { $set: { isDefault: false } }
            );
        }

        const result = await db.collection('databaseconnections').insertOne({
            name,
            host,
            port: parseInt(port),
            database,
            user,
            password,
            encrypt: Boolean(encrypt),
            isDefault: Boolean(isDefault),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            data: {
                _id: result.insertedId.toString(),
                name,
                host,
                port: parseInt(port),
                database,
                user,
                encrypt: Boolean(encrypt),
                isDefault: Boolean(isDefault),
            },
            message: 'Connection created successfully',
        });
    } catch (error) {
        console.error('Error creating connection:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create connection',
        }, { status: 500 });
    }
}
