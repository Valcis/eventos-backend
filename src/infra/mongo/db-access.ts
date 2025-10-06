import {FastifyInstance} from "fastify";
import {Db} from "mongodb";

type AppWithDb = FastifyInstance & { db?: Db };

/** Obtiene la DB decorada. No conecta ni toca ENV. Falla explícito si falta. */
export function requireDb(app: FastifyInstance): Db {
    const db = (app as AppWithDb).db;
    if (!db) {
        throw new Error("app.db no está definido. Debes hacer app.decorate('db', db) en app.ts antes de registrar rutas.");
    }
    return db;
}

/** Alias para compatibilidad con código previo. */
export function getDb(app: FastifyInstance): Db {
    return requireDb(app);
}
