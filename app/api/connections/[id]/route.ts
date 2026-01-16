import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { testConnection, closePool, DatabaseConnectionConfig } from '@/lib/db';
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

// GET /api/connections/[id] - Get a single connection (Admin only)
export async function GET(
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

        const connection = await db.collection('databaseconnections').findOne(
            { _id: new ObjectId(id) },
            { projection: { password: 0 } } // SECURITY: Never return passwords
        );

        if (!connection) {
            return NextResponse.json({
                success: false,
                error: 'Connection not found',
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...connection,
                _id: connection._id.toString(),
            },
        });
    } catch (error) {
        console.error('Error fetching connection:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch connection',
        }, { status: 500 });
    }
}

// PUT /api/connections/[id] - Update a connection (Admin only)
export async function PUT(
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
        const body = await request.json();
        const { name, host, port, database, user, password, encrypt, isDefault, testBeforeSave = true } = body;

        const db = await getDb();

        // Get existing connection
        const existing = await db.collection('databaseconnections').findOne({
            _id: new ObjectId(id)
        });

        if (!existing) {
            return NextResponse.json({
                success: false,
                error: 'Connection not found',
            }, { status: 404 });
        }

        // Build update object
        const update: any = {
            updatedAt: new Date(),
        };

        if (name !== undefined) update.name = name;
        if (host !== undefined) update.host = host;
        if (port !== undefined) update.port = parseInt(port);
        if (database !== undefined) update.database = database;
        if (user !== undefined) update.user = user;
        if (password !== undefined) update.password = password;
        if (encrypt !== undefined) update.encrypt = Boolean(encrypt);

        // Test connection before saving if credentials changed
        if (testBeforeSave && (host || port || database || user || password)) {
            const connConfig: DatabaseConnectionConfig = {
                name: name || existing.name,
                host: host || existing.host,
                port: port ? parseInt(port) : existing.port,
                database: database || existing.database,
                user: user || existing.user,
                password: password || existing.password,
                encrypt: encrypt !== undefined ? Boolean(encrypt) : existing.encrypt,
            };

            const testResult = await testConnection(connConfig);
            if (!testResult.success) {
                return NextResponse.json({
                    success: false,
                    error: `Connection test failed: ${testResult.error}`,
                }, { status: 400 });
            }
        }

        // Handle isDefault flag
        if (isDefault === true) {
            await db.collection('databaseconnections').updateMany(
                { _id: { $ne: new ObjectId(id) } },
                { $set: { isDefault: false } }
            );
            update.isDefault = true;
        } else if (isDefault === false) {
            update.isDefault = false;
        }

        await db.collection('databaseconnections').updateOne(
            { _id: new ObjectId(id) },
            { $set: update }
        );

        // Close cached pool so next request uses new config
        await closePool(id);

        return NextResponse.json({
            success: true,
            message: 'Connection updated successfully',
        });
    } catch (error) {
        console.error('Error updating connection:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update connection',
        }, { status: 500 });
    }
}

// DELETE /api/connections/[id] - Delete a connection (Admin only)
export async function DELETE(
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

        // Check if connection exists
        const connection = await db.collection('databaseconnections').findOne({
            _id: new ObjectId(id)
        });

        if (!connection) {
            return NextResponse.json({
                success: false,
                error: 'Connection not found',
            }, { status: 404 });
        }

        // Don't allow deleting the only default connection
        if (connection.isDefault) {
            const count = await db.collection('databaseconnections').countDocuments();
            if (count === 1) {
                return NextResponse.json({
                    success: false,
                    error: 'Cannot delete the only database connection',
                }, { status: 400 });
            }
        }

        // Close pool and delete
        await closePool(id);
        await db.collection('databaseconnections').deleteOne({
            _id: new ObjectId(id)
        });

        // If this was default, set another as default
        if (connection.isDefault) {
            const another = await db.collection('databaseconnections').findOne({});
            if (another) {
                await db.collection('databaseconnections').updateOne(
                    { _id: another._id },
                    { $set: { isDefault: true } }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Connection deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting connection:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete connection',
        }, { status: 500 });
    }
}
