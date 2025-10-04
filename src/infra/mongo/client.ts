import {MongoClient, Db} from "mongodb";
import {getEnv} from "../../config/env";

let client: MongoClient | null = null;
let database: Db | null = null;

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

export async function closeMongo(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        database = null;
    }
}
