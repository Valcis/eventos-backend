import { z } from 'zod'; import { Id, DateTime, Money, SoftDelete } from './shared';
export const Event = SoftDelete.and(z.object({ id: Id.optional(), name: z.string().min(1), date: DateTime, capacity: z.number().int().nonnegative().optional(), capitalAmount: Money.optional(), createdAt: DateTime.optional(), updatedAt: DateTime.optional() }));
export type EventT = z.infer<typeof Event>;
