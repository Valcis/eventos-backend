import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { AppError } from '../../core/http/errors';
import {
	getActivePromotions,
	selectPromotionsToApply,
	calculateTotalPromotionDiscount,
} from '../catalogs/promotions/calculator';
import type { ProductPromotionSnapshotT } from './schema';

/**
 * Resultado del cálculo de precio de una reserva
 */
export interface PricingResult {
	totalAmount: string; // Money format
	hasPromoApplied: boolean;
	appliedPromotionsSnapshot?: ProductPromotionSnapshotT[];
}

/**
 * Convierte Money string a céntimos
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
 * Calcula el precio total de una reserva aplicando promociones y suplementos
 *
 * Fórmula según pricing-logic.md:
 * 1. precioBase = product.nominalPrice
 * 2. Aplicar promociones → precioConPromo
 * 3. Aplicar suplementos → precioFinal = precioConPromo + suplemento
 * 4. subtotal = precioFinal * quantity
 * 5. totalAmount = suma(subtotal de todos los productos)
 *
 * @param db - Instancia de MongoDB
 * @param eventId - ID del evento
 * @param order - Mapa productId -> quantity
 * @param consumptionTypeId - ID del tipo de consumo (para suplementos)
 * @param currentDate - Fecha actual (para validar promociones activas)
 * @param isPaid - Si la reserva está pagada (congela precio)
 * @param isDelivered - Si la reserva está entregada (congela precio)
 * @param generateSnapshot - Si debe generar snapshot de promociones aplicadas
 * @param skipFrozenCheck - Saltar validación de congelación (para creación inicial)
 */
export async function calculateReservationTotal(
	db: Db,
	eventId: string,
	order: Record<string, number>,
	consumptionTypeId: string,
	currentDate: Date = new Date(),
	isPaid: boolean = false,
	isDelivered: boolean = false,
	generateSnapshot: boolean = false,
	skipFrozenCheck: boolean = false,
): Promise<PricingResult> {
	// Validar que no está congelado (solo si no se solicita saltar la validación)
	if (!skipFrozenCheck && (isPaid || isDelivered)) {
		throw new AppError(
			'PRICE_FROZEN',
			'No se puede recalcular el precio de una reserva pagada o entregada.',
			400,
		);
	}

	let totalAmountCents = 0;
	let hasPromoApplied = false;
	const snapshot: ProductPromotionSnapshotT[] = [];

	// Procesar cada producto en el order
	for (const [productId, quantity] of Object.entries(order)) {
		// 1. Obtener producto desde MongoDB
		const product = await db.collection('products').findOne({
			_id: new ObjectId(productId),
			eventId: new ObjectId(eventId),
			isActive: true,
		});

		if (!product) {
			throw new AppError(
				'VALIDATION_ERROR',
				`Producto ${productId} no existe o está inactivo`,
				400,
			);
		}

		// 2. Precio base (nominalPrice)
		const nominalPrice = (product.nominalPrice as string) ?? '0.00';
		const nominalPriceCents = moneyToCents(nominalPrice);

		// 3. Obtener promociones activas del producto
		const activePromotions = await getActivePromotions(db, productId, eventId, currentDate);

		// 4. Seleccionar promociones a aplicar (según prioridad y acumulación)
		const promotionsToApply = selectPromotionsToApply(
			activePromotions,
			nominalPriceCents,
			quantity,
			order,
		);

		// 5. Calcular descuento total por promociones
		const { totalDiscountCents, appliedPromotions } = calculateTotalPromotionDiscount(
			promotionsToApply,
			nominalPriceCents,
			quantity,
			order,
		);

		// 6. Precio después de promociones
		const priceAfterPromoCents = nominalPriceCents - Math.round(totalDiscountCents / quantity);
		const unitPriceAfterPromoCents = Math.max(0, priceAfterPromoCents); // No puede ser negativo

		// 7. Obtener suplemento aplicable según consumptionTypeId
		const supplements = (product.supplement as Record<string, number> | undefined) ?? {};
		const supplementCents = supplements[consumptionTypeId] ?? 0;

		// 8. Precio final con suplemento
		const unitPriceFinalCents = unitPriceAfterPromoCents + supplementCents;

		// 9. Subtotal del producto
		const subtotalCents = unitPriceFinalCents * quantity;
		totalAmountCents += subtotalCents;

		// 10. Marcar si se aplicó alguna promoción
		if (appliedPromotions.length > 0) {
			hasPromoApplied = true;
		}

		// 11. Generar snapshot si se solicita
		if (generateSnapshot) {
			snapshot.push({
				productId: productId,
				productName: product.name as string,
				quantity: quantity,
				unitPriceOriginal: nominalPrice,
				unitPriceFinal: centsToMoney(unitPriceFinalCents),
				subtotal: centsToMoney(subtotalCents),
				promotionsApplied: appliedPromotions.map((p) => ({
					promotionId: p.promotionId,
					promotionName: p.promotionName,
					rule: p.rule,
					discountPerUnit: p.discountPerUnit,
				})),
			});
		}
	}

	return {
		totalAmount: centsToMoney(totalAmountCents),
		hasPromoApplied,
		appliedPromotionsSnapshot: generateSnapshot ? snapshot : undefined,
	};
}

/**
 * Calcula el precio de una reserva existente si necesita recalcularse
 *
 * Según pricing-logic.md, el precio se recalcula cuando:
 * - PUT/PATCH cambia order o consumptionTypeId
 * - Y isPaid = false Y isDelivered = false
 *
 * Si está congelado (isPaid=true o isDelivered=true), retorna null
 */
export async function recalculateReservationIfNeeded(
	db: Db,
	reservationId: string,
	updates: {
		order?: Record<string, number>;
		consumptionTypeId?: string;
		isPaid?: boolean;
		isDelivered?: boolean;
	},
): Promise<PricingResult | null> {
	// Obtener reserva actual
	const reservation = await db.collection('reservations').findOne({
		_id: new ObjectId(reservationId),
		isActive: true,
	});

	if (!reservation) {
		throw new AppError('NOT_FOUND', `Reserva ${reservationId} no encontrada`, 404);
	}

	// Determinar valores finales después de updates
	const finalOrder = updates.order ?? (reservation.order as Record<string, number>);
	const finalConsumptionTypeId =
		updates.consumptionTypeId ?? (reservation.consumptionTypeId as string);
	const finalIsPaid = updates.isPaid ?? (reservation.isPaid as boolean);
	const finalIsDelivered = updates.isDelivered ?? (reservation.isDelivered as boolean);

	// Si está congelado, no recalcular
	if (finalIsPaid || finalIsDelivered) {
		// Si se acaba de congelar (no estaba antes), generar snapshot
		const wasNotFrozen = !reservation.isPaid && !reservation.isDelivered;
		const isNowFrozen = finalIsPaid || finalIsDelivered;

		if (wasNotFrozen && isNowFrozen) {
			// Generar snapshot final antes de congelar
			const result = await calculateReservationTotal(
				db,
				reservation.eventId.toString(),
				finalOrder,
				finalConsumptionTypeId,
				new Date(),
				false, // Temporalmente false para poder calcular
				false,
				true, // Generar snapshot
			);

			return result;
		}

		return null; // Ya estaba congelado, no recalcular
	}

	// Si cambió order o consumptionTypeId, recalcular
	const orderChanged = updates.order !== undefined;
	const consumptionTypeChanged = updates.consumptionTypeId !== undefined;

	if (orderChanged || consumptionTypeChanged) {
		return await calculateReservationTotal(
			db,
			reservation.eventId.toString(),
			finalOrder,
			finalConsumptionTypeId,
			new Date(),
			finalIsPaid,
			finalIsDelivered,
			false, // No generar snapshot aún
		);
	}

	return null; // No necesita recalcularse
}
