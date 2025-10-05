// NOTE: Stubs aligned to FastifyPluginAsync pattern (no fastify-plugin wrapper).
// Routes: GET list (V1 pagination), POST create, PUT update, DELETE remove.
// Validators/Indexes: module-local stubs exported in artifacts.ts (to be wired in infra/mongo/artifacts.ts).
// Keep request/response schemas loose while we migrate from localrepo; tighten later.

export const eventConfigsValidator = {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["eventId"],
            properties: {
                eventId: {bsonType: ["string", "objectId"]},
                // TODO: add embedded 'selectores' shapes from localrepo (Comercial, MetodoPago, etc.)
                selectores: {bsonType: "object", additionalProperties: true},
                presets: {bsonType: "object", additionalProperties: true}
            },
            additionalProperties: true
        }
    },
    validationLevel: "strict" as const
};

export const eventConfigsIndexes = [
    // eventId unique (one config per event)
    {keys: {eventId: 1}, options: {unique: true, name: "ux_event_configs_eventId"}}
] as const;
