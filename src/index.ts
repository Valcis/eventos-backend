import "dotenv/config";
import {buildApp} from "./app.js";
import {getDb} from "./infra/mongo/client.js";
import {getEnv} from "./config/env.js";

process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("UNHANDLED_REJECTION", reason);
});
process.on("uncaughtException", (err) => {
    // eslint-disable-next-line no-console
    console.error("UNCAUGHT_EXCEPTION", err);
    process.exit(1);
});

(async () => {
    const env = getEnv();
    const app = await buildApp();

    try {
        await app.listen({port: env.PORT, host: "0.0.0.0"});
        app.log.info(`Server listening on http://localhost:${env.PORT}`);
    } catch (err) {
        app.log.error({err}, "Failed to start server");
        process.exit(1);
    }

    try {
        await getDb();
        app.log.info("MongoDB connection established ✔");
        // eslint-disable-next-line no-console
        console.log("✅ MongoDB connection OK");
    } catch (e) {
        const err = e as Error;
        app.log.error({err}, "MongoDB connection failed ✖");
        // eslint-disable-next-line no-console
        console.error("❌ MongoDB connection failed:", err.message);
    }

    for (const sig of ["SIGINT", "SIGTERM"] as const) {
        process.on(sig, async () => {
            app.log.info({sig}, "Shutting down…");
            try {
                await app.close();
                process.exit(0);
            } catch (e) {
                app.log.error({e}, "Error during shutdown");
                process.exit(1);
            }
        });
    }
})();
