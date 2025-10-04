import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { getEnv } from "../config/env";

export default fp(async (app: FastifyInstance) => {
    // Activa/desactiva Swagger según ENV (booleano)
    if (!getEnv().SWAGGER_ENABLE) return;

    await app.register(swagger, {
        openapi: {
            info: { title: "EVENTOS API", version: "1.0.0" }
        }
    });

    await app.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: { docExpansion: "list", deepLinking: false }
    });
});
