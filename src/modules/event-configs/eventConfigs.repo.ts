import { getDb } from '../../infra/mongo/client';

export type Json = Record<string, unknown>;

export async function getEventConfig(eventId: string) {
  const db = await getDb();
  const col = db.collection('event_configs');
  return await col.findOne({ eventId }) ?? { eventId };
}

export async function upsertEventConfig(eventId: string, patch: Json) {
  const db = await getDb();
  const col = db.collection('event_configs');
  await col.updateOne({ eventId }, { $set: { ...patch, eventId } }, { upsert: true });
}
