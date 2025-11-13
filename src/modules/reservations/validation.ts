import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { AppError } from '../../core/http/errors';

/**
 * Resultado de validación de productos
 */
export interface ProductValidationResult {
	productId: string;
	name: string;
	stock: number;
	nominalPrice: string;
	supplements?: Record<string, number> | undefined;
	promotions?: string[] | undefined;
}

/**
 * Valida que un evento existe y está activo
 */
export async function validateEvent(db: Db, eventId: string): Promise<void> {
	const event = await db.collection('events').findOne({
		_id: new ObjectId(eventId),
		isActive: true,
	});

	if (!event) {
		throw new AppError(
			'NOT_FOUND',
			`El evento con ID ${eventId} no existe o está inactivo.`,
			404,
		);
	}
}

/**
 * Valida que todos los productos existen, pertenecen al evento y tienen stock
 */
export async function validateProducts(
	db: Db,
	eventId: string,
	order: Record<string, number>,
): Promise<ProductValidationResult[]> {
	const productIds = Object.keys(order);

	if (productIds.length === 0) {
		throw new AppError(
			'VALIDATION_ERROR',
			'El pedido (order) debe contener al menos un producto.',
			400,
		);
	}

	// Buscar todos los productos
	const products = await db
		.collection('products')
		.find({
			_id: { $in: productIds.map((id) => new ObjectId(id)) },
			isActive: true,
		})
		.toArray();

	// Verificar que todos los productos existen
	if (products.length !== productIds.length) {
		const foundIds = products.map((p) => p._id.toString());
		const missing = productIds.filter((id) => !foundIds.includes(id));

		throw new AppError(
			'VALIDATION_ERROR',
			`Los siguientes productos no existen o están inactivos: ${missing.join(', ')}`,
			400,
		);
	}

	// Verificar que todos pertenecen al evento
	const wrongEvent = products.filter((p) => p.eventId.toString() !== eventId);
	if (wrongEvent.length > 0) {
		const wrongIds = wrongEvent.map((p) => p._id.toString());
		throw new AppError(
			'VALIDATION_ERROR',
			`Los siguientes productos no pertenecen al evento: ${wrongIds.join(', ')}`,
			400,
		);
	}

	// Verificar stock disponible
	const insufficient: string[] = [];
	for (const [productId, quantity] of Object.entries(order)) {
		const product = products.find((p) => p._id.toString() === productId);
		if (product && (product.stock ?? 0) < quantity) {
			insufficient.push(
				`${product.name}: solicitado ${quantity}, disponible ${product.stock ?? 0}`,
			);
		}
	}

	if (insufficient.length > 0) {
		throw new AppError(
			'INSUFFICIENT_STOCK',
			`Stock insuficiente para los siguientes productos:\n${insufficient.join('\n')}`,
			400,
		);
	}

	// Retornar productos validados
	return products.map((p) => ({
		productId: p._id.toString(),
		name: p.name as string,
		stock: (p.stock as number) ?? 0,
		nominalPrice: (p.nominalPrice as string) ?? '0.00',
		supplements: p.supplement as Record<string, number> | undefined,
		promotions: p.promotions as string[] | undefined,
	}));
}

/**
 * Valida que un catálogo opcional existe y pertenece al evento
 */
export async function validateOptionalCatalog(
	db: Db,
	collectionName: string,
	catalogId: string | undefined,
	eventId: string,
	catalogLabel: string,
): Promise<void> {
	if (!catalogId) return; // Es opcional, no validar si no existe

	const item = await db.collection(collectionName).findOne({
		_id: new ObjectId(catalogId),
		eventId: new ObjectId(eventId),
		isActive: true,
	});

	if (!item) {
		throw new AppError(
			'VALIDATION_ERROR',
			`El ${catalogLabel} con ID ${catalogId} no existe, está inactivo o no pertenece al evento.`,
			400,
		);
	}
}

/**
 * Valida que un catálogo requerido existe y pertenece al evento
 */
export async function validateRequiredCatalog(
	db: Db,
	collectionName: string,
	catalogId: string,
	eventId: string,
	catalogLabel: string,
): Promise<void> {
	const item = await db.collection(collectionName).findOne({
		_id: new ObjectId(catalogId),
		eventId: new ObjectId(eventId),
		isActive: true,
	});

	if (!item) {
		throw new AppError(
			'VALIDATION_ERROR',
			`El ${catalogLabel} con ID ${catalogId} no existe, está inactivo o no pertenece al evento.`,
			400,
		);
	}
}

/**
 * Valida todas las referencias de catálogos de una reserva
 */
export async function validateReservationCatalogs(
	db: Db,
	eventId: string,
	data: {
		salespersonId: string | undefined;
		consumptionTypeId: string;
		pickupPointId: string | undefined;
		paymentMethodId: string;
		cashierId: string | undefined;
	},
): Promise<void> {
	// Validar en paralelo para mejor performance
	await Promise.all([
		validateOptionalCatalog(db, 'salespeople', data.salespersonId, eventId, 'vendedor'),
		validateRequiredCatalog(
			db,
			'consumptiontypes',
			data.consumptionTypeId,
			eventId,
			'tipo de consumo',
		),
		validateOptionalCatalog(
			db,
			'pickuppoints',
			data.pickupPointId,
			eventId,
			'punto de recogida',
		),
		validateRequiredCatalog(
			db,
			'paymentmethods',
			data.paymentMethodId,
			eventId,
			'método de pago',
		),
		validateOptionalCatalog(db, 'cashiers', data.cashierId, eventId, 'cajero'),
	]);
}

/**
 * Valida reservas vinculadas opcionales
 */
export async function validateLinkedReservations(
	db: Db,
	linkedReservations: string[] | undefined,
	eventId: string,
): Promise<void> {
	if (!linkedReservations || linkedReservations.length === 0) return;

	const reservations = await db
		.collection('reservations')
		.find({
			_id: { $in: linkedReservations.map((id) => new ObjectId(id)) },
		})
		.toArray();

	if (reservations.length !== linkedReservations.length) {
		const foundIds = reservations.map((r) => r._id.toString());
		const missing = linkedReservations.filter((id) => !foundIds.includes(id));
		throw new AppError(
			'VALIDATION_ERROR',
			`Las siguientes reservas vinculadas no existen: ${missing.join(', ')}`,
			400,
		);
	}

	// Verificar que pertenecen al mismo evento
	const wrongEvent = reservations.filter((r) => r.eventId.toString() !== eventId);
	if (wrongEvent.length > 0) {
		const wrongIds = wrongEvent.map((r) => r._id.toString());
		throw new AppError(
			'VALIDATION_ERROR',
			`Las siguientes reservas vinculadas no pertenecen al evento: ${wrongIds.join(', ')}`,
			400,
		);
	}
}
