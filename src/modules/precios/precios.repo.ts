import { getDb } from '../../infra/mongo/client.js';
import { toISO } from '../../utils/dates.js';

export type PrecioRow = Record<string, unknown>;

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  if (row.createdAt) row.createdAt = toISO(row.createdAt);
  if (row.updatedAt) row.updatedAt = toISO(row.updatedAt);
  return row;
}

export async function listPrecios(opts: {
  eventId: string;
  page: number;
  pageSize: number;
  q?: string;
}): Promise<{ rows: PrecioRow[]; total: number; }> {
  const db = await getDb();
  const filter: Record<string, unknown> = { eventId: opts.eventId };
  const col = db.collection('precios');
  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .skip(opts.page * opts.pageSize)
    .limit(opts.pageSize)
    .toArray();
  return { rows: rows.map(serializeRow) as PrecioRow[], total };
}
