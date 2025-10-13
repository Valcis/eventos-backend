import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete } from '../zod.schemas';

export const Product = SoftDelete.and(
	z.object({
		id: Id.optional(),
		eventId: Id,
		name: z.string().min(1),
		description: z.string().optional(),
		stock: z.number().int().nonnegative(),
		promotions: z.array(Id).optional().default([]),
		nominalPrice: Money.optional(),
		supplement: z.record(Id, z.number().int()).optional(),
		notes: z.string().optional(),
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	}),
);

export type ProductT = z.infer<typeof Product>;
