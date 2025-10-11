import { MongoClient, Db } from 'mongodb';
import { getEnv } from '../../config/env';

let db: Db | null = null;
let client: MongoClient | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  const env = getEnv();
  client = new MongoClient(env.MONGO_URL);
  await client.connect();
  db = client.db(env.MONGODB_DB);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Mongo not connected');
  return db;
}

export async function closeMongo(): Promise<void> {
  if (client) await client.close();
  client = null; db = null;
}
