import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type {FastifyInstance} from "fastify";
import {getEnv} from "../config/env";

export default fp(async (app: FastifyInstance) => {
    // Activa/desactiva Swagger según ENV (booleano)
    if (!getEnv().SWAGGER_ENABLE) return;

    await app.register(swagger, {
        openapi: {
            info: {title: "EVENTOS API", version: "1.1.0"},
            components: {
                schemas: {
                    IdResponse: {
                        type: "object",
                        properties: {
                            data: {
                                type: "object",
                                properties: {id: {type: "string"}},
                                required: ["id"],
                                additionalProperties: false
                            }
                        },
                        required: ["data"], additionalProperties: false
                    },
                    ErrorSchema: {
                        type: "object",
                        properties: {
                            error: {
                                type: "object",
                                properties: {code: {type: "string"}, message: {type: "string"}},
                                required: ["code", "message"], additionalProperties: false
                            }
                        },
                        required: ["error"], additionalProperties: false
                    },
                    Precio: {
                        type: "object",
                        required: ["eventId", "concepto", "importe"],
                        properties: {
                            id: {type: "string"},
                            eventId: {type: "string"},
                            concepto: {type: "string"},
                            importe: {type: "number"},
                            moneda: {type: "string"}
                        },
                        additionalProperties: false
                    }
                }
            }
        }
    });

    await app.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {docExpansion: "list", deepLinking: false}
    });
});
