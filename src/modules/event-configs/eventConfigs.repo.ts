import { getDb } from '../../infra/mongo/client';

export type JsonObject = { [k: string]: unknown };
export interface EventConfigDTO extends JsonObject {
  eventId?: string;
}

export async function getEventConfig(eventId: string): Promise<EventConfigDTO> {
  const db = await getDb();
  const doc = await db.collection('event_configs').findOne({ eventId });
  return (doc ?? { eventId }) as EventConfigDTO;
}

export async function upsertEventConfig(eventId: string, patch: EventConfigDTO): Promise<void> {
  const db = await getDb();
  await db.collection('event_configs').updateOne(
    { eventId },
    { $set: { ...patch, eventId } },
    { upsert: true }
  );
}
