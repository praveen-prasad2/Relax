import mongoose from "mongoose";

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI env variable is required");
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = globalThis.mongoose ?? { conn: null, promise: null };
globalThis.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
