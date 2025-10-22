// src/infra/mongo/crud.ts
import type {Db, Document, Filter, WithId, UpdateFilter} from 'mongodb';
import {ObjectId} from 'mongodb';

/** Envoltorio de página (cursor-based) */
export type CursorPage<T> = {
    items: T[];
    page: { limit: number; nextCursor?: string | null; total: number };
};

/**
 * Contrato del repositorio CRUD
 * NOTA: Mantiene la superficie existente (nombres y firmas).
 */
export interface CrudRepo<TDomain, TCreate, TUpdate, TQuery extends Filter<Document>> {
    create(db: Db, data: TCreate): Promise<TDomain>;

    getById(db: Db, id: string): Promise<TDomain | null>;

    /**
     * Listado basado en cursor.
     * - `options.after` es el _id (string) del último documento visto.
     * - Orden configurable mediante metacampos en `query`:
     *    - `__sortBy`  : string (ej. 'createdAt', 'updatedAt', 'amount'… limitado por cada módulo).
     *    - `__sortDir` : 'asc' | 'desc'.
     *   Si no vienen, se usa `defaultSort` y, si tampoco, fallback { createdAt: -1, _id: -1 }.
     */
    list(
        db: Db,
        query: TQuery,
        options?: { limit?: number; after?: string | null },
    ): Promise<CursorPage<TDomain>>;

    updateById(db: Db, id: string, data: TUpdate): Promise<TDomain | null>;

    patch(db: Db, id: string, data: Partial<TUpdate>): Promise<TDomain | null>;

    /** Soft delete si está habilitado; si no, hard delete */
    softDelete(db: Db, id: string): Promise<void>;

    /** Hard delete siempre */
    removeHard(db: Db, id: string): Promise<void>;
}

/** Opciones de construcción del CRUD */
export interface CrudOptions<TDomain, TCreate, TUpdate> {
    /** Nombre de la colección */
    collection: string;

    /** Mapea payloads de create/update al documento Mongo */
    toDb: (data: TCreate | TUpdate | Partial<TUpdate>) => Document;

    /** Mapea documento Mongo a dominio */
    fromDb: (doc: WithId<Document>) => TDomain;

    /**
     * Orden por defecto para listar. Recomendado: { createdAt: -1, _id: -1 }.
     * Si se omite, se aplica fallback { createdAt: -1, _id: -1 }.
     */
    defaultSort?: Record<string, 1 | -1>;

    /**
     * Si true (por defecto), softDelete marcará isActive=false.
     * Si false, softDelete realizará deleteOne (hard).
     */
    softDelete?: boolean;
}

/** Asegura un ObjectId válido a partir de string */
function ensureObjectId(id: string): ObjectId {
    if (ObjectId.isValid(id)) return new ObjectId(id);
    throw new Error(`Invalid ObjectId: ${id}`);
}

/** Extrae y limpia metacampos de orden del query sin mutarlo */
function extractSortMeta<TQuery extends Filter<Document>>(query: TQuery): {
    clean: TQuery;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
} {
    const copy = {...(query as Record<string, unknown>)};
    const sortBy = typeof copy.__sortBy === 'string' ? (copy.__sortBy as string) : undefined;
    const sortDir = copy.__sortDir === 'asc' || copy.__sortDir === 'desc' ? (copy.__sortDir as 'asc' | 'desc') : undefined;
    delete copy.__sortBy;
    delete copy.__sortDir;
    return {clean: copy as TQuery, sortBy, sortDir};
}

/** Construye un sort estable añadiendo `_id` como desempate en la MISMA dirección */
function buildStableSort(
    sortBy: string | undefined,
    sortDir: 'asc' | 'desc' | undefined,
    defaultSort?: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
    if (sortBy) {
        const dir: 1 | -1 = sortDir === 'asc' ? 1 : -1;
        return {[sortBy]: dir, _id: dir};
    }
    if (defaultSort && Object.keys(defaultSort).length > 0) {
        // Garantizamos _id como desempate. Si ya está, lo respetamos.
        const hasId = Object.prototype.hasOwnProperty.call(defaultSort, '_id');
        if (hasId) return defaultSort;
        const [firstKey] = Object.keys(defaultSort);
        const dir = defaultSort[firstKey] as 1 | -1;
        return {...defaultSort, _id: dir};
    }
    // Fallback recomendado del proyecto
    return {createdAt: -1, _id: -1};
}

/**
 * Construye el filtro "after" coherente con el orden actual.
 * - Para DESC: "siguientes" son < valor principal; empate por `_id` <.
 * - Para ASC: al revés (> ; `_id` >).
 */
function buildAfterFilter(sortDoc: Record<string, 1 | -1>, lastDoc: WithId<Document> | null): Filter<Document> | null {
    if (!lastDoc) return null;
    const keys = Object.keys(sortDoc).filter((k) => k !== '_id');
    const primary = keys.length > 0 ? keys[0] : '_id';
    const dir: 1 | -1 = sortDoc[primary] ?? -1;
    const isDesc = dir === -1;

    const raw = lastDoc[primary as keyof Document];

    // Si no hay campo principal en el doc del cursor, comparamos solo por _id
    if (raw === undefined || raw === null) {
        return isDesc ? ({_id: {$lt: lastDoc._id}} as Filter<Document>) : ({_id: {$gt: lastDoc._id}} as Filter<Document>);
    }

    // Normalización básica (fecha ISO → Date)
    const main =
        raw instanceof Date ? raw : typeof raw === 'string' ? new Date(raw) : (raw as unknown);

    const mainOp = isDesc ? '$lt' : '$gt';
    const tieOp = isDesc ? '$lt' : '$gt';

    return {
        $or: [
            {[primary]: {[mainOp]: main}} as Filter<Document>,
            {[primary]: main, _id: {[tieOp]: lastDoc._id}} as Filter<Document>,
        ],
    };
}

/**
 * Crea un CRUD tipado para una colección Mongo.
 * Mantiene nombres/firmas existentes y añade ordenación + cursor estable.
 */
export function makeCrud<TDomain, TCreate, TUpdate, TQuery extends Filter<Document> = Filter<Document>>(
    opts: CrudOptions<TDomain, TCreate, TUpdate>,
): CrudRepo<TDomain, TCreate, TUpdate, TQuery> {
    const {collection, toDb, fromDb, defaultSort, softDelete = true} = opts;

    return {
        /** Crea un documento (inyecta createdAt/updatedAt y isActive si aplica) */
        async create(db, data) {
            const col = db.collection(collection);
            const now = new Date();
            const doc = {
                ...toDb(data),
                createdAt: now,
                updatedAt: now,
                ...(softDelete ? {isActive: true} : {}),
            };
            const res = await col.insertOne(doc);
            const inserted = await col.findOne({_id: res.insertedId});
            if (!inserted) throw new Error('Insert failed: document not found');
            return fromDb(inserted as WithId<Document>);
        },

        /** Obtiene por _id */
        async getById(db, id) {
            const col = db.collection(collection);
            const _id = ensureObjectId(id);
            const doc = await col.findOne({_id});
            return doc ? fromDb(doc as WithId<Document>) : null;
        },

        /**
         * Listado con paginación por cursor + orden estable.
         * - Lee __sortBy/__sortDir del query y los elimina del filtro antes del find().
         */
        async list(db, query, options) {
            const col = db.collection(collection);
            const {clean, sortBy, sortDir} = extractSortMeta(query);
            const sortDoc = buildStableSort(sortBy, sortDir, defaultSort);

            const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
            const after = options?.after ?? null;

            // Filtro base (si usas soft delete, lo aplicas fuera con clean, aquí no forzamos nada)
            const baseFilter: Filter<Document> = {...(clean as Filter<Document>)};

            // Filtro "after" según el orden
            let last: WithId<Document> | null = null;
            if (after) {
                try {
                    const _after = ensureObjectId(after);
                    last = (await col.findOne(
                        {_id: _after},
                        {projection: {_id: 1, createdAt: 1, updatedAt: 1}},
                    )) as WithId<Document> | null;
                } catch {
                    last = null; // after inválido → lo ignoramos
                }
            }
            const afterFilter = buildAfterFilter(sortDoc, last);

            const finalFilter: Filter<Document> =
                afterFilter ? ({$and: [baseFilter, afterFilter]} as Filter<Document>) : baseFilter;

            // Total sin aplicar after (total del conjunto filtrado)
            const total = await col.countDocuments(baseFilter);

            // Consulta principal
            const docs = await col.find(finalFilter).sort(sortDoc).limit(limit).toArray();

            const items = docs.map((d) => fromDb(d as WithId<Document>));
            const nextCursor = docs.length > 0 ? String((docs[docs.length - 1] as WithId<Document>)._id) : null;

            return {
                items,
                page: {limit, nextCursor, total},
            };
        },

        /** Reemplazo total (PUT) por _id; devuelve el doc actualizado o null */
        async updateById(db, id, data) {
            const col = db.collection(collection);
            const _id = ensureObjectId(id);
            const update: UpdateFilter<Document> = {
                $set: {...toDb(data as TUpdate), updatedAt: new Date()},
            };
            const res = await col.findOneAndUpdate({_id}, update, {returnDocument: 'after'});
            const updated = res?.value;
            if (!updated) return null;
            return fromDb(updated as WithId<Document>);
        },

        /** Actualización parcial (PATCH) por _id; devuelve el doc actualizado o null */
        async patch(db, id, data) {
            const col = db.collection(collection);
            const _id = ensureObjectId(id);
            const update: UpdateFilter<Document> = {
                $set: {...toDb(data as Partial<TUpdate>), updatedAt: new Date()},
            };
            const res = await col.findOneAndUpdate({_id}, update, {returnDocument: 'after'});
            const updated = res?.value;
            if (!updated) return null;
            return fromDb(updated as WithId<Document>);
        },

        /**
         * Soft delete / Hard delete según configuración.
         * - Si `softDelete=true` (por defecto): marca isActive=false y actualiza updatedAt.
         * - Si `softDelete=false`: elimina físicamente.
         */
        async softDelete(db, id) {
            const col = db.collection(collection);
            const _id = ensureObjectId(id);
            if (softDelete) {
                await col.updateOne({_id}, {$set: {isActive: false, updatedAt: new Date()}});
            } else {
                await col.deleteOne({_id});
            }
        },

        /** Hard delete incondicional */
        async removeHard(db, id) {
            const col = db.collection(collection);
            const _id = ensureObjectId(id);
            await col.deleteOne({_id});
        },
    };
}
