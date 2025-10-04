// src/infra/mongo/client.ts
import {MongoClient, Db} from "mongodb";
import {getEnv} from "../../config/env";

let client: MongoClient | null = null;
let database: Db | null = null;

export async function getDb(): Promise<Db> {
    if (database) return database;
    const uri = getEnv().MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    if (!uri || !dbName) {
        throw new Error("MONGODB_URI or MONGODB_DB is not defined in the environment.");
    }
    client = new MongoClient(uri, {maxPoolSize: 10, serverSelectionTimeoutMS: 8000});
    await client.connect();
    database = client.db(dbName);
    return database;
}

export async function closeMongo(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        database = null;
    }
}
