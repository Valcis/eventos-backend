import {CollectionOptions, CreateIndexesOptions, Db} from "mongodb";

export async function ensureReservasArtifacts(db: Db): Promise<void> {
    const name = "reservas";

    const validator: NonNullable<CollectionOptions["validator"]> = {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "estado", "createdAt"],
            properties: {
                eventId: {bsonType: "string"},
                estado: {enum: ["pendiente", "confirmada", "cancelada"]},
                createdAt: {bsonType: "date"},
                updatedAt: {bsonType: "date"},
            },
        },
    };

    const exists = await db.listCollections({name}).hasNext();
    if (!exists) {
        await db.createCollection(name, {validator, validationLevel: "strict", validationAction: "error"});
    } else {
        await db.command({collMod: name, validator, validationLevel: "strict", validationAction: "error"});
    }

    const indexes: Array<{ key: Record<string, 1 | -1>; name: string; unique?: boolean }> = [
        {name: "IX_reservas_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
        {name: "IX_reservas_eventId_estado_createdAt", key: {eventId: 1, estado: 1 as 1, createdAt: -1}},
    ];

    const options: CreateIndexesOptions = {};
    await db.collection(name).createIndexes(indexes.map(ix => ({
        key: ix.key,
        name: ix.name,
        unique: ix.unique === true
    })), options);
}
