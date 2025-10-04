import { getDb } from './client.js';

/**
 * Idempotente. Más adelante añadiremos:
 * - validators (JSON Schema) por colección
 * - índices
 */
export async function ensureMongoArtifacts(): Promise<void> {
    const db = await getDb();
    // Placeholder: no crea/borra nada todavía.
    // Ejemplo futuro:
    // await db.command({ collMod: 'gastos', validator: { $jsonSchema: ... } }).catch(() => {});
}
