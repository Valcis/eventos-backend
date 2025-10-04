import fs from "node:fs";
import path from "node:path";
import type {FastifyServerOptions} from "fastify";
import {getEnv} from "../../config/env.js";

/**
 * Reglas:
 * - Si LOG_FILE está definido → usarlo como archivo.
 * - Si no, usar LOG_DIR/app.log (o ./logs/app.log por defecto).
 * - Crear solo el directorio contenedor (NO el archivo).
 */
export function buildLoggerOptions(): NonNullable<FastifyServerOptions["logger"]> {
    const env = getEnv();
    const filePath = env.LOG_FILE ?? path.join(env.LOG_DIR, "app.log");
    const dirPath = path.dirname(filePath);

    fs.mkdirSync(dirPath, {recursive: true});

    return {
        level: env.LOG_LEVEL,
        transport: {
            targets: [
                {
                    target: "pino-pretty",
                    options: {colorize: true, translateTime: "SYS:standard"},
                    level: env.NODE_ENV === "production" ? "info" : "debug"
                },
                {
                    target: "pino/file",
                    options: {destination: filePath, mkdir: false},
                    level: "debug"
                }
            ]
        }
    };
}
