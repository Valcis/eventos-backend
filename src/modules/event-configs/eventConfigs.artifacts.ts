/**
 * Validator e índices para la colección event-configs
 * - Regla Bizum reforzada con oneOf
 */

export const eventConfigsValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId", "metodosPago", "selectores"],
            properties: {
                _id: { bsonType: "objectId" },
                eventId: { bsonType: "string", description: "ID lógico del evento (único)" },

                metodosPago: {
                    bsonType: "array",
                    minItems: 1,
                    items: {
                        bsonType: "object",
                        required: ["nombre"],
                        properties: {
                            nombre: { bsonType: "string" },
                            requiereReceptor: { bsonType: "bool" },
                            receptor: { bsonType: ["string", "null"] },
                            notas: { bsonType: ["string", "null"] },
                            isActive: { bsonType: "bool" }
                        },
                        oneOf: [
                            // Caso Bizum: requiereReceptor === true
                            {
                                properties: {
                                    nombre: { enum: ["bizum"] },
                                    requiereReceptor: { enum: [true] }
                                    // Si quieres forzar receptor obligatorio en Bizum:
                                    // receptor: { bsonType: "string" }
                                },
                                required: ["nombre", "requiereReceptor"]
                            },
                            // Resto de métodos
                            {
                                properties: {
                                    nombre: { not: { enum: ["bizum"] } }
                                }
                            }
                        ]
                    }
                },

                // Selectores (pares clave-valor usados por la UI)
                selectores: {
                    bsonType: "object",
                    patternProperties: {
                        // 1+ caracteres válidos
                        "^[a-zA-Z0-9_.-]+$": {
                            bsonType: [
                                "string",
                                "bool",
                                "int",
                                "long",
                                "double",
                                "null",
                                "object",
                                "array"
                            ]
                        }
                    },
                    additionalProperties: false
                },

                createdAt: { bsonType: ["date", "null"] },
                updatedAt: { bsonType: ["date", "null"] }
            },
            additionalProperties: false
        }
    },
    validationLevel: "strict",
    validationAction: "error"
} as const;

export const eventConfigsIndexes = [
    { keys: { eventId: 1 }, options: { name: "ux_event_configs_eventId", unique: true } }
] as const;
