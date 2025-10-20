import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete } from '../catalogs/zod.schemas';

// 1) Base pura (objeto) — sin intersecciones
export const EventBase = z.object({
    id: Id.optional(),
    name: z.string().min(1),
    date: DateTime,
    capacity: z.number().int().nonnegative().optional(),
    capitalAmount: Money.optional(),
    createdAt: DateTime.optional(),
    updatedAt: DateTime.optional(),
});

// 2) “Persistente” con soft delete (mantiene tu export original)
export const Event = SoftDelete.and(EventBase);

// 3) Esquemas de IO claros (evita .partial() sobre intersección)
export const EventCreate = SoftDelete.and(
    EventBase.omit({ id: true, createdAt: true, updatedAt: true }),
);

export const EventReplace = SoftDelete.and(
    EventBase.omit({ createdAt: true, updatedAt: true }),
);

// Aquí SÍ: parcial sobre el objeto base, y luego intersectar
export const EventPatch = SoftDelete.and(EventBase.partial());

export type EventT = z.infer<typeof Event>;
export type EventCreateT = z.infer<typeof EventCreate>;
export type EventReplaceT = z.infer<typeof EventReplace>;
export type EventPatchT = z.infer<typeof EventPatch>;
