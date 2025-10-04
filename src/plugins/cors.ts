// src/plugins/cors.ts
import fp from "fastify-plugin";
import cors from "@fastify/cors";

type OriginsInput = string | string[] | boolean | undefined;

function normalizeOrigins(input: OriginsInput): boolean | string[] {
    // Si es boolean → úsalo tal cual
    if (typeof input === "boolean") return input;

    // Si es array → límpialo
    if (Array.isArray(input)) {
        const arr = input.map(String).map((s) => s.trim()).filter(Boolean);
        // Si está "*" en la lista, equivale a permitir todo
        if (arr.includes("*")) return true;
        return arr;
    }

    // Si es string → "a,b,c" -> ["a","b","c"]
    const str = (input ?? "").toString().trim();
    if (str === "") return false; // por defecto, no permitir nada (ajústalo si prefieres true)
    if (str === "*") return true;
    return str.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface CorsPluginOpts {
    origins?: OriginsInput;     // p.ej. 'http://localhost:3000,https://midominio.com' o ['http://...', 'https://...'] o true/false
    credentials?: boolean;      // opcional
}

export default fp<CorsPluginOpts>(async (app, opts) => {
    const originSetting = normalizeOrigins(
        // prioridad: opción explícita > ENV > nada
        opts.origins ?? process.env.CORS_ORIGINS
    );

    await app.register(cors, {
        origin: originSetting,               // boolean | string[]
        credentials: opts.credentials ?? true,
        // otros ajustes si los necesitas:
        // methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        // allowedHeaders: ["Content-Type", "Authorization"],
    });
});
