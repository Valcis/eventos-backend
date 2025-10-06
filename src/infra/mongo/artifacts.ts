import {Db} from "mongodb";

type IndexDirection = 1 | -1 | "text" | "hashed";

interface IndexSpec {
    name: string;
    key: Record<string, IndexDirection>;
    unique?: boolean;
}

interface CollectionSpec {
    name: string;
    validator?: Record<string, unknown>;
    indexes: IndexSpec[];
}

const gastosSpec: CollectionSpec = {
    name: "gastos",
    validator: {
        $jsonSchema: {
            bsonType: "object", required: ["eventId", "importe", "createdAt"], properties: {
                eventId: {bsonType: "string"},
                importe: {bsonType: "decimal"},
                descripcion: {bsonType: ["string", "null"]},
                proveedor: {bsonType: ["string", "null"]},
                comprobado: {bsonType: "bool"},
                createdAt: {bsonType: "date"},
                updatedAt: {bsonType: "date"},
            }
        }
    },
    indexes: [
        {name: "IX_gastos_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
        {name: "IX_gastos_eventId_comprobado_createdAt", key: {eventId: 1, comprobado: 1, createdAt: -1}},
        {name: "IX_gastos_texto", key: {descripcion: "text", proveedor: "text"}},
    ],
};

const reservasSpec: CollectionSpec = {
    name: "reservas",
    validator: {
        $jsonSchema: {
            bsonType: "object", required: ["eventId", "estado", "createdAt"], properties: {
                eventId: {bsonType: "string"}, estado: {enum: ["pendiente", "confirmada", "cancelada"]},
                createdAt: {bsonType: "date"}, updatedAt: {bsonType: "date"},
            }
        }
    },
    indexes: [
        {name: "IX_reservas_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
        {name: "IX_reservas_eventId_estado_createdAt", key: {eventId: 1, estado: 1, createdAt: -1}},
    ],
};

const preciosSpec: CollectionSpec = {
    name: "precios",
    validator: {
        $jsonSchema: {
            bsonType: "object", required: ["eventId", "productoId", "precio", "createdAt"], properties: {
                eventId: {bsonType: "string"}, productoId: {bsonType: "string"}, precio: {bsonType: "decimal"},
                createdAt: {bsonType: "date"}, updatedAt: {bsonType: "date"},
            }
        }
    },
    indexes: [
        {name: "UX_precios_eventId_productoId", key: {eventId: 1, productoId: 1}, unique: true},
        {name: "IX_precios_eventId_createdAt", key: {eventId: 1, createdAt: -1}},
    ],
};

const eventConfigsSpec: CollectionSpec = {
    name: "eventConfigs",
    validator: {
        $jsonSchema: {
            bsonType: "object", required: ["eventId", "clave"], properties: {
                eventId: {bsonType: "string"},
                clave: {bsonType: "string"},
                valor: {},
                createdAt: {bsonType: "date"},
                updatedAt: {bsonType: "date"},
            }
        }
    },
    indexes: [{name: "UX_eventConfigs_eventId_clave", key: {eventId: 1, clave: 1}, unique: true}],
};

const SPECS: CollectionSpec[] = [gastosSpec, reservasSpec, preciosSpec, eventConfigsSpec];

export async function ensureMongoArtifacts(db: Db | undefined | null): Promise<void> {
    if (!db) throw new Error("ensureMongoArtifacts: Db indefinido. Pásame un Db válido.");

    for (const spec of SPECS) {
        const exists = await db.listCollections({name: spec.name}).hasNext();

        if (!exists) {
            await db.createCollection(
                spec.name,
                spec.validator ? {
                    validator: spec.validator,
                    validationLevel: "strict",
                    validationAction: "error"
                } : undefined
            );
        } else if (spec.validator) {
            await db.command({
                collMod: spec.name,
                validator: spec.validator,
                validationLevel: "strict",
                validationAction: "error",
            });
        }

        if (spec.indexes.length > 0) {
            await db.collection(spec.name).createIndexes(
                spec.indexes.map(ix => ({name: ix.name, key: ix.key, unique: ix.unique === true}))
            );
        }
    }
}
