import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { AppError } from '../../core/http/errors';
import type {
	InvoiceDataT,
	InvoiceProductDetailT,
	InvoiceLinkedReservationT,
} from './invoice-schema';

/**
 * Convierte céntimos a Money string
 */
function centsToMoney(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Genera datos completos de facturación para una reserva
 *
 * @param db - Instancia de MongoDB
 * @param reservationId - ID de la reserva
 */
export async function generateInvoiceData(
	db: Db,
	reservationId: string,
): Promise<InvoiceDataT> {
	// 1. Obtener la reserva
	const reservation = await db.collection('reservations').findOne({
		_id: new ObjectId(reservationId),
		isActive: true,
	});

	if (!reservation) {
		throw new AppError('NOT_FOUND', `Reserva ${reservationId} no encontrada`, 404);
	}

	// 2. Obtener detalles de productos
	const order = reservation.order as Record<string, number>;
	const consumptionTypeId = reservation.consumptionTypeId as string;
	const appliedPromotionsSnapshot = reservation.appliedPromotionsSnapshot as
		| Array<{
				productId: string;
				productName: string;
				quantity: number;
				unitPriceOriginal: string;
				unitPriceFinal: string;
				subtotal: string;
				promotionsApplied: Array<{
					promotionId: string;
					promotionName: string;
					rule: string;
					discountPerUnit: string;
				}>;
		  }>
		| undefined;

	const products: InvoiceProductDetailT[] = [];

	// Si existe snapshot, usar eso (más preciso)
	if (appliedPromotionsSnapshot && appliedPromotionsSnapshot.length > 0) {
		for (const item of appliedPromotionsSnapshot) {
			// Obtener producto para obtener suplementos
			const product = await db.collection('products').findOne({
				_id: new ObjectId(item.productId),
			});

			const supplements = (product?.supplement as Record<string, number> | undefined) ?? {};
			const supplementCents = supplements[consumptionTypeId] ?? 0;

			// Obtener tipo de consumo para el nombre del suplemento
			let supplementConcept = 'Suplemento';
			if (supplementCents !== 0) {
				const consumptionType = await db.collection('consumptiontypes').findOne({
					_id: new ObjectId(consumptionTypeId),
				});
				if (consumptionType) {
					supplementConcept = `Suplemento ${consumptionType.name}`;
				}
			}

			products.push({
				productId: item.productId,
				productName: item.productName,
				quantity: item.quantity,
				unitPriceOriginal: item.unitPriceOriginal,
				unitPriceFinal: item.unitPriceFinal,
				subtotal: item.subtotal,
				promotionsApplied: item.promotionsApplied,
				supplementsApplied:
					supplementCents !== 0
						? [{ concept: supplementConcept, amount: centsToMoney(supplementCents) }]
						: [],
			});
		}
	} else {
		// No hay snapshot, calcular desde productos actuales (menos preciso)
		for (const [productId, quantity] of Object.entries(order)) {
			const product = await db.collection('products').findOne({
				_id: new ObjectId(productId),
			});

			if (!product) {
				throw new AppError('NOT_FOUND', `Producto ${productId} no encontrado`, 404);
			}

			const nominalPrice = (product.nominalPrice as string) ?? '0.00';
			const supplements = (product.supplement as Record<string, number> | undefined) ?? {};
			const supplementCents = supplements[consumptionTypeId] ?? 0;

			// Calcular precio final básico (sin promociones, solo suplemento)
			const nominalPriceCents = Math.round(parseFloat(nominalPrice) * 100);
			const unitPriceFinalCents = nominalPriceCents + supplementCents;
			const subtotalCents = unitPriceFinalCents * quantity;

			// Obtener tipo de consumo para el nombre del suplemento
			let supplementConcept = 'Suplemento';
			if (supplementCents !== 0) {
				const consumptionType = await db.collection('consumptiontypes').findOne({
					_id: new ObjectId(consumptionTypeId),
				});
				if (consumptionType) {
					supplementConcept = `Suplemento ${consumptionType.name}`;
				}
			}

			products.push({
				productId: productId,
				productName: product.name as string,
				quantity: quantity,
				unitPriceOriginal: nominalPrice,
				unitPriceFinal: centsToMoney(unitPriceFinalCents),
				subtotal: centsToMoney(subtotalCents),
				promotionsApplied: [], // Sin snapshot, no sabemos qué promociones se aplicaron
				supplementsApplied:
					supplementCents !== 0
						? [{ concept: supplementConcept, amount: centsToMoney(supplementCents) }]
						: [],
			});
		}
	}

	// 3. Obtener reservas vinculadas
	const linkedReservationsIds = (reservation.linkedReservations as string[]) ?? [];
	const linkedReservations: InvoiceLinkedReservationT[] = [];

	if (linkedReservationsIds.length > 0) {
		const linkedDocs = await db
			.collection('reservations')
			.find({
				_id: { $in: linkedReservationsIds.map((id) => new ObjectId(id)) },
				isActive: true,
			})
			.toArray();

		for (const linked of linkedDocs) {
			linkedReservations.push({
				id: linked._id.toString(),
				reserver: linked.reserver as string,
				totalAmount: linked.totalAmount as string,
				isPaid: (linked.isPaid as boolean) ?? false,
				isDelivered: (linked.isDelivered as boolean) ?? false,
				createdAt: (linked.createdAt as Date).toISOString(),
			});
		}
	}

	// 4. Construir respuesta
	const invoiceData: InvoiceDataT = {
		reservation: {
			id: reservation._id.toString(),
			reserver: reservation.reserver as string,
			totalAmount: reservation.totalAmount as string,
			deposit: reservation.deposit as string | undefined,
			isPaid: (reservation.isPaid as boolean) ?? false,
			isDelivered: (reservation.isDelivered as boolean) ?? false,
			hasPromoApplied: (reservation.hasPromoApplied as boolean) ?? false,
			salespersonId: reservation.salespersonId as string | undefined,
			consumptionTypeId: reservation.consumptionTypeId as string,
			pickupPointId: reservation.pickupPointId as string | undefined,
			paymentMethodId: reservation.paymentMethodId as string,
			cashierId: reservation.cashierId as string | undefined,
			notes: reservation.notes as string | undefined,
			createdAt: (reservation.createdAt as Date).toISOString(),
			updatedAt: (reservation.updatedAt as Date).toISOString(),
		},
		products: products,
		vat: undefined, // No calculamos IVA en reservas actualmente
		linkedReservations: linkedReservations.length > 0 ? linkedReservations : undefined,
		totalFinal: reservation.totalAmount as string,
	};

	return invoiceData;
}
