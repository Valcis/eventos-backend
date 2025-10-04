import Fastify from "fastify";
import {buildLoggerOptions} from "./core/logging/logger.js";
import corsPlugin from "./plugins/cors.js";
import swaggerPlugin from "./plugins/swagger.js";
import {healthRoutes} from "./routes/health.routes.js";
import eventConfigsRoutes from './modules/event-configs/eventConfigs.routes.js';
import preciosRoutes from './modules/precios/precios.routes.js';
import gastosRoutes from './modules/gastos/gastos.routes.js';
import reservasRoutes from './modules/reservas/reservas.routes.js';

export async function buildApp() {
    const app = Fastify({
        logger: buildLoggerOptions(),
        disableRequestLogging: true

        /*(Opcional) Boot de artefactos cuando lo habilitemos por env:
         if (getEnv().MONGO_BOOT === '1') {
           await ensureMongoArtifacts();
         }*/
    });

    await app.register(corsPlugin);
    await app.register(swaggerPlugin);
    await app.register(healthRoutes, {prefix: "/health"});
    await app.register(eventConfigsRoutes, {prefix: '/api/event-configs'});
    await app.register(preciosRoutes, {prefix: '/api/precios0' +
            ''});
    await app.register(gastosRoutes, {prefix: '/api/gastos'});
    await app.register(reservasRoutes, {prefix: '/api/reservas'});


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

    app.ready(err => {
        if (err) app.log.error(err);
        app.log.info('\n' + app.printRoutes());
    });

    return app;
}
