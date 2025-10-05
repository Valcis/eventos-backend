export const eventConfigsValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                selectores: {
                    bsonType: "object",
                    additionalProperties: false,
                    patternProperties: {
                        "^[a-zA-Z0-9_.-]$": {bsonType: ["string", "bool", "int", "long", "double", "null", "object", "array"]}
                    }
                },
                presets: {
                    bsonType: "object",
                    additionalProperties: false,
                    patternProperties: {
                        "^[a-zA-Z0-9_.-]$": {
                            bsonType: "object",
                            additionalProperties: true
                        }
                    }
                }
            },
            additionalProperties: false
        }
    },
    validationLevel: "strict" as const
};

export const eventConfigsIndexes = [
    // eventId unique (one config per event)
    {keys: {eventId: 1}, options: {unique: true, name: "ux_event_configs_eventId"}}
] as const;
