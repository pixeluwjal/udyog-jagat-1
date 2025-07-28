// lib/dbConnect.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global variable to cache the Mongoose connection
declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedMongoose;
}

let cached: CachedMongoose = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering
      // useNewUrlParser: true, // Deprecated in recent Mongoose versions
      // useUnifiedTopology: true, // Deprecated in recent Mongoose versions
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: unknown) {
    cached.promise = null; // Clear promise on error
    if (e instanceof Error) {
      throw e;
    } else {
      throw new Error(`An unknown error occurred during DB connection: ${String(e)}`);
    }
  }

  return cached.conn;
}

export default dbConnect;