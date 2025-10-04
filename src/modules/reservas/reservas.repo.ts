import { getDb } from '../../infra/mongo/client.js';
import { toISO } from '../../utils/dates.js';

export type ReservaRow = Record<string, unknown>;

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  if (row.createdAt) row.createdAt = toISO(row.createdAt);
  if (row.updatedAt) row.updatedAt = toISO(row.updatedAt);
  return row;
}

export async function listReservas(opts: {
  eventId: string;
  page: number;
  pageSize: number;
  filters?: string;
  sort?: string;
}): Promise<{ rows: ReservaRow[]; total: number; }> {
  const db = await getDb();
  const filter: Record<string, unknown> = { eventId: opts.eventId };
  const col = db.collection('reservas');
  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .skip(opts.page * opts.pageSize)
    .limit(opts.pageSize)
    .toArray();
  return { rows: rows.map(serializeRow) as ReservaRow[], total };
}
