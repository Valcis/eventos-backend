import {MongoClient, Db} from "mongodb";
import {getEnv} from "../../config/env";

let client: MongoClient | null = null;
let database: Db | null = null;

function getUrl(): string {
    return process.env.MONGO_URL ?? 'mongodb://localhost:27017';
}


export async function getClient(): Promise<MongoClient> {
    if (client) return client;
    client = new MongoClient(getUrl());
    await client.connect();
    return client;
}

export async function getDb(): Promise<Db> {
    if (database) return database;

    const env = getEnv();
    const uri = env.MONGODB_URI;
    const dbName = env.MONGODB_DB;

    client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000
    });

    await client.connect();
    database = client.db(dbName);
    return database;
}

export async function closeClient(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        database = null;
    }
}
