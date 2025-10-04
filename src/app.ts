import Fastify from "fastify";
import {buildLoggerOptions} from "./core/logging/logger.js";
import corsPlugin from "./plugins/cors.js";
import swaggerPlugin from "./plugins/swagger.js";
import {healthRoutes} from "./routes/health.routes.js";

export async function buildApp() {
    const app = Fastify({
        logger: buildLoggerOptions(),
        disableRequestLogging: true
    });

    await app.register(corsPlugin);
    await app.register(swaggerPlugin);
    await app.register(healthRoutes, {prefix: "/health"});


    app.addHook("onResponse", async (req, reply) => {
        req.log.info(
            {
                statusCode: reply.statusCode,
                method: req.method,
                url: req.url,
                responseTime: reply.elapsedTime
            },
            "request completed"
        );
    });

    app.setNotFoundHandler((req, reply) => {
        req.log.warn({url: req.url, method: req.method}, "route not found");
        reply.code(404).send({ok: false, error: "Not Found"});
    });

    app.setErrorHandler((err, _req, reply) => {
        const status = typeof (err as any).statusCode === "number" ? (err as any).statusCode : 500;
        const payload =
            process.env.NODE_ENV === "production"
                ? {ok: false, error: err.message}
                : {ok: false, error: err.message, stack: err.stack};
        reply.code(status).send(payload);
    });

    return app;
}
