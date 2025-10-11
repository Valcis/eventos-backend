import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete } from './shared';
export const Product = SoftDelete.and(
	z.object({
		id: Id.optional(),
		eventId: Id,
		name: z.string().min(1),
		description: z.string().optional(),
		price: Money,
		vatPct: z.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)]),
		vatAmount: Money,
		netPrice: Money,
		isPackage: z.boolean(),
		unitsPerPack: z.number().int().positive().optional(),
		unitPrice: Money.optional(),
		promotions: z.array(Id).optional(),
		nominalPrice: Money.optional(),
		supplement: z.string().optional(),
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	}),
);
export type ProductT = z.infer<typeof Product>;
