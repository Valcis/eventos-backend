import type { Db, Document, Filter, WithId, UpdateFilter } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { SortBy, SortDir } from '../../shared/types/sort';
import { buildAfterFilter } from '../../shared/lib/cursor';

/** Cursor page envelope */
export type CursorPage<T> = {
	items: T[];
	page: { limit: number; nextCursor: string | null; total: number };
};

/** List options con sort dinámico */
export type ListOptions = {
	limit?: number;
	after?: string | null;
	sortBy?: SortBy;
	sortDir?: SortDir;
};

/** CRUD repo surface */
export interface CrudRepo<TDomain, TCreate, TUpdate, TQuery extends Filter<Document>> {
	create(db: Db, data: TCreate): Promise<TDomain>;

	getById(db: Db, id: string): Promise<TDomain | null>;

	/** Cursor-based listing con sort dinámico */
	list(db: Db, query: TQuery, options?: ListOptions): Promise<CursorPage<TDomain>>;

	/** Full update */
	update(db: Db, id: string, data: TUpdate): Promise<TDomain | null>;

	/** Partial update / patch */
	patch(db: Db, id: string, data: Partial<TUpdate>): Promise<TDomain | null>;

	/** Soft delete uses isActive=false if enabled; else hard delete */
	softDelete(db: Db, id: string): Promise<void>;

	/** Always hard delete */
	removeHard(db: Db, id: string): Promise<void>;
}

export interface CrudOptions<TDomain, TCreate, TUpdate> {
	/** Mongo collection name */
	collection: string;
	/** Map incoming create/update payloads to a MongoDB document */
	toDb: (data: TCreate | TUpdate | Partial<TUpdate>) => Document;
	/** Map a MongoDB document to a domain object */
	fromDb: (doc: WithId<Document>) => TDomain;
	/** Default sort field; defaults to 'createdAt' */
	defaultSortBy?: SortBy;
	/** Default sort direction; defaults to 'desc' */
	defaultSortDir?: SortDir;
	/** If true (default), softDelete will set isActive=false instead of deleting */
	softDelete?: boolean;
}

/** Ensure a valid ObjectId from string input */
function ensureObjectId(id: string): ObjectId {
	if (ObjectId.isValid(id)) return new ObjectId(id);
	throw new Error(`Invalid ObjectId: ${id}`);
}

/** Build a strongly-typed CRUD repository for a collection */
export function makeCrud<
	TDomain,
	TCreate,
	TUpdate,
	TQuery extends Filter<Document> = Filter<Document>,
>(opts: CrudOptions<TDomain, TCreate, TUpdate>): CrudRepo<TDomain, TCreate, TUpdate, TQuery> {
	const {
		collection,
		toDb,
		fromDb,
		defaultSortBy = 'createdAt',
		defaultSortDir = 'desc',
		softDelete = true,
	} = opts;

	return {
		async create(db, data) {
			const col = db.collection(collection);
			const now = new Date();
			const doc = {
				...toDb(data),
				createdAt: now,
				updatedAt: now,
				...(softDelete ? { isActive: true } : {}),
			};
			const res = await col.insertOne(doc);
			const inserted = await col.findOne({ _id: res.insertedId });
			if (!inserted) throw new Error('Insert failed: document not found');
			return fromDb(inserted as WithId<Document>);
		},

		async getById(db, id) {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			const doc = await col.findOne({ _id });
			return doc ? fromDb(doc as WithId<Document>) : null;
		},

		async list(db: Db, query: TQuery, options?: ListOptions): Promise<CursorPage<TDomain>> {
			const col = db.collection(collection);

			// Normalizar options con valores por defecto
			const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
			const after = options?.after ?? null;
			const sortBy = options?.sortBy ?? defaultSortBy;
			const sortDir = options?.sortDir ?? defaultSortDir;

			// Construir el sort de Mongo
			const mongoSortDir = sortDir === 'asc' ? 1 : -1;
			const mongoSort: Record<string, 1 | -1> = {
				[sortBy]: mongoSortDir,
				_id: mongoSortDir, // tie-breaker
			};

			// Construir filtro base
			let finalFilter: Filter<Document> = { ...(query as Filter<Document>) };

			// Si hay cursor, obtener el documento y construir el filtro de after
			if (after !== null && after !== '') {
				try {
					const afterId = ensureObjectId(after);
					const cursorDoc = await col.findOne({ _id: afterId });

					if (cursorDoc) {
						// Construir filtro avanzado usando el helper
						const afterFilter = buildAfterFilter(
							sortBy,
							sortDir,
							cursorDoc as { [k in SortBy]?: unknown } & { _id: ObjectId },
						);

						// Combinar el filtro base con el filtro de cursor
						finalFilter = {
							$and: [finalFilter, afterFilter],
						} as Filter<Document>;
					}
				} catch (error) {
					// Si el cursor es inválido, ignorarlo y continuar sin paginación
					console.warn('Invalid cursor provided:', after, error);
				}
			}

			// Obtener total (sobre el query original, no el filtro con cursor)
			const total: number = await col.countDocuments(query as Filter<Document>);

			// Ejecutar query con sort y limit
			const docs = await col
				.find<WithId<Document>>(finalFilter)
				.sort(mongoSort)
				.limit(limit)
				.toArray();

			// Mapear items
			const items: TDomain[] = docs.map((d) => fromDb(d));

			// Calcular nextCursor
			const lastDoc = docs.at(-1);
			const nextCursor: string | null =
				docs.length === limit && lastDoc !== undefined ? String(lastDoc._id) : null;

			return { items, page: { limit, nextCursor, total } };
		},

		async update(db: Db, id: string, data: TUpdate): Promise<TDomain | null> {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			const doc = toDb(data);

			const res = await col.findOneAndReplace(
				{ _id },
				{
					...doc,
					updatedAt: new Date(),
				},
				{ returnDocument: 'after' as const },
			);

			const updated = res?.value;
			if (!updated) return null;

			return fromDb(updated as WithId<Document>);
		},

		async patch(db: Db, id: string, data: Partial<TUpdate>): Promise<TDomain | null> {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			const update: UpdateFilter<Document> = {
				$set: { ...toDb(data as Partial<TUpdate>), updatedAt: new Date() },
			};
			const res = await col.findOneAndUpdate({ _id }, update, {
				returnDocument: 'after' as const,
			});
			const updated = res?.value;
			if (!updated) return null;

			return fromDb(updated as WithId<Document>);
		},

		async softDelete(db, id) {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			if (softDelete) {
				await col.updateOne({ _id }, { $set: { isActive: false, updatedAt: new Date() } });
			} else {
				await col.deleteOne({ _id });
			}
		},

		async removeHard(db, id) {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			await col.deleteOne({ _id });
		},
	};
}
