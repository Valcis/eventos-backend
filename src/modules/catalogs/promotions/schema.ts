import { z } from 'zod';
import { Id, DateTime, Money, Percentage } from '../zod.schemas';

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
	buyQty: z
		.number()
		.int()
		.positive()
		.describe('Cantidad de unidades que el cliente debe comprar. Ejemplo: 3 para "3x2"'),
	payQty: z
		.number()
		.int()
		.positive()
		.describe('Cantidad de unidades que el cliente paga. Ejemplo: 2 para "3x2"'),
});

/** Descuento fijo por unidad (importe) */
const DiscountPerUnit = z.object({
	_rule: z.literal('DiscountPerUnit'),
	amountOff: Money.describe(
		'Importe de descuento por cada unidad. Ejemplo: "1.50" para -1.50€ por unidad',
	),
});

/** Precio por bloque (ej: 5 unidades por 10€) */
const BulkPrice = z.object({
	_rule: z.literal('BulkPrice'),
	units: z
		.number()
		.int()
		.positive()
		.describe('Número de unidades en el bloque. Ejemplo: 5 para "5 por 10€"'),
	bundlePrice: Money.describe('Precio total del bloque. Ejemplo: "10.00" para "5 por 10€"'),
});

/** % descuento */
const PercentageDiscount = z.object({
	_rule: z.literal('PercentageDiscount'),
	percent: Percentage.describe(
		'Porcentaje de descuento a aplicar. Ejemplo: 15 para 15% de descuento',
	),
});

/** Descuento por combinación de productos */
const ComboDiscount = z.object({
	_rule: z.literal('ComboDiscount'),
	requiredProductIds: z
		.array(Id)
		.min(2)
		.describe(
			'IDs de los productos que deben comprarse juntos. Mínimo 2. Ejemplo: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]',
		),
	percent: Percentage.optional().describe('Porcentaje de descuento (si aplica)'),
	amountOff: Money.optional().describe('Importe fijo de descuento (si aplica)'),
});

/** Precio fijo por bundle concreto */
const FixedPriceBundle = z.object({
	_rule: z.literal('FixedPriceBundle'),
	productIds: z
		.array(Id)
		.min(1)
		.describe('IDs de los productos incluidos en el bundle. Ejemplo: ["507f...", "608f..."]'),
	price: Money.describe('Precio fijo total del bundle. Ejemplo: "25.00"'),
});

/** Compra X y recibe Y gratis */
const BuyXGetYFree = z.object({
	_rule: z.literal('BuyXGetYFree'),
	buyQty: z
		.number()
		.int()
		.positive()
		.describe(
			'Cantidad que el cliente debe comprar. Ejemplo: 2 para "Compra 2 y lleva 1 gratis"',
		),
	freeQty: z
		.number()
		.int()
		.positive()
		.describe('Cantidad gratis que recibe. Ejemplo: 1 para "Compra 2 y lleva 1 gratis"'),
});

/** Máximo de unidades con descuento */
const MaxUnitsDiscounted = z.object({
	_rule: z.literal('MaxUnitsDiscounted'),
	maxUnits: z
		.number()
		.int()
		.positive()
		.describe('Número máximo de unidades con descuento. Ejemplo: 5'),
	percent: Percentage.optional().describe('Porcentaje de descuento (si aplica)'),
	amountOff: Money.optional().describe('Importe fijo de descuento (si aplica)'),
});

/** Primeras X unidades gratis */
const FirstXUnitsFree = z.object({
	_rule: z.literal('FirstXUnitsFree'),
	units: z
		.number()
		.int()
		.positive()
		.describe('Número de unidades gratis al inicio. Ejemplo: 1 para "Primera unidad gratis"'),
});

/** Descuento limitado por tiempo */
const TimeLimitedDiscount = z.object({
	_rule: z.literal('TimeLimitedDiscount'),
	percent: Percentage.optional().describe('Porcentaje de descuento (si aplica)'),
	amountOff: Money.optional().describe('Importe fijo de descuento (si aplica)'),
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

/**
 * Schema completo de Promoción
 * Representa una promoción aplicable a productos en un evento
 */
export const Promotion = z.object({
	isActive: z.boolean().default(true).describe('Estado de activación de la promoción'),
	id: Id.optional().describe('Identificador único de la promoción'),
	eventId: Id.describe('ID del evento al que pertenece esta promoción'),
	name: z
		.string()
		.min(1)
		.describe('Nombre de la promoción. Ejemplo: "3x2 en Cervezas", "Descuento 10% Parrillada"'),
	description: z
		.string()
		.optional()
		.describe(
			'Descripción detallada de la promoción. Ejemplo: "Compra 3 cervezas y paga solo 2"',
		),
	rule: PromotionRule.describe(
		'Tipo de regla de promoción. Opciones: XForY, DiscountPerUnit, BulkPrice, PercentageDiscount, ComboDiscount, FixedPriceBundle, BuyXGetYFree, MaxUnitsDiscounted, FirstXUnitsFree, TimeLimitedDiscount',
	),
	conditions: PromotionConditions.optional().describe(
		'Condiciones específicas de la promoción según la regla seleccionada',
	),
	applicables: z
		.array(Id)
		.optional()
		.describe(
			'Array de IDs de productos a los que aplica la promoción. Si está vacío o no se proporciona, puede aplicar a todos. Ejemplo: ["507f1f77bcf86cd799439011"]',
		),
	startDate: DateTime.describe(
		'Fecha y hora de inicio de la promoción. Ejemplo: "2025-06-15T12:00:00.000Z"',
	),
	endDate: DateTime.describe(
		'Fecha y hora de fin de la promoción. Ejemplo: "2025-06-15T23:59:59.000Z"',
	),
	priority: z
		.number()
		.int()
		.describe(
			'Prioridad de aplicación de la promoción (menor número = mayor prioridad). Ejemplo: 1',
		),
	isCumulative: z
		.boolean()
		.describe(
			'Indica si esta promoción puede combinarse con otras (true) o es exclusiva (false)',
		),
	createdAt: DateTime.optional().describe('Fecha de creación de la promoción'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type PromotionT = z.infer<typeof Promotion>;

/**
 * Schema para crear una nueva promoción (POST)
 * Excluye id, createdAt y updatedAt (generados por el servidor)
 */
export const PromotionCreate = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación'),
	eventId: Id.describe('ID del evento'),
	name: z.string().min(1).describe('Nombre de la promoción. Ejemplo: "3x2 en Cervezas"'),
	description: z.string().optional().describe('Descripción detallada'),
	rule: PromotionRule.describe('Tipo de regla de promoción'),
	conditions: PromotionConditions.optional().describe('Condiciones específicas'),
	applicables: z.array(Id).optional().describe('IDs de productos aplicables'),
	startDate: DateTime.describe('Fecha de inicio. Ejemplo: "2025-06-15T12:00:00.000Z"'),
	endDate: DateTime.describe('Fecha de fin. Ejemplo: "2025-06-15T23:59:59.000Z"'),
	priority: z.number().int().describe('Prioridad. Ejemplo: 1'),
	isCumulative: z.boolean().describe('¿Es acumulable con otras promociones? true/false'),
});

export type PromotionCreateT = z.infer<typeof PromotionCreate>;

/**
 * Schema para reemplazo completo de promoción (PUT)
 * Similar a PromotionCreate pero sin eventId (no se puede cambiar)
 */
export const PromotionReplace = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación'),
	name: z.string().min(1).describe('Nombre de la promoción'),
	description: z.string().optional().describe('Descripción'),
	rule: PromotionRule.describe('Tipo de regla'),
	conditions: PromotionConditions.optional().describe('Condiciones'),
	applicables: z.array(Id).optional().describe('IDs de productos'),
	startDate: DateTime.describe('Fecha de inicio'),
	endDate: DateTime.describe('Fecha de fin'),
	priority: z.number().int().describe('Prioridad'),
	isCumulative: z.boolean().describe('¿Acumulable?'),
});

export type PromotionReplaceT = z.infer<typeof PromotionReplace>;

/**
 * Schema para actualización parcial de promoción (PATCH)
 * Todos los campos son opcionales
 */
export const PromotionPatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación. Ejemplo: true'),
	name: z.string().min(1).optional().describe('Nombre de la promoción'),
	description: z.string().optional().describe('Descripción'),
	rule: PromotionRule.optional().describe('Tipo de regla'),
	conditions: PromotionConditions.optional().describe('Condiciones'),
	applicables: z.array(Id).optional().describe('IDs de productos'),
	startDate: DateTime.optional().describe('Fecha de inicio'),
	endDate: DateTime.optional().describe('Fecha de fin'),
	priority: z.number().int().optional().describe('Prioridad'),
	isCumulative: z.boolean().optional().describe('¿Acumulable?'),
});

export type PromotionPatchT = z.infer<typeof PromotionPatch>;
