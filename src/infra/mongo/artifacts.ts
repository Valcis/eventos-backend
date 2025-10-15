/* Auto-generated on request: MongoDB indices for EVENTOS backend
 * Fuente: schemas en src/schemas y docs/db.indexes.md / *.puml
 * NOTA: nombres de índices siguen el patrón existente: 'idx_*' y 'uniq_*'
 */
import type { Db, IndexDescription } from 'mongodb';

const ci = { locale: 'en', strength: 2 } as const; // Case-insensitive uniques

async function ensure(db: Db, col: string, specs: IndexDescription[]): Promise<void> {
	if (specs.length === 0) return;
	await db.collection(col).createIndexes(specs);
}

export async function ensureMongoArtifacts(db: Db): Promise<void> {
	// EVENTS
	await ensure(db, 'events', [
		{ key: { date: 1 }, name: 'idx_events_date' },
		{ key: { name: 1 }, name: 'uniq_events_name', unique: true, collation: ci },
	]);

	// RESERVATIONS
	await ensure(db, 'reservations', [
		{ key: { eventId: 1, createdAt: -1 }, name: 'idx_reservations_eventId_createdAt' },
		{
			key: { eventId: 1, isPaid: 1, createdAt: -1 },
			name: 'idx_reservations_eventId_isPaid_createdAt',
		},
		{
			key: { eventId: 1, isDelivered: 1, createdAt: -1 },
			name: 'idx_reservations_eventId_isDelivered_createdAt',
		},
		{
			key: { salespersonId: 1, createdAt: -1 },
			name: 'idx_reservations_salespersonId_createdAt',
		},
		{
			key: { paymentMethodId: 1, createdAt: -1 },
			name: 'idx_reservations_paymentMethodId_createdAt',
		},
		{ key: { cashierId: 1, createdAt: -1 }, name: 'idx_reservations_cashierId_createdAt' },
		{
			key: { eventId: 1, reserver: 1 },
			name: 'uniq_reservations_eventId_reserver',
			unique: true,
			collation: ci,
		},
	]);

	// PRODUCTS
	await ensure(db, 'products', [
		{
			key: { eventId: 1, name: 1 },
			name: 'uniq_products_eventId_name',
			unique: true,
			collation: ci,
		},
		{
			key: { eventId: 1, categoryId: 1, name: 1 },
			name: 'idx_products_eventId_categoryId_name',
		},
		{ key: { eventId: 1, isActive: 1 }, name: 'idx_products_eventId_isActive' },
	]);

	// PROMOTIONS
	await ensure(db, 'promotions', [
		{ key: { eventId: 1, startDate: 1, endDate: 1 }, name: 'idx_promotions_eventId_start_end' },
		{ key: { eventId: 1, priority: -1 }, name: 'idx_promotions_eventId_priority_desc' },
	]);

	// EXPENSES
	await ensure(db, 'expenses', [
		{ key: { eventId: 1, createdAt: -1 }, name: 'idx_expenses_eventId_createdAt' },
		{ key: { eventId: 1, isVerified: 1 }, name: 'idx_expenses_eventId_isVerified' },
		{ key: { payerId: 1, createdAt: -1 }, name: 'idx_expenses_payerId_createdAt' },
		{ key: { storeId: 1, createdAt: -1 }, name: 'idx_expenses_storeId_createdAt' },
	]);

	// CATALOGS (per-event unique by name)
	const catalogs = [
		'units',
		'salespeople',
		'paymentmethods',
		'cashiers',
		'stores',
		'consumptiontypes',
		'payers',
		'pickuppoints',
		'partners',
	];
	for (const col of catalogs) {
		await ensure(db, col, [
			{ key: { eventId: 1 }, name: `idx_${col}_eventId` },
			{
				key: { eventId: 1, name: 1 },
				name: `uniq_${col}_eventId_name`,
				unique: true,
				collation: ci,
			},
		]);
	}
}
