export const preciosValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "concepto", "importe", "moneda", "isActive"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                concepto: {bsonType: "string"},
                importe: {bsonType: "decimal", minimum: 0},
                moneda: {bsonType: "string"},
                isActive: {bsonType: "bool"},
                createdAt: {bsonType: ["date", "string"]},
                updatedAt: {bsonType: ["date", "string"]}
            },
            additionalProperties: false
        }
    },
    validationLevel: "strict" as const
};

export const preciosIndexes = [
    {keys: {eventId: 1}, options: {name: "ix_precios_eventId"}}
] as const;
