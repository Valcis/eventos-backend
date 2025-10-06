import {CollectionOptions, CreateIndexesOptions, Db} from "mongodb";

export async function ensurePreciosArtifacts(db: Db): Promise<void> {
    const name = "precios";

    const validator: NonNullable<CollectionOptions["validator"]> = {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "productoId", "precio", "createdAt"],
            properties: {
                eventId: {bsonType: "string"},
                productoId: {bsonType: "string"},
                precio: {bsonType: "decimal"},
                createdAt: {bsonType: "date"},
                updatedAt: {bsonType: "date"},
            },
        },
    };

    const exists = await db.listCollections({name}).hasNext();
    if (!exists) {
        await db.createCollection(name, {validator, validationLevel: "moderate", validationAction: "error"});
    } else {
        await db.command({collMod: name, validator, validationLevel: "moderate", validationAction: "error"});
    }

    const indexes: Array<{ key: Record<string, 1 | -1>; name: string; unique?: boolean }> = [
        {name: "UX_precios_eventId_productoId", key: {eventId: 1, productoId: 1}, unique: true},
        {name: "IX_precios_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
    ];

    const options: CreateIndexesOptions = {};
    await db.collection(name).createIndexes(indexes.map(ix => ({
        key: ix.key,
        name: ix.name,
        unique: ix.unique === true
    })), options);
}
