import {CollectionOptions, CreateIndexesOptions, Db} from "mongodb";

export async function ensureGastosArtifacts(db: Db): Promise<void> {
    const name = "gastos";

    const validator: NonNullable<CollectionOptions["validator"]> = {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "importe", "createdAt"],
            properties: {
                eventId: {bsonType: "string"},
                importe: {bsonType: "decimal"},
                descripcion: {bsonType: ["string", "null"]},
                proveedor: {bsonType: ["string", "null"]},
                comprobado: {bsonType: "bool"},
                createdAt: {bsonType: "date"},
                updatedAt: {bsonType: "date"},
            },
        },
    };

    const exists = await db.listCollections({name}).hasNext();
    if (!exists) {
        await db.createCollection(name, {
            validator,
            validationLevel: "moderate",
            validationAction: "error",
        });
    } else {
        await db.command({collMod: name, validator, validationLevel: "moderate", validationAction: "error"});
    }

    const indexes: Array<{ key: Record<string, 1 | -1 | "text">; name: string; unique?: boolean }> = [
        {name: "IX_gastos_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
        {name: "IX_gastos_eventId_comprobado_createdAt", key: {eventId: 1, comprobado: 1, createdAt: -1}},
        {name: "IX_gastos_texto", key: {descripcion: "text", proveedor: "text"}},
    ];

    const options: CreateIndexesOptions = {};
    await db.collection(name).createIndexes(indexes.map(ix => ({
        key: ix.key,
        name: ix.name,
        unique: ix.unique === true
    })), options);
}
