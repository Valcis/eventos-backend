import {buildApp} from './app.js';
import {getEnv} from './config/env.js';
import {getDb} from "./infra/mongo/client";

(async () => {
    const app = await buildApp();
    const port = Number(getEnv().PORT ?? 3000);

    try {
        // inicia swagger aquí si corresponde (ya registrado en buildApp)
        await app.listen({port, host: "0.0.0.0"});
        app.log.info(`Server listening on http://localhost:${port}`);
    } catch (err) {
        app.log.error({err}, "Failed to start server");
        process.exit(1);
    }

    // conectar a Mongo tras levantar el puerto
    try {
        await getDb();
        app.log.info("MongoDB connection established ✔");
    } catch (e) {
        const err = e as Error;
        app.log.error({err}, "✖ MongoDB connection failed  :" + err.message);

    }
})();