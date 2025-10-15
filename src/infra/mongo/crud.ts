import type { Db, Document, Filter, WithId, UpdateFilter } from 'mongodb';
import { ObjectId } from 'mongodb';

/** Cursor page envelope */
export type CursorPage<T> = {
	items: T[];
	page: { limit: number; nextCursor?: string | null; total: number };
};

/** CRUD repo surface */
export interface CrudRepo<TDomain, TCreate, TUpdate, TQuery extends Filter<Document>> {
	create(db: Db, data: TCreate): Promise<TDomain>;

	getById(db: Db, id: string): Promise<TDomain | null>;

	/** Cursor-based listing; pass `after` as last seen _id (as string) */
	list(
		db: Db,
		query: TQuery,
		options?: { limit?: number; after?: string | null },
	): Promise<CursorPage<TDomain>>;

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
	/** Default sort for listing; defaults to {_id: 1} */
	defaultSort?: Record<string, 1 | -1>;
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
	const { collection, toDb, fromDb, defaultSort = { _id: 1 }, softDelete = true } = opts;

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

		async list(
			db: Db,
			query: TQuery,
			options?: {
				limit?: number;
				after?: string | null;
			},
		): Promise<CursorPage<TDomain>> {
			const col = db.collection(collection);
			const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
			const after = options?.after ?? null;

			// Cursor por _id (ObjectId creciente)
			const cursorFilter: Filter<Document> = { ...(query as Filter<Document>) };
			if (after) {
				const _after = ensureObjectId(after);
				const currentId = cursorFilter._id as Filter<Document> | undefined;
				cursorFilter._id = currentId ? { ...currentId, $gt: _after } : { $gt: _after };
			}

			const total: number = await col.countDocuments(query as Filter<Document>);

			// Tipa el array que vuelve de Mongo para que el _id no sea opcional
			const docs = await col
				.find<WithId<Document>>(cursorFilter)
				.sort(defaultSort)
				.limit(limit)
				.toArray();

			const items: TDomain[] = docs.map((d) => fromDb(d));
			// Usa .at(-1) y guarda en variable para que TS haga el narrowing correctamente
			const last = docs.at(-1);
			const nextCursor: string | null =
				docs.length === limit && last ? String(last._id) : null;

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
