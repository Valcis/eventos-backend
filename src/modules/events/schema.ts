import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete } from '../catalogs/zod.schemas';

// Schema base (documento de BD con todos los campos)
export const Event = SoftDelete.and(
	z.object({
		id: Id.optional().or(z.undefined()),
		name: z.string().min(1),
		date: DateTime,
		capacity: z.number().int().nonnegative().optional().or(z.undefined()),
		capitalAmount: Money.optional().or(z.undefined()),
		createdAt: DateTime.optional().or(z.undefined()),
		updatedAt: DateTime.optional().or(z.undefined()),
	}),
);
export type EventT = z.infer<typeof Event>;

// Para POST /events (crear): sin id, sin timestamps
export const EventCreate = SoftDelete.and(
	z.object({
		name: z.string().min(1),
		date: DateTime,
		capacity: z.number().int().nonnegative().optional().or(z.undefined()),
		capitalAmount: Money.optional().or(z.undefined()),
	}),
);
export type EventCreateT = z.infer<typeof EventCreate>;

// Para PUT /events/:id (reemplazo total): sin id (viene en path), sin timestamps
export const EventReplace = SoftDelete.and(
	z.object({
		name: z.string().min(1),
		date: DateTime,
		capacity: z.number().int().nonnegative().optional().or(z.undefined()),
		capitalAmount: Money.optional().or(z.undefined()),
	}),
);
export type EventReplaceT = z.infer<typeof EventReplace>;

// Para PATCH /events/:id (actualización parcial): todo opcional
export const EventPatch = z.object({
	isActive: z.boolean().optional().or(z.undefined()),
	name: z.string().min(1).optional().or(z.undefined()),
	date: DateTime.optional().or(z.undefined()),
	capacity: z.number().int().nonnegative().optional().or(z.undefined()),
	capitalAmount: Money.optional().or(z.undefined()),
});
export type EventPatchT = z.infer<typeof EventPatch>;
