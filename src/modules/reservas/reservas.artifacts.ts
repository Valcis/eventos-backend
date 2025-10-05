// NOTE: Stubs aligned to FastifyPluginAsync pattern (no fastify-plugin wrapper).
// Routes: GET list (V1 pagination), POST create, PUT update, DELETE remove.
// Validators/Indexes: module-local stubs exported in artifacts.ts (to be wired in infra/mongo/artifacts.ts).
// Keep request/response schemas loose while we migrate from localrepo; tighten later.

export const reservasValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "cliente", "totalPedido", "pagado", "comprobado", "locked", "isActive"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                cliente: {bsonType: "string"},
                parrilladas: {bsonType: "int", minimum: 0},
                picarones: {bsonType: "int", minimum: 0},
                metodoPagoId: {bsonType: "string"},
                receptorId: {bsonType: "string"},
                tipoConsumoId: {bsonType: "string"},
                comercialId: {bsonType: "string"},
                totalPedido: {bsonType: "number", minimum: 0},
                pagado: {bsonType: "bool"},
                comprobado: {bsonType: "bool"},
                locked: {bsonType: "bool"},
                puntoRecogidaId: {bsonType: ["string", "null"]},
                isActive: {bsonType: "bool"},
                createdAt: {bsonType: ["date", "string"]},
                updatedAt: {bsonType: ["date", "string"]}
            },
            additionalProperties: false
        }
    },
    validationLevel: "moderate" as const
};

export const reservasIndexes = [
    {keys: {eventId: 1}, options: {name: "ix_reservas_eventId"}}
] as const;
