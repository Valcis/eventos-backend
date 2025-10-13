import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete } from '../catalogs/zod.schemas';
export const Reservation = SoftDelete.and(
	z.object({
		id: Id.optional(),
		eventId: Id,
		reserver: z.string().min(1),
		order: z.record(z.string(), z.number().int().positive()),
		totalAmount: Money,
		salespersonId: Id.optional(),
		consumptionTypeId: Id,
		pickupPointId: Id.optional(),
		hasPromoApplied: z.boolean(),
		linkedReservations: z.array(Id).optional(),
		deposit: Money.optional(),
		isDelivered: z.boolean().default(false),
		isPaid: z.boolean().default(false),
		paymentMethodId: Id,
		cashierId: Id.optional(),
		notes: z.string().optional(),
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	}),
);
export type ReservationT = z.infer<typeof Reservation>;
