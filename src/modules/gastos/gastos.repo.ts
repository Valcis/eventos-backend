import {ObjectId} from "mongodb";
import { getDb } from '../../infra/mongo/client';
import { toISO, ensureDate } from '../../utils/dates';


function serializeRow(row: Record<string, unknown>) {
  if (row.createdAt) row.createdAt = toISO(row.createdAt);
  if (row.updatedAt) row.updatedAt = toISO(row.updatedAt);
  return row;
}

export async function listGastos(opts: { eventId: string; page: number; pageSize: number; filters?: string; sort?: string; }) {
  const db = await getDb();
  const col = db.collection('gastos');
  const filter: Record<string, unknown> = { eventId: opts.eventId };
  const total = await col.countDocuments(filter);
  const rows = await col.find(filter).skip(opts.page * opts.pageSize).limit(opts.pageSize).toArray();
  return { rows: rows.map(serializeRow), total };
}

export async function createGasto(doc: Record<string, unknown>) {
  const now = new Date();
  doc.createdAt = ensureDate(doc.createdAt) ?? now;
  doc.updatedAt = ensureDate(doc.updatedAt) ?? now;
  const db = await getDb();
  const col = db.collection('gastos');
  const res = await col.insertOne(doc);
  return { id: String(res.insertedId) };
}

export async function updateGasto(id: string, patch: Record<string, unknown>) {
  patch.updatedAt = ensureDate(patch.updatedAt) ?? new Date();
  const db = await getDb();
  const col = db.collection('gastos');
  const { ObjectId } = await import('mongodb');
  await col.updateOne({ _id: new ObjectId(id) }, { $set: patch });
}

export async function deleteGasto(id: string) {
  const db = await getDb();
  const col = db.collection('gastos');
  const { ObjectId } = await import('mongodb');
  await col.deleteOne({ _id: new ObjectId(id) });
}
