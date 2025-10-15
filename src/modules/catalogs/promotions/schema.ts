import { z } from 'zod';
import { Id, DateTime, Money, SoftDelete, Percentage } from '../zod.schemas';

export const PromotionRule = z.enum([
	'XForY',
	'DiscountPerUnit',
	'BulkPrice',
	'PercentageDiscount',
	'ComboDiscount',
	'FixedPriceBundle',
	'BuyXGetYFree',
	'MaxUnitsDiscounted',
	'FirstXUnitsFree',
	'TimeLimitedDiscount',
]);

/** X unidades por el precio de Y (ej: 3x2) */
const XForY = z.object({
	_rule: z.literal('XForY'),
	buyQty: z.number().int().positive(),
	payQty: z.number().int().positive(),
});

/** Descuento fijo por unidad (importe) */
const DiscountPerUnit = z.object({
	_rule: z.literal('DiscountPerUnit'),
	amountOff: Money,
});

/** Precio por bloque (ej: 5 unidades por 10€) */
const BulkPrice = z.object({
	_rule: z.literal('BulkPrice'),
	units: z.number().int().positive(),
	bundlePrice: Money,
});

/** % descuento */
const PercentageDiscount = z.object({
	_rule: z.literal('PercentageDiscount'),
	percent: Percentage,
});

/** Descuento por combinación de productos */
const ComboDiscount = z.object({
	_rule: z.literal('ComboDiscount'),
	requiredProductIds: z.array(Id).min(2),
	percent: Percentage.optional(),
	amountOff: Money.optional(),
});

/** Precio fijo por bundle concreto */
const FixedPriceBundle = z.object({
	_rule: z.literal('FixedPriceBundle'),
	productIds: z.array(Id).min(1),
	price: Money,
});

/** Compra X y recibe Y gratis */
const BuyXGetYFree = z.object({
	_rule: z.literal('BuyXGetYFree'),
	buyQty: z.number().int().positive(),
	freeQty: z.number().int().positive(),
});

/** Máximo de unidades con descuento */
const MaxUnitsDiscounted = z.object({
	_rule: z.literal('MaxUnitsDiscounted'),
	maxUnits: z.number().int().positive(),
	percent: Percentage.optional(),
	amountOff: Money.optional(),
});

/** Primeras X unidades gratis */
const FirstXUnitsFree = z.object({
	_rule: z.literal('FirstXUnitsFree'),
	units: z.number().int().positive(),
});

/** Descuento limitado por tiempo */
const TimeLimitedDiscount = z.object({
	_rule: z.literal('TimeLimitedDiscount'),
	percent: Percentage.optional(),
	amountOff: Money.optional(),
});

/**
 * Union discriminada por _rule.
 * OJO: Zod exige que todas las opciones sean ZodObject (no ZodEffects).
 * Por eso las validaciones cruzadas se aplican DESPUÉS sobre el union completo.
 */
const PromotionConditionsBase = z.discriminatedUnion('_rule', [
	XForY,
	DiscountPerUnit,
	BulkPrice,
	PercentageDiscount,
	ComboDiscount,
	FixedPriceBundle,
	BuyXGetYFree,
	MaxUnitsDiscounted,
	FirstXUnitsFree,
	TimeLimitedDiscount,
]);

/**
 * Validaciones cruzadas condicionales (sin convertir cada variante en ZodEffects).
 */
export const PromotionConditions = PromotionConditionsBase.superRefine((val, ctx) => {
	switch (val._rule) {
		case 'ComboDiscount':
		case 'MaxUnitsDiscounted':
		case 'TimeLimitedDiscount': {
			const hasPct = typeof val.percent === 'number';
			const hasAmt = typeof val.amountOff === 'string';
			if (!hasPct && !hasAmt) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Debe indicar percent o amountOff',
					path: ['percent'],
				});
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Debe indicar percent o amountOff',
					path: ['amountOff'],
				});
			}
			break;
		}
		default:
			break;
	}
});

export const Promotion = SoftDelete.and(
	z.object({
		id: Id.optional(),
		eventId: Id,
		name: z.string().min(1),
		description: z.string().optional(),
		rule: PromotionRule,
		conditions: PromotionConditions.optional(),
		applicables: z.array(Id).optional(),
		startDate: DateTime,
		endDate: DateTime,
		priority: z.number().int(),
		isCumulative: z.boolean(),
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	}),
);

export type PromotionT = z.infer<typeof Promotion>;
