// src/config/env.ts
import "dotenv/config";
import {z} from "zod";

const EnvZ = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_DIR: z.string().optional(),
    LOG_FILE: z.string().optional(), // si no se pone, usará ./logs/app.log en el logger
    LOG_LEVEL: z.enum(["debug", "info", "error"]).default("info"),
    CORS_ORIGINS: z
        .string()
        .default("")
        .transform((s) =>
            s
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
        ), // -> string[]
    SWAGGER_ENABLE: z
        .string()
        .default("true")
        .transform((v) => ["1", "true", "yes", "on"].includes(v.toLowerCase())),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    MONGODB_DB: z.string().min(1, "MONGODB_DB is required"),
});

export type Env = z.infer<typeof EnvZ>;

export function getEnv(): Env {
    const parsed = EnvZ.safeParse(process.env);
    if (!parsed.success) {
        // Mensaje claro de qué falta o está mal
        const flat = parsed.error.flatten();
        const missing = Object.keys(flat.fieldErrors).map(
            (k) => `${k}: ${(flat.fieldErrors[k] ?? []).join(", ")}`
        );
        console.error("Invalid environment variables:\n - " + missing.join("\n - "));
        throw new Error("Invalid environment variables");
    }
    return parsed.data;
}
