// src/core/logging/logger.ts
import fs from "node:fs";
import path from "node:path";
import type { FastifyServerOptions } from "fastify";
import {getEnv} from "../../config/env";

/**
 * Reglas:
 * - Si LOG_FILE está definido → usarlo tal cual como archivo.
 * - Si no, usar LOG_DIR/app.log (o ./logs/app.log por defecto).
 * - Crear SOLO el directorio contenedor, nunca el archivo.
 */
export function buildLoggerOptions(): NonNullable<FastifyServerOptions["logger"]> {
    const logDirEnv = getEnv().LOG_DIR ?? "./logs";
    const logFileEnv = getEnv().LOG_FILE; // opcional

    const logFile = logFileEnv ?? path.join(logDirEnv, "app.log");
    const logDir = path.dirname(logFile);

    // Crear el directorio contenedor; NO crear el archivo
    fs.mkdirSync(logDir, { recursive: true });

    return {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
        transport: {
            targets: [
                {
                    target: "pino-pretty",
                    options: { colorize: true, translateTime: "SYS:standard" },
                    level: process.env.NODE_ENV === "production" ? "info" : "debug",
                },
                {
                    target: "pino/file",
                    options: {
                        destination: logFile, // ← archivo final
                        mkdir: false,         // ya creamos el directorio arriba
                    },
                    level: "debug",
                },
            ],
        },
    };
}
