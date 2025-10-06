import "dotenv/config";
import { z } from "zod";

const EnvZ = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "error"]).default("info"),
    LOG_FILE: z.string().optional(),
    LOG_DIR: z.string().default("./logs"),
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
    MONGO_BOOT: z.string().default("0"),
    MONGO_URL: z.string().min(1, "MONGO_URL is required")
});

export type Env = z.infer<typeof EnvZ>;

export function getEnv(): Env {
    const parsed = EnvZ.safeParse(process.env);
    if (!parsed.success) {
        const flat = parsed.error.flatten();
        const details = Object.entries(flat.fieldErrors)
            .map(([k, v]) => `- ${k}: ${v?.join(", ") ?? "invalid"}`)
            .join("\n");
        // Mensaje conciso en consola (sin volcar todo el error)
        // eslint-disable-next-line no-console
        console.error(`Invalid environment variables:\n${details}`);
        throw new Error("Invalid environment variables");
    }
    return parsed.data;
}
