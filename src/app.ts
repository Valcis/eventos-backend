import Fastify from "fastify";
import { MongoClient } from "mongodb";
import {buildLoggerOptions} from "./core/logging/logger";
import corsPlugin from "./plugins/cors";
import swaggerPlugin from "./plugins/swagger";
import {healthRoutes} from "./routes/health.routes";
import eventConfigsRoutes from './modules/event-configs/eventConfigs.routes';
import preciosRoutes from './modules/precios/precios.routes';
import gastosRoutes from './modules/gastos/gastos.routes';
import reservasRoutes from './modules/reservas/reservas.routes';
import {getEnv} from "./config/env";
import { ensureMongoArtifacts } from "./infra/mongo/artifacts";
import requestId from "./core/logging/requestId";


const env = getEnv();

export async function buildApp() {
    const mongoUrl = env.MONGO_URL;
    const client = new MongoClient(mongoUrl);
    await client.connect();

    const dbName = env.MONGODB_DB
    const db = client.db(dbName);
    const app = Fastify({
        logger: buildLoggerOptions(),
        disableRequestLogging: true
    });

    app.decorate("db", db);

    //(Opcional) Boot de artefactos cuando lo habilitemos por env:
    if (env.MONGO_BOOT === '1') {
        try {
            await ensureMongoArtifacts(db);
            app.log.info('Mongo artifacts ensured ✔');
        } catch (err) {
            app.log.error({err}, 'Mongo artifacts failed');
            throw err; // si quieres abortar el boot si falla
        }
    }

    await app.register(requestId);
    await app.register(corsPlugin);
    await app.register(swaggerPlugin);
    await app.register(healthRoutes, {prefix: "/health"});
    await app.register(eventConfigsRoutes, {prefix: '/api/event-configs'});
    await app.register(preciosRoutes, {prefix: '/api/precios'});
    await app.register(gastosRoutes, {prefix: '/api/gastos'});
    await app.register(reservasRoutes, {prefix: '/api/reservas'});


    app.addHook("onResponse", async (req, reply) => {
        req.log.info({
            statusCode: reply.statusCode,
            method: req.method,
            url: req.url,
            responseTime: reply.elapsedTime
        }, "request completed");
    });

    app.addHook('onRoute', (r) => {
        app.log.info({method: r.method, url: r.url, routePrefix: (r as any).prefix}, 'ROUTE_ADDED');
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
        if (process.env.NODE_ENV !== 'production') {
            //app.log.info('\n' +app.printRoutes()); // Print de arbol de rutas
        }
    });

    return app;
}