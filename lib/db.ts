import sql from 'mssql';
import { getDb } from './mongodb';
import { ObjectId } from 'mongodb';

// Connection pool cache - keyed by connection ID
const pools = new Map<string, sql.ConnectionPool>();

// Default connection config from environment variables
const defaultEnvConfig: sql.config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'master',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    requestTimeout: 60000,
    connectionTimeout: 30000,
};

export interface DatabaseConnectionConfig {
    _id?: string;
    name: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    encrypt: boolean;
    isDefault?: boolean;
}

// Build mssql config from our connection config
function buildMssqlConfig(conn: DatabaseConnectionConfig): sql.config {
    return {
        server: conn.host,
        user: conn.user,
        password: conn.password,
        database: conn.database,
        port: conn.port,
        options: {
            encrypt: conn.encrypt,
            trustServerCertificate: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
        requestTimeout: 60000,
        connectionTimeout: 30000,
    };
}

// Get connection by ID from MongoDB
async function getConnectionById(connectionId: string): Promise<DatabaseConnectionConfig | null> {
    try {
        const db = await getDb();
        const connection = await db.collection('databaseconnections').findOne({
            _id: new ObjectId(connectionId)
        });
        if (!connection) return null;
        return {
            _id: connection._id.toString(),
            name: connection.name,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            user: connection.user,
            password: connection.password,
            encrypt: connection.encrypt,
            isDefault: connection.isDefault,
        };
    } catch (error) {
        console.error('Error fetching connection:', error);
        return null;
    }
}

// Get default connection from MongoDB or fall back to env
async function getDefaultConnection(): Promise<DatabaseConnectionConfig | null> {
    try {
        const db = await getDb();
        const connection = await db.collection('databaseconnections').findOne({
            isDefault: true
        });
        if (connection) {
            return {
                _id: connection._id.toString(),
                name: connection.name,
                host: connection.host,
                port: connection.port,
                database: connection.database,
                user: connection.user,
                password: connection.password,
                encrypt: connection.encrypt,
                isDefault: true,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching default connection:', error);
        return null;
    }
}

// Get pool by connection ID
export async function getPoolById(connectionId: string): Promise<sql.ConnectionPool> {
    // Check cache first
    if (pools.has(connectionId)) {
        const pool = pools.get(connectionId)!;
        if (pool.connected) {
            return pool;
        }
        // Pool disconnected, remove from cache
        pools.delete(connectionId);
    }

    // Fetch connection config
    const conn = await getConnectionById(connectionId);
    if (!conn) {
        throw new Error(`Database connection not found: ${connectionId}`);
    }

    // Create new pool
    const config = buildMssqlConfig(conn);
    const pool = await sql.connect(config);
    pools.set(connectionId, pool);
    return pool;
}

// Get default pool (from MongoDB default or env fallback)
export async function getPool(): Promise<sql.ConnectionPool> {
    // Try to get default connection from MongoDB
    const defaultConn = await getDefaultConnection();

    if (defaultConn && defaultConn._id) {
        return getPoolById(defaultConn._id);
    }

    // Fallback to env-based connection
    const envPoolKey = '__env_default__';
    if (pools.has(envPoolKey)) {
        const pool = pools.get(envPoolKey)!;
        if (pool.connected) {
            return pool;
        }
        pools.delete(envPoolKey);
    }

    const pool = await sql.connect(defaultEnvConfig);
    pools.set(envPoolKey, pool);
    return pool;
}

// Test a connection config without storing it
export async function testConnection(conn: DatabaseConnectionConfig): Promise<{ success: boolean; error?: string }> {
    let testPool: sql.ConnectionPool | null = null;
    try {
        const config = buildMssqlConfig(conn);
        testPool = await sql.connect(config);
        await testPool.request().query('SELECT 1');
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed'
        };
    } finally {
        if (testPool) {
            await testPool.close();
        }
    }
}

// Execute query with optional connection ID
export async function executeQuery<T>(
    query: string,
    params?: Record<string, unknown>,
    connectionId?: string
): Promise<T[]> {
    const pool = connectionId ? await getPoolById(connectionId) : await getPool();
    const request = pool.request();

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
        });
    }

    const result = await request.query(query);
    return result.recordset as T[];
}

// Close a specific connection pool
export async function closePool(connectionId: string): Promise<void> {
    const pool = pools.get(connectionId);
    if (pool) {
        await pool.close();
        pools.delete(connectionId);
    }
}

// Close all connection pools
export async function closeAllPools(): Promise<void> {
    for (const [id, pool] of pools) {
        await pool.close();
        pools.delete(id);
    }
}

// Close pools when the app is shutting down
process.on('beforeExit', async () => {
    await closeAllPools();
});
