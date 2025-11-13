import type { Db, ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';

/**
 * Decrementa el stock de los productos de una orden
 * Debe ejecutarse dentro de una transacción
 */
export async function decrementStock(
	db: Db,
	order: Record<string, number>,
	session?: ClientSession,
): Promise<void> {
	const updates = Object.entries(order).map(([productId, quantity]) =>
		db
			.collection('products')
			.updateOne(
				{ _id: new ObjectId(productId) },
				{ $inc: { stock: -quantity }, $set: { updatedAt: new Date() } },
				session ? { session } : {},
			),
	);

	await Promise.all(updates);
}

/**
 * Incrementa el stock de los productos de una orden (al eliminar/cancelar reserva)
 * Debe ejecutarse dentro de una transacción
 */
export async function incrementStock(
	db: Db,
	order: Record<string, number>,
	session?: ClientSession,
): Promise<void> {
	const updates = Object.entries(order).map(([productId, quantity]) =>
		db
			.collection('products')
			.updateOne(
				{ _id: new ObjectId(productId) },
				{ $inc: { stock: quantity }, $set: { updatedAt: new Date() } },
				session ? { session } : {},
			),
	);

	await Promise.all(updates);
}

/**
 * Crea una reserva decrementando el stock atómicamente usando transacciones
 * Si MongoDB no soporta transacciones (standalone), usa operaciones secuenciales
 */
export async function createReservationWithStockControl(
	db: Db,
	reservationData: Record<string, unknown>,
): Promise<string> {
	// Extraer orden para decrementar stock
	const order = reservationData.order as Record<string, number>;

	// Intentar usar transacciones (requiere replica set)
	try {
		const session = db.client?.startSession();

		if (!session) {
			throw new Error('No se pudo crear sesión de MongoDB');
		}

		let insertedId: string | undefined;

		try {
			await session.withTransaction(async () => {
				// 1. Decrementar stock
				await decrementStock(db, order, session);

				// 2. Insertar reserva
				const result = await db
					.collection('reservations')
					.insertOne(reservationData, { session });
				insertedId = result.insertedId.toString();
			});

			return insertedId!;
		} finally {
			await session.endSession();
		}
	} catch (err) {
		// Si falla transacción (ej: MongoDB standalone), intentar sin transacciones
		// NOTA: Esto NO es atómico y puede causar inconsistencias en caso de error
		// En producción SIEMPRE usar replica set
		const error = err as Error;

		if (
			error.message.includes('Transaction') ||
			error.message.includes('session') ||
			error.message.includes('replica set')
		) {
			console.warn(
				'⚠️  Transacciones no disponibles. Ejecutando sin atomicidad. En producción usa replica set.',
			);

			// Sin transacciones: decrementar stock y crear reserva secuencialmente
			await decrementStock(db, order);
			const result = await db.collection('reservations').insertOne(reservationData);
			return result.insertedId.toString();
		}

		// Re-lanzar otros errores
		throw err;
	}
}

/**
 * Elimina (soft delete) una reserva e incrementa el stock
 * Si MongoDB soporta transacciones, se hace atómicamente
 */
export async function deleteReservationWithStockRestore(
	db: Db,
	reservationId: string,
): Promise<void> {
	// Buscar la reserva para obtener el order
	const reservation = await db.collection('reservations').findOne({
		_id: new ObjectId(reservationId),
	});

	if (!reservation) {
		throw new Error('Reservation not found');
	}

	const order = reservation.order as Record<string, number>;

	// Intentar usar transacciones
	try {
		const session = db.client?.startSession();

		if (!session) {
			throw new Error('No se pudo crear sesión de MongoDB');
		}

		try {
			await session.withTransaction(async () => {
				// 1. Soft delete de la reserva
				await db
					.collection('reservations')
					.updateOne(
						{ _id: new ObjectId(reservationId) },
						{ $set: { isActive: false, updatedAt: new Date() } },
						session ? { session } : {},
					);

				// 2. Restaurar stock
				await incrementStock(db, order, session);
			});
		} finally {
			await session.endSession();
		}
	} catch (err) {
		// Fallback sin transacciones
		const error = err as Error;

		if (
			error.message.includes('Transaction') ||
			error.message.includes('session') ||
			error.message.includes('replica set')
		) {
			console.warn(
				'⚠️  Transacciones no disponibles. Ejecutando sin atomicidad. En producción usa replica set.',
			);

			// Sin transacciones
			await db
				.collection('reservations')
				.updateOne(
					{ _id: new ObjectId(reservationId) },
					{ $set: { isActive: false, updatedAt: new Date() } },
				);
			await incrementStock(db, order);
			return;
		}

		throw err;
	}
}
