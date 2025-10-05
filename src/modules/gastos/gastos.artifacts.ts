// NOTE: Stubs aligned to FastifyPluginAsync pattern (no fastify-plugin wrapper).
// Routes: GET list (V1 pagination), POST create, PUT update, DELETE remove.
// Validators/Indexes: module-local stubs exported in artifacts.ts (to be wired in infra/mongo/artifacts.ts).
// Keep request/response schemas loose while we migrate from localrepo; tighten later.

export const gastosValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "producto", "cantidad", "tipoPrecio", "precioBase", "precioNeto", "isActive", "comprobado", "locked"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                producto: {bsonType: "string"},
                unidadId: {bsonType: "string"},
                cantidad: {bsonType: "decimal", minimum: 0},
                tipoPrecio: {enum: ["con IVA", "sin IVA"]},
                tipoIVA: {bsonType: "decimal", minimum: 0},
                precioBase: {bsonType: "decimal", minimum: 0},
                precioNeto: {bsonType: "decimal", minimum: 0},
                isPack: {bsonType: "bool"},
                unidadesPack: {bsonType: ["int", "null"], minimum: 1},
                precioUnidad: {bsonType: ["number", "null"], minimum: 0},
                pagadorId: {bsonType: ["string", "null"]},
                tiendaId: {bsonType: ["string", "null"]},
                notas: {bsonType: ["string", "null"]},
                comprobado: {bsonType: "bool"},
                locked: {bsonType: "bool"},
                isActive: {bsonType: "bool"},
                createdAt: {bsonType: ["date", "string"]},
                updatedAt: {bsonType: ["date", "string"]}
            },
            additionalProperties: false
        }
    },
    validationLevel: "strict" as const
};

export const gastosIndexes = [
    {keys: {eventId: 1}, options: {name: "ix_gastos_eventId"}}
] as const;
