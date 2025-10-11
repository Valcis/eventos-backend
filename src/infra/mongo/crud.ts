import type { Db, Document, WithId, Filter, UpdateFilter } from 'mongodb';
import { ObjectId } from 'mongodb';

export type CursorPage<T> = {
	items: T[];
	page: { limit: number; nextCursor?: string | null; total: number };
};

export interface CrudOptions<TDomain, TCreate, TUpdate, TQuery extends Filter<Document>> {
	collection: string;
	toDb: (data: TCreate | TUpdate) => Document; // mapea a doc Mongo
	fromDb: (doc: WithId<Document>) => TDomain; // mapea a dominio
	defaultSort?: Record<string, 1 | -1>; // por defecto { _id: 1 }
	softDelete?: boolean; // por defecto true
}

function ensureObjectId(id: string): ObjectId {
	if (!ObjectId.isValid(id)) {
		const err = new Error('Id inválido');
		(err as any).status = 400;
		throw err;
	}
	return new ObjectId(id);
}

export function makeCrud<TDomain, TCreate, TUpdate, TQuery extends Filter<Document>>(
	opts: CrudOptions<TDomain, TCreate, TUpdate, TQuery>,
) {
	const { collection, toDb, fromDb, defaultSort = { _id: 1 }, softDelete = true } = opts;

	return {
		async list(
			db: Db,
			query: TQuery,
			after: string | undefined,
			limit: number,
		): Promise<CursorPage<TDomain>> {
			const col = db.collection(collection);
			const filter: Filter<Document> = { ...(query as Filter<Document>) };

			if (softDelete) {
				// por convención, los soft-deleted llevan isActive=false
				if (filter.isActive === undefined) (filter as any).isActive = true;
			}

			if (after) {
				// Para consistencia del cursor, forzamos orden por _id ascendente
				if (defaultSort._id !== 1 || Object.keys(defaultSort).length !== 1) {
					const err = new Error('Cursor "after" requiere sort {_id: 1}');
					(err as any).status = 500;
					throw err;
				}
				try {
					(filter as any)._id = { $gt: ensureObjectId(after) };
				} catch {
					// si el after no es válido, simplemente no filtras por _id
				}
			}

			const total = await col.countDocuments(filter);
			const cursor = col.find(filter).sort(defaultSort).limit(limit);
			const docs = await cursor.toArray();
			const items = docs.map(fromDb);
			const nextCursor = docs.length === limit ? String(docs[docs.length - 1]._id) : null;

			return { items, page: { limit, nextCursor, total } };
		},

		async get(db: Db, id: string): Promise<TDomain | null> {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			const doc = await col.findOne({ _id });
			return doc ? fromDb(doc as WithId<Document>) : null;
		},

		async create(db: Db, input: TCreate): Promise<TDomain> {
			const col = db.collection(collection);
			const now = new Date(); // guarda Date nativo
			const doc = toDb({
				...(input as any),
				createdAt: now,
				updatedAt: now,
				isActive: (input as any)?.isActive ?? true,
			} as TCreate & Partial<TUpdate>);
			const ret = await col.insertOne(doc);
			const created = await col.findOne({ _id: ret.insertedId });
			return fromDb(created as WithId<Document>);
		},

		async replace(db: Db, id: string, input: TUpdate): Promise<TDomain> {
			const col = db.collection(collection);
			const now = new Date();
			const _id = ensureObjectId(id);
			const doc = toDb({ ...(input as any), updatedAt: now } as TUpdate);
			await col.replaceOne({ _id }, doc, { upsert: false });
			const found = await col.findOne({ _id });
			if (!found) {
				const err = new Error('No encontrado');
				(err as any).status = 404;
				throw err;
			}
			return fromDb(found as WithId<Document>);
		},

		async patch(db: Db, id: string, input: Partial<TUpdate>): Promise<TDomain> {
			const col = db.collection(collection);
			const now = new Date();
			const _id = ensureObjectId(id);
			const $set = toDb({ ...(input as any), updatedAt: now } as TUpdate);
			await col.updateOne({ _id }, { $set } as UpdateFilter<Document>);
			const found = await col.findOne({ _id });
			if (!found) {
				const err = new Error('No encontrado');
				(err as any).status = 404;
				throw err;
			}
			return fromDb(found as WithId<Document>);
		},

		async softDelete(db: Db, id: string): Promise<void> {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			if (softDelete) {
				await col.updateOne({ _id }, { $set: { isActive: false, updatedAt: new Date() } });
			} else {
				await col.deleteOne({ _id });
			}
		},

		/** Borrado duro (ignora `softDelete`) */
		async removeHard(db: Db, id: string): Promise<void> {
			const col = db.collection(collection);
			const _id = ensureObjectId(id);
			await col.deleteOne({ _id });
		},
	};
}
