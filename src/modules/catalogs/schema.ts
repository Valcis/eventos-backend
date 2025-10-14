import { z } from 'zod';
import { DateTime, Id, Percentage, SoftDelete } from './zod.schemas';

const Named = z
	.object({
		id: Id.optional(),
		eventId: Id,
		name: z.string().min(1),
		notes: z.string().optional(),
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	})
	.merge(SoftDelete);
export const Salesperson = Named.extend({ phone: z.string() });
export type SalespersonT = z.infer<typeof Salesperson>;
export const PaymentMethod = Named;
export type PaymentMethodT = z.infer<typeof PaymentMethod>;
export const Cashier = Named.extend({ phone: z.string() });
export type CashierT = z.infer<typeof Cashier>;
export const Store = Named.extend({
	seller: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	email: z.string().optional(),
	openingHours: z.string().optional(),
});
export type StoreT = z.infer<typeof Store>;
export const Unit = Named.extend({ abbreviation: z.string() });
export type UnitT = z.infer<typeof Unit>;
export const ConsumptionType = Named;
export type ConsumptionTypeT = z.infer<typeof ConsumptionType>;
export const Payer = Named.extend({ phone: z.string().optional() });
export type PayerT = z.infer<typeof Payer>;
export const PickupPoint = Named.extend({
	dealerName: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	email: z.string().optional(),
	openingHours: z.string().optional(),
});
export type PickupPointT = z.infer<typeof PickupPoint>;
export const Partner = Named.extend({
	stake: Percentage,
	phone: z.string().optional(),
	email: z.string().optional(),
});
export type PartnerT = z.infer<typeof Partner>;
