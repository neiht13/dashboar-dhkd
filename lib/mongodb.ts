import mongoose from 'mongoose';
import { MongoClient, Db } from 'mongodb';

// MongoDB connection - MUST be set via environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'telecom_dashboard';

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local\n' +
        'See .env.example for reference.'
    );
}

interface CachedConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

interface CachedMongo {
    client: MongoClient | null;
    db: Db | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: CachedConnection | undefined;
    // eslint-disable-next-line no-var
    var mongoClientCache: CachedMongo | undefined;
}

const cached: CachedConnection = global.mongooseCache || { conn: null, promise: null };
const mongoCached: CachedMongo = global.mongoClientCache || { client: null, db: null };

if (!global.mongooseCache) global.mongooseCache = cached;
if (!global.mongoClientCache) global.mongoClientCache = mongoCached;

// Mongoose connection (keeping for other parts of the app if needed)
export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            authSource: 'admin',
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('Mongoose connected successfully');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
    return cached.conn;
}

// Native MongoDB Driver connection (much more stable for auth)
export async function getDb(): Promise<Db> {
    if (mongoCached.db) return mongoCached.db;

    if (!mongoCached.client) {
        mongoCached.client = new MongoClient(MONGODB_URI, {
            authSource: 'admin',
        });
        await mongoCached.client.connect();
        console.log('Native MongoDB client connected');
    }

    mongoCached.db = mongoCached.client.db(DATABASE_NAME);
    return mongoCached.db;
}

export async function disconnectDB(): Promise<void> {
    if (cached.conn) {
        await mongoose.disconnect();
        cached.conn = null;
        cached.promise = null;
    }
    if (mongoCached.client) {
        await mongoCached.client.close();
        mongoCached.client = null;
        mongoCached.db = null;
    }
}

export default mongoose;
