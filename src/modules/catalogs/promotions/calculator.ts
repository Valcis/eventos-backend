import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';

/**
 * Tipos de condiciones de promociones (según schema)
 */
export type PromotionConditions =
	| { _rule: 'XForY'; buyQty: number; payQty: number }
	| { _rule: 'DiscountPerUnit'; amountOff: string }
	| { _rule: 'BulkPrice'; units: number; bundlePrice: string }
	| { _rule: 'PercentageDiscount'; percent: number }
	| {
			_rule: 'ComboDiscount';
			requiredProductIds: string[];
			percent?: number;
			amountOff?: string;
	  }
	| { _rule: 'FixedPriceBundle'; productIds: string[]; price: string }
	| { _rule: 'BuyXGetYFree'; buyQty: number; freeQty: number }
	| { _rule: 'MaxUnitsDiscounted'; maxUnits: number; percent?: number; amountOff?: string }
	| { _rule: 'FirstXUnitsFree'; units: number }
	| { _rule: 'TimeLimitedDiscount'; percent?: number; amountOff?: string };

/**
 * Promoción activa (obtenida de la BD)
 */
export interface ActivePromotion {
	id: string;
	name: string;
	rule: string;
	conditions: PromotionConditions;
	priority: number;
	isCumulative: boolean;
	applicables?: string[];
}

/**
 * Resultado del cálculo de una promoción
 */
export interface PromotionCalculationResult {
	promotionId: string;
	promotionName: string;
	rule: string;
	discountPerUnit: string; // Money format
	totalDiscount: string; // Money format
}

/**
 * Convierte Money string a céntimos (para cálculos internos)
 */
function moneyToCents(money: string): number {
	return Math.round(parseFloat(money) * 100);
}

/**
 * Convierte céntimos a Money string
 */
function centsToMoney(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * 1. XForY (3x2): Compra X unidades, paga Y
 */
function calculateXForY(
	unitPriceCents: number,
	quantity: number,
	conditions: { buyQty: number; payQty: number },
): number {
	const { buyQty, payQty } = conditions;
	const completeSets = Math.floor(quantity / buyQty);
	const discountPerSet = unitPriceCents * (buyQty - payQty);
	return completeSets * discountPerSet;
}

/**
 * 2. DiscountPerUnit: Descuento fijo por unidad
 */
function calculateDiscountPerUnit(
	quantity: number,
	conditions: { amountOff: string },
): number {
	const amountOffCents = moneyToCents(conditions.amountOff);
	return amountOffCents * quantity;
}

/**
 * 3. BulkPrice: X unidades por precio fijo (ej: 5 por 10€)
 */
function calculateBulkPrice(
	unitPriceCents: number,
	quantity: number,
	conditions: { units: number; bundlePrice: string },
): number {
	const { units, bundlePrice } = conditions;
	const bundlePriceCents = moneyToCents(bundlePrice);
	const normalPriceForBundle = unitPriceCents * units;
	const discountPerBundle = normalPriceForBundle - bundlePriceCents;

	const completeBundles = Math.floor(quantity / units);
	return completeBundles * discountPerBundle;
}

/**
 * 4. PercentageDiscount: Porcentaje de descuento
 */
function calculatePercentageDiscount(
	subtotalCents: number,
	conditions: { percent: number },
): number {
	return Math.round((subtotalCents * conditions.percent) / 100);
}

/**
 * 5. ComboDiscount: Descuento por combinación de productos
 * NOTA: Esta función requiere validación externa de que todos los productos están presentes
 */
function calculateComboDiscount(
	subtotalCents: number,
	quantity: number,
	conditions: { percent?: number; amountOff?: string },
): number {
	if (conditions.percent !== undefined) {
		return Math.round((subtotalCents * conditions.percent) / 100);
	}
	if (conditions.amountOff !== undefined) {
		return moneyToCents(conditions.amountOff) * quantity;
	}
	return 0;
}

/**
 * 6. FixedPriceBundle: Precio fijo por bundle concreto
 * NOTA: Requiere validación externa de que todos los productos del bundle están presentes
 */
function calculateFixedPriceBundle(
	normalBundlePriceCents: number,
	conditions: { price: string },
): number {
	const fixedPriceCents = moneyToCents(conditions.price);
	return normalBundlePriceCents - fixedPriceCents;
}

/**
 * 7. BuyXGetYFree: Compra X y recibe Y gratis
 */
function calculateBuyXGetYFree(
	unitPriceCents: number,
	quantity: number,
	conditions: { buyQty: number; freeQty: number },
): number {
	const { buyQty, freeQty } = conditions;
	const setSize = buyQty + freeQty;
	const completeSets = Math.floor(quantity / setSize);
	const freeUnits = completeSets * freeQty;
	return freeUnits * unitPriceCents;
}

/**
 * 8. MaxUnitsDiscounted: Máximo de unidades con descuento
 */
function calculateMaxUnitsDiscounted(
	unitPriceCents: number,
	quantity: number,
	conditions: { maxUnits: number; percent?: number; amountOff?: string },
): number {
	const { maxUnits, percent, amountOff } = conditions;
	const discountedUnits = Math.min(quantity, maxUnits);

	if (percent !== undefined) {
		const discountPerUnit = Math.round((unitPriceCents * percent) / 100);
		return discountPerUnit * discountedUnits;
	}
	if (amountOff !== undefined) {
		const amountOffCents = moneyToCents(amountOff);
		return amountOffCents * discountedUnits;
	}
	return 0;
}

/**
 * 9. FirstXUnitsFree: Primeras X unidades gratis
 */
function calculateFirstXUnitsFree(
	unitPriceCents: number,
	quantity: number,
	conditions: { units: number },
): number {
	const freeUnits = Math.min(quantity, conditions.units);
	return freeUnits * unitPriceCents;
}

/**
 * 10. TimeLimitedDiscount: Descuento limitado por tiempo
 * NOTA: La validación de tiempo se hace en getActivePromotions()
 */
function calculateTimeLimitedDiscount(
	subtotalCents: number,
	quantity: number,
	conditions: { percent?: number; amountOff?: string },
): number {
	if (conditions.percent !== undefined) {
		return Math.round((subtotalCents * conditions.percent) / 100);
	}
	if (conditions.amountOff !== undefined) {
		return moneyToCents(conditions.amountOff) * quantity;
	}
	return 0;
}

/**
 * Calcula el descuento de UNA promoción para UN producto
 */
export function calculatePromotionDiscount(
	promotion: ActivePromotion,
	unitPriceCents: number,
	quantity: number,
	order?: Record<string, number>, // Para ComboDiscount y FixedPriceBundle
): number {
	const subtotalCents = unitPriceCents * quantity;

	switch (promotion.conditions._rule) {
		case 'XForY':
			return calculateXForY(unitPriceCents, quantity, promotion.conditions);

		case 'DiscountPerUnit':
			return calculateDiscountPerUnit(quantity, promotion.conditions);

		case 'BulkPrice':
			return calculateBulkPrice(unitPriceCents, quantity, promotion.conditions);

		case 'PercentageDiscount':
			return calculatePercentageDiscount(subtotalCents, promotion.conditions);

		case 'ComboDiscount':
			// Validar que todos los productos requeridos están en el order
			if (order) {
				const allPresent = promotion.conditions.requiredProductIds.every(
					(id) => order[id] && order[id] > 0,
				);
				if (!allPresent) return 0;
			}
			return calculateComboDiscount(subtotalCents, quantity, promotion.conditions);

		case 'FixedPriceBundle':
			// Validar que todos los productos del bundle están en el order
			if (order) {
				const allPresent = promotion.conditions.productIds.every(
					(id) => order[id] && order[id] > 0,
				);
				if (!allPresent) return 0;
			}
			// Para FixedPriceBundle necesitamos el precio total del bundle
			// Por ahora retornamos 0, se debe calcular a nivel de order completo
			return 0;

		case 'BuyXGetYFree':
			return calculateBuyXGetYFree(unitPriceCents, quantity, promotion.conditions);

		case 'MaxUnitsDiscounted':
			return calculateMaxUnitsDiscounted(unitPriceCents, quantity, promotion.conditions);

		case 'FirstXUnitsFree':
			return calculateFirstXUnitsFree(unitPriceCents, quantity, promotion.conditions);

		case 'TimeLimitedDiscount':
			return calculateTimeLimitedDiscount(subtotalCents, quantity, promotion.conditions);

		default:
			return 0;
	}
}

/**
 * Obtiene las promociones activas para un producto
 */
export async function getActivePromotions(
	db: Db,
	productId: string,
	eventId: string,
	currentDate: Date,
): Promise<ActivePromotion[]> {
	// Obtener el producto para ver sus promociones
	const product = await db.collection('products').findOne({
		_id: new ObjectId(productId),
		eventId: new ObjectId(eventId),
		isActive: true,
	});

	if (!product || !product.promotions || product.promotions.length === 0) {
		return [];
	}

	// Obtener las promociones activas
	const promotions = await db
		.collection('promotions')
		.find({
			_id: { $in: (product.promotions as string[]).map((id) => new ObjectId(id)) },
			eventId: new ObjectId(eventId),
			isActive: true,
			startDate: { $lte: currentDate },
			endDate: { $gte: currentDate },
		})
		.toArray();

	return promotions.map((p) => ({
		id: p._id.toString(),
		name: p.name as string,
		rule: p.rule as string,
		conditions: p.conditions as PromotionConditions,
		priority: (p.priority as number) ?? 0,
		isCumulative: (p.isCumulative as boolean) ?? false,
		applicables: p.applicables as string[] | undefined,
	}));
}

/**
 * Selecciona qué promociones aplicar según prioridad y acumulación
 * Según pricing-logic.md:
 * - Si isCumulative = false: aplicar solo la de mayor prioridad (priority más alto)
 * - Si misma prioridad: aplicar la más beneficiosa al cliente
 * - Si isCumulative = true: aplicar todas
 */
export function selectPromotionsToApply(
	promotions: ActivePromotion[],
	unitPriceCents: number,
	quantity: number,
	order?: Record<string, number>,
): ActivePromotion[] {
	if (promotions.length === 0) return [];

	// Separar acumulables y no acumulables
	const cumulative = promotions.filter((p) => p.isCumulative);
	const nonCumulative = promotions.filter((p) => !p.isCumulative);

	const selected: ActivePromotion[] = [];

	// 1. Si hay no-acumulables, seleccionar la de mayor prioridad (priority más alto)
	if (nonCumulative.length > 0) {
		// Ordenar por priority descendente (mayor priority = mayor prioridad)
		nonCumulative.sort((a, b) => b.priority - a.priority);

		// Si hay varias con la misma prioridad, elegir la más beneficiosa
		const maxPriority = nonCumulative[0].priority;
		const samePriority = nonCumulative.filter((p) => p.priority === maxPriority);

		if (samePriority.length === 1) {
			selected.push(samePriority[0]);
		} else {
			// Calcular cuál da mayor descuento
			const bestPromo = samePriority.reduce((best, current) => {
				const bestDiscount = calculatePromotionDiscount(best, unitPriceCents, quantity, order);
				const currentDiscount = calculatePromotionDiscount(
					current,
					unitPriceCents,
					quantity,
					order,
				);
				return currentDiscount > bestDiscount ? current : best;
			});
			selected.push(bestPromo);
		}
	}

	// 2. Añadir todas las acumulables
	selected.push(...cumulative);

	return selected;
}

/**
 * Calcula el descuento total aplicando múltiples promociones
 */
export function calculateTotalPromotionDiscount(
	promotions: ActivePromotion[],
	unitPriceCents: number,
	quantity: number,
	order?: Record<string, number>,
): { totalDiscountCents: number; appliedPromotions: PromotionCalculationResult[] } {
	let totalDiscountCents = 0;
	const appliedPromotions: PromotionCalculationResult[] = [];

	for (const promo of promotions) {
		const discountCents = calculatePromotionDiscount(promo, unitPriceCents, quantity, order);

		if (discountCents > 0) {
			totalDiscountCents += discountCents;

			appliedPromotions.push({
				promotionId: promo.id,
				promotionName: promo.name,
				rule: promo.rule,
				discountPerUnit: centsToMoney(Math.round(discountCents / quantity)),
				totalDiscount: centsToMoney(discountCents),
			});
		}
	}

	return { totalDiscountCents, appliedPromotions };
}
