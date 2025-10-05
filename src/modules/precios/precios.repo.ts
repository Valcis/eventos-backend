import { getDb } from '../../infra/mongo/client';
import { toISO, ensureDate } from '../../utils/dates';

export type PrecioRow = Record<string, unknown>;

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  if (row.createdAt) row.createdAt = toISO(row.createdAt);
  if (row.updatedAt) row.updatedAt = toISO(row.updatedAt);
  return row;
}

export async function listPrecios(opts: { eventId: string; page: number; pageSize: number; q?: string; }) {
  const db = await getDb();
  const col = db.collection('precios');
  const filter: Record<string, unknown> = { eventId: opts.eventId };
  const total = await col.countDocuments(filter);
  const rows = await col.find(filter).skip(opts.page * opts.pageSize).limit(opts.pageSize).toArray();
  return { rows: rows.map(serializeRow), total };
}

export async function createPrecio(doc: Record<string, unknown>) {
  const now = new Date();
  doc.createdAt = ensureDate(doc.createdAt) ?? now;
  doc.updatedAt = ensureDate(doc.updatedAt) ?? now;
  const db = await getDb();
  const col = db.collection('precios');
  const res = await col.insertOne(doc);
  return { id: str(res.insertedId) };
}

function str(x: any) { return typeof x?.toString === 'function' ? x.toString() : String(x); }

export async function updatePrecio(id: string, patch: Record<string, unknown>) {
  patch.updatedAt = ensureDate(patch.updatedAt) ?? new Date();
  const db = await getDb();
  const col = db.collection('precios');
  await col.updateOne({ _id: new (await import('mongodb')).ObjectId(id) }, { $set: patch });
}

export async function deletePrecio(id: string) {
  const db = await getDb();
  const col = db.collection('precios');
  await col.deleteOne({ _id: new (await import('mongodb')).ObjectId(id) });
}
