import Fastify from 'fastify';
import {buildLoggerOptions} from './core/logging/logger.js';
import requestId from './core/logging/requestId.js';
import corsPlugin from './plugins/cors.js';
import healthRoutes from './modules/health/health.routes.js';
import {getEnv} from './config/env.js';
import swaggerUi from "@fastify/swagger-ui";
import swagger from "@fastify/swagger";

export async function buildApp() {
    const app = Fastify({
        logger: buildLoggerOptions(),
        genReqId: () => crypto.randomUUID(),
        trustProxy: true,
        disableRequestLogging: true, // evitamos duplicados con nuestro hook

    });

    app.get("/health", async () => ({ok: true}));

    await app.register(requestId);
    await app.register(corsPlugin, {origins: getEnv().CORS_ORIGINS});

    if (getEnv().SWAGGER_ENABLE === "true") {

        await app.register(swagger, {
            openapi: { info: { title: "EVENTOS API", version: "1.0.0",  description: 'Backend Fastify para EVENTOS' } },
        });

        await app.register(swaggerUi, {
            routePrefix: "/docs",
            uiConfig: {docExpansion: "list", deepLinking: false},
        });
    }

    await app.register(healthRoutes, {prefix: '/api/health'});

    app.setErrorHandler((err, req, reply) => {
        req.log.error({err}, 'Unhandled error');
        const status = (err as any).statusCode ?? 500;
        reply.code(status).send({
            error: {message: err.message, code: (err as any).code ?? 'INTERNAL'}
        });
    });

    app.addHook('onResponse', async (req, reply) => {
        req.log.info({
            statusCode: reply.statusCode,
            method: req.method,
            url: req.url,
            responseTime: reply.elapsedTime + " ms" // milisegundos desde que Fastify recibió la request
        }, 'request completed');
    });

    return app;
}
