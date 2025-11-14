/**
 * Índices de MongoDB para EVENTOS (revisión con soft-delete y fechas desc).
 *
 * Decisiones:
 * - Siempre filtramos por (eventId, isActive) → los índices de lectura empiezan por esos campos.
 * - Fechas en descendente (más nuevo primero).
 * - Unicidades:
 *   - events: (name, date) CI.
 *   - catálogos puros: (eventId, name) CI.
 *   - products y promotions (fuera de catálogos): (eventId, name) CI.
 * - Teléfono/email: NO indexados por defecto. Se dejan ejemplos PARCIALES comentados.
 *
 * Convenciones:
 * - `idx_*`: índice normal
 * - `uniq_*`: índice único
 */

import type { Db, IndexDescription } from 'mongodb';

/**
 * Collation case-insensitive:
 * - `locale: 'en'` y `strength: 2` → compara sin distinguir mayúsculas/minúsculas.
 * - Útil para unicidades basadas en `name` o campos de texto que no deben duplicarse
 *   por cambios de casing (p.ej., "Tarjeta" vs "tarjeta").
 */
const ci = { locale: 'en', strength: 2 } as const;

/**
 * Crea índices en una colección dada.
 *
 * @param db  Conexión Mongo.
 * @param col Nombre de la colección.
 * @param specs Lista de descriptores de índices (clave + opciones).
 *
 * Conceptos clave:
 * - `key`: objeto con los campos y el orden (1 ascendente, -1 descendente).
 * - `name`: nombre del índice (convención establecida arriba).
 * - `unique`: impone unicidad (rechaza insert/update que dupliquen la clave).
 * - `collation`: reglas de comparación (p.ej., case-insensitive).
 * - `partialFilterExpression`: restringe el alcance del índice a documentos que cumplan una condición (ej. solo “abiertos”).
 */
async function ensure(db: Db, col: string, specs: ReadonlyArray<IndexDescription>): Promise<void> {
	if (specs.length === 0) return;
	await db.collection(col).createIndexes(specs as IndexDescription[]);
}

/**
 * Crea/asegura todos los índices del sistema.
 *
 * Patrones (explicados la primera vez que aparecen):
 * - "Índice de rango temporal": para ordenar/filtrar por fechas (p.ej., `createdAt`, `date`).
 * - "Índice de FK": para filtrar por claves foráneas (`eventId`, etc.).
 * - "Índice de paginación estable": compuesto `{ <fk>: 1, _id: 1 }` para cursores consistentes.
 * - "Índice único case-insensitive": unicidad de `name` (u otros) sin diferenciar mayúsculas/minúsculas.
 * - "Índice parcial": unicidad/consulta que solo aplica a parte de los documentos (p.ej., reservas “abiertas”).
 */
export async function ensureMongoArtifacts(db: Db): Promise<void> {
	// ============================================================
	// ================  EVENTS (entidad principal) ===============
	// ============================================================
	await ensure(db, 'events', [
		// Fecha del evento (desc): listados de próximos/recientes según UI.
		{ key: { date: -1 }, name: 'idx_events_date_desc' },

		// Soft delete flag (acceso rápido por estado).
		{ key: { isActive: 1 }, name: 'idx_events_isActive' },

		// Unicidad: mismo nombre + misma fecha NO se permite (case-insensitive).
		{ key: { name: 1, date: 1 }, name: 'uniq_events_name_date', unique: true, collation: ci },
	]);

	// ============================================================
	// ==================== USUARIOS (USERS) ======================
	// ============================================================
	await ensure(db, 'usuarios', [
		// Email único (case-insensitive) - para login y registro
		{ key: { email: 1 }, name: 'uniq_usuarios_email', unique: true, collation: ci },

		// Soft delete flag (acceso rápido por estado)
		{ key: { isActive: 1 }, name: 'idx_usuarios_isActive' },

		// Provider + providerId único (para Auth0/OAuth)
		// Solo se aplica cuando providerId existe
		{
			key: { provider: 1, providerId: 1 },
			name: 'uniq_usuarios_provider_providerId',
			unique: true,
			partialFilterExpression: { providerId: { $exists: true } },
		},

		// Búsqueda por rol
		{ key: { role: 1, isActive: 1 }, name: 'idx_usuarios_role_isActive' },

		// Paginación estable
		{ key: { isActive: 1, _id: 1 }, name: 'idx_usuarios_isActive__id' },

		// Recientes primero
		{ key: { createdAt: -1 }, name: 'idx_usuarios_createdAt_desc' },

		// Último login
		{ key: { lastLoginAt: -1 }, name: 'idx_usuarios_lastLoginAt_desc' },
	]);

	// ============================================================
	// ======================== RESERVATIONS ======================
	// ============================================================
	await ensure(db, 'reservations', [
		// Paginación estable (por evento + soft-delete): cursor consistente.
		{ key: { eventId: 1, isActive: 1, _id: 1 }, name: 'idx_reservations_eventId_isActive__id' },

		// Acceso general por partición y estado.
		{ key: { eventId: 1, isActive: 1 }, name: 'idx_reservations_eventId_isActive' },

		// Recientes primero dentro de la partición/estado.
		{
			key: { eventId: 1, isActive: 1, createdAt: -1 },
			name: 'idx_reservations_eventId_isActive_createdAt_desc',
		},

		// FKs operativas (siempre bajo (eventId, isActive)):
		{
			key: { eventId: 1, isActive: 1, salespersonId: 1 },
			name: 'idx_reservations_eventId_isActive_salespersonId',
		},
		{
			key: { eventId: 1, isActive: 1, consumptionTypeId: 1 },
			name: 'idx_reservations_eventId_isActive_consumptionTypeId',
		},
		{
			key: { eventId: 1, isActive: 1, pickupPointId: 1 },
			name: 'idx_reservations_eventId_isActive_pickupPointId',
		},
		{
			key: { eventId: 1, isActive: 1, paymentMethodId: 1 },
			name: 'idx_reservations_eventId_isActive_paymentMethodId',
		},
		{
			key: { eventId: 1, isActive: 1, cashierId: 1 },
			name: 'idx_reservations_eventId_isActive_cashierId',
		},

		// Banderas de estado frecuentes:
		{
			key: { eventId: 1, isActive: 1, isDelivered: 1 },
			name: 'idx_reservations_eventId_isActive_isDelivered',
		},
		{
			key: { eventId: 1, isActive: 1, isPaid: 1 },
			name: 'idx_reservations_eventId_isActive_isPaid',
		},
	]);
	// Nota: sin índices únicos en reservations (petición: “no los actives”).

	// ============================================================
	// ========================== EXPENSES ========================
	// ============================================================
	await ensure(db, 'expenses', [
		// Paginación estable.
		{ key: { eventId: 1, isActive: 1, _id: 1 }, name: 'idx_expenses_eventId_isActive__id' },

		// Acceso general.
		{ key: { eventId: 1, isActive: 1 }, name: 'idx_expenses_eventId_isActive' },

		// Recientes primero.
		{
			key: { eventId: 1, isActive: 1, createdAt: -1 },
			name: 'idx_expenses_eventId_isActive_createdAt_desc',
		},

		// FKs de relación.
		{
			key: { eventId: 1, isActive: 1, payerId: 1 },
			name: 'idx_expenses_eventId_isActive_payerId',
		},
		{
			key: { eventId: 1, isActive: 1, unitId: 1 },
			name: 'idx_expenses_eventId_isActive_unitId',
		},
		{
			key: { eventId: 1, isActive: 1, storeId: 1 },
			name: 'idx_expenses_eventId_isActive_storeId',
		},

		// Estado de verificación.
		{
			key: { eventId: 1, isActive: 1, isVerified: 1 },
			name: 'idx_expenses_eventId_isActive_isVerified',
		},
	]);

	// ============================================================
	// ====================== CATÁLOGOS PUROS =====================
	// (excluye products y promotions)
	// ============================================================
	const catalogs = [
		'payers',
		'units',
		'consumption_types',
		'payment_methods',
		'cashiers',
		'salespeople',
		'partners',
		'pickup_points',
		'stores',
	] as const;

	for (const col of catalogs) {
		await ensure(db, col, [
			// Acceso por partición+estado.
			{ key: { eventId: 1, isActive: 1 }, name: `idx_${col}_eventId_isActive` },

			// Búsqueda por nombre dentro de la partición+estado (no único).
			{ key: { eventId: 1, isActive: 1, name: 1 }, name: `idx_${col}_eventId_isActive_name` },

			// Unicidad lógica exigida: (eventId, name) CI
			// (no incluye isActive para impedir duplicados "soft deleted").
			{
				key: { eventId: 1, name: 1 },
				name: `uniq_${col}_eventId_name`,
				unique: true,
				collation: ci,
			},
		]);
	}

	// Contacto: NO indexar por defecto (muchos nulos / poco uso).
	// Si en el futuro se filtra mucho por estos campos, usar índices PARCIALES:
	//
	// await ensure(db, 'stores', [
	//   {
	//     key: { eventId: 1, isActive: 1, email: 1 },
	//     name: 'idx_stores_eventId_isActive_email_partial',
	//     partialFilterExpression: { email: { $exists: true, $type: 'string' } },
	//   },
	//   {
	//     key: { eventId: 1, isActive: 1, phone: 1 },
	//     name: 'idx_stores_eventId_isActive_phone_partial',
	//     partialFilterExpression: { phone: { $exists: true, $type: 'string' } },
	//   },
	// ]);
	//
	// await ensure(db, 'pickup_points', [
	//   {
	//     key: { eventId: 1, isActive: 1, email: 1 },
	//     name: 'idx_pickup_points_eventId_isActive_email_partial',
	//     partialFilterExpression: { email: { $exists: true, $type: 'string' } },
	//   },
	//   {
	//     key: { eventId: 1, isActive: 1, phone: 1 },
	//     name: 'idx_pickup_points_eventId_isActive_phone_partial',
	//     partialFilterExpression: { phone: { $exists: true, $type: 'string' } },
	//   },
	// ]);

	// ============================================================
	// =========================== PRODUCTS =======================
	// (fuera de catálogos, con lógica propia)
	// ============================================================
	await ensure(db, 'products', [
		// Acceso por partición+estado.
		{ key: { eventId: 1, isActive: 1 }, name: 'idx_products_eventId_isActive' },

		// Unicidad exigida: (eventId, name) CI.
		{
			key: { eventId: 1, name: 1 },
			name: 'uniq_products_eventId_name',
			unique: true,
			collation: ci,
		},

		// Inventario (consultas por stock dentro del evento+estado).
		{ key: { eventId: 1, isActive: 1, stock: 1 }, name: 'idx_products_eventId_isActive_stock' },

		// Recientes primero dentro de la partición+estado.
		{
			key: { eventId: 1, isActive: 1, createdAt: -1 },
			name: 'idx_products_eventId_isActive_createdAt_desc',
		},

		// Paginación estable.
		{ key: { eventId: 1, isActive: 1, _id: 1 }, name: 'idx_products_eventId_isActive__id' },
	]);

	// ============================================================
	// ========================== PROMOTIONS ======================
	// (fuera de catálogos, reglas temporales y prioridad)
	// ============================================================
	await ensure(db, 'promotions', [
		// Acceso por partición+estado.
		{ key: { eventId: 1, isActive: 1 }, name: 'idx_promotions_eventId_isActive' },

		// Unicidad exigida: (eventId, name) CI.
		{
			key: { eventId: 1, name: 1 },
			name: 'uniq_promotions_eventId_name',
			unique: true,
			collation: ci,
		},

		// Rango temporal principal según tu preferencia:
		{
			key: { eventId: 1, isActive: 1, startDate: 1, endDate: 1 },
			name: 'idx_promotions_eventId_isActive_start_end',
		},

		// Apoyos si consultas separadas por inicio/fin o ventana general:
		{
			key: { eventId: 1, isActive: 1, startDate: 1 },
			name: 'idx_promotions_eventId_isActive_startDate',
		},
		{
			key: { eventId: 1, isActive: 1, endDate: 1 },
			name: 'idx_promotions_eventId_isActive_endDate',
		},

		// Resolución por prioridad (mantener).
		{
			key: { eventId: 1, isActive: 1, priority: 1 },
			name: 'idx_promotions_eventId_isActive_priority',
		},

		// Recientes primero dentro de la partición+estado.
		{
			key: { eventId: 1, isActive: 1, createdAt: -1 },
			name: 'idx_promotions_eventId_isActive_createdAt_desc',
		},
	]);
}
