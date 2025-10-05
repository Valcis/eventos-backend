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
                totalPedido: {bsonType: "decimal", minimum: 0},
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
    validationLevel: "strict" as const
};

export const reservasIndexes = [
    {keys: {eventId: 1}, options: {name: "ix_reservas_eventId"}}
] as const;
