import { Db, ObjectId, Decimal128, Document, WithId } from 'mongodb';

export type CursorPage<T> = {
	items: T[];
	page: { limit: number; nextCursor?: string | null; total: number };
};

export function makeCrud<T extends Document>(opts: {
	collection: string;
	toDb: (data: any) => Document;
	fromDb: (doc: WithId<Document>) => T;
	defaultSort?: any;
	softDelete?: boolean;
}) {
	const { collection, toDb, fromDb, defaultSort = { _id: 1 }, softDelete = true } = opts;

	return {
		async list(
			db: Db,
			query: any,
			after: string | undefined,
			limit: number,
		): Promise<CursorPage<T>> {
			const col = db.collection(collection);
			const filter: any = { ...query };
			if (softDelete) filter.isActive = filter.isActive ?? true;

			if (after) {
				try {
					filter._id = { $gt: new ObjectId(after) };
				} catch {}
			}
			const total = await col.countDocuments({ ...filter, ...(filter._id ? {} : {}) });
			const cursor = col.find(filter).sort(defaultSort).limit(limit);
			const docs = await cursor.toArray();
			const items = docs.map(fromDb);
			const nextCursor = docs.length === limit ? String(docs[docs.length - 1]._id) : null;
			return { items, page: { limit, nextCursor, total } };
		},

		async get(db: Db, id: string): Promise<T | null> {
			const col = db.collection(collection);
			const _id = new ObjectId(id);
			const doc = await col.findOne({ _id });
			return doc ? fromDb(doc as WithId<Document>) : null;
		},

		async create(db: Db, input: any): Promise<T> {
			const col = db.collection(collection);
			const now = new Date().toISOString();
			const doc = toDb({
				...input,
				createdAt: now,
				updatedAt: now,
				isActive: input.isActive ?? true,
			});
			const ret = await col.insertOne(doc);
			const created = await col.findOne({ _id: ret.insertedId });
			return fromDb(created as WithId<Document>);
		},

		async replace(db: Db, id: string, input: any): Promise<T> {
			const col = db.collection(collection);
			const now = new Date().toISOString();
			const _id = new ObjectId(id);
			const doc = toDb({ ...input, updatedAt: now });
			await col.replaceOne({ _id }, doc, { upsert: false });
			const found = await col.findOne({ _id });
			if (!found) throw Object.assign(new Error('No encontrado'), { status: 404 });
			return fromDb(found as WithId<Document>);
		},

		async patch(db: Db, id: string, input: any): Promise<T> {
			const col = db.collection(collection);
			const now = new Date().toISOString();
			const _id = new ObjectId(id);
			const $set = toDb({ ...input, updatedAt: now });
			await col.updateOne({ _id }, { $set });
			const found = await col.findOne({ _id });
			if (!found) throw Object.assign(new Error('No encontrado'), { status: 404 });
			return fromDb(found as WithId<Document>);
		},

		async softDelete(db: Db, id: string): Promise<void> {
			const col = db.collection(collection);
			const _id = new ObjectId(id);
			if (softDelete) {
				await col.updateOne(
					{ _id },
					{ $set: { isActive: false, updatedAt: new Date().toISOString() } },
				);
			} else {
				await col.deleteOne({ _id });
			}
		},

		/** Borrado duro (ignora `softDelete`) */
		async removeHard(db: Db, id: string): Promise<void> {
			const col = db.collection(collection);
			const _id = new ObjectId(id);
			await col.deleteOne({ _id });
		},
	};
}
