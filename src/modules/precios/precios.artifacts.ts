// NOTE: Stubs aligned to FastifyPluginAsync pattern (no fastify-plugin wrapper).
// Routes: GET list (V1 pagination), POST create, PUT update, DELETE remove.
// Validators/Indexes: module-local stubs exported in artifacts.ts (to be wired in infra/mongo/artifacts.ts).
// Keep request/response schemas loose while we migrate from localrepo; tighten later.

export const preciosValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "concepto", "importe", "moneda", "isActive"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                concepto: {bsonType: "string"},
                importe: {bsonType: "number", minimum: 0},
                moneda: {bsonType: "string"},
                isActive: {bsonType: "bool"},
                createdAt: {bsonType: ["date", "string"]},
                updatedAt: {bsonType: ["date", "string"]}
            },
            additionalProperties: false
        }
    },
    // durante migración, usa "moderate"; cuando limpies datos, subimos a "strict"
    validationLevel: "moderate" as const
};

export const preciosIndexes = [
    {keys: {eventId: 1}, options: {name: "ix_precios_eventId"}}
] as const;
