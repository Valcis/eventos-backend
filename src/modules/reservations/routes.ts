import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import {
	Reservation,
	ReservationCreate,
	ReservationReplace,
	ReservationPatch,
	type ReservationT,
} from './schema';
import { isoifyFields } from '../../shared/lib/dates';
import { Id } from '../catalogs/zod.schemas';
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../shared/schemas/responses';
import { InvoiceData } from './invoice-schema';

const TAG = 'Reservas';

const ReservationsQueryParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'totalAmount'])
		.optional()
		.describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	reserver: z.string().optional().describe('Filtrar por nombre del cliente (búsqueda parcial)'),
	isPaid: z.coerce.boolean().optional().describe('Filtrar por estado de pago'),
	isDelivered: z.coerce.boolean().optional().describe('Filtrar por estado de entrega'),
});

const ReservationPageResponse = createPagedResponse(Reservation, 'reservas');
const ReservationCreatedResponse = createCreatedResponse(Reservation, 'Reserva');

const IdParam = z.object({
	id: Id,
});

export default async function reservationsRoutes(app: FastifyInstance) {
	const { ObjectId } = await import('mongodb');

	const ctrl = makeController<ReservationT>(
		'reservations',
		(data) => {
			const transformed: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };

			// Convert salesperson embedded object to salespersonId (optional)
			if ('salesperson' in data && data.salesperson && typeof data.salesperson === 'object') {
				const salesperson = data.salesperson as { id: string };
				transformed.salespersonId = new ObjectId(salesperson.id);
				delete transformed.salesperson;
			}

			// Convert consumptionType embedded object to consumptionTypeId (required)
			if ('consumptionType' in data && data.consumptionType && typeof data.consumptionType === 'object') {
				const consumptionType = data.consumptionType as { id: string };
				transformed.consumptionTypeId = new ObjectId(consumptionType.id);
				delete transformed.consumptionType;
			}

			// Convert pickupPoint embedded object to pickupPointId (optional)
			if ('pickupPoint' in data && data.pickupPoint && typeof data.pickupPoint === 'object') {
				const pickupPoint = data.pickupPoint as { id: string };
				transformed.pickupPointId = new ObjectId(pickupPoint.id);
				delete transformed.pickupPoint;
			}

			// Convert paymentMethod embedded object to paymentMethodId (required)
			if ('paymentMethod' in data && data.paymentMethod && typeof data.paymentMethod === 'object') {
				const paymentMethod = data.paymentMethod as { id: string };
				transformed.paymentMethodId = new ObjectId(paymentMethod.id);
				delete transformed.paymentMethod;
			}

			// Convert cashier embedded object to cashierId (optional)
			if ('cashier' in data && data.cashier && typeof data.cashier === 'object') {
				const cashier = data.cashier as { id: string };
				transformed.cashierId = new ObjectId(cashier.id);
				delete transformed.cashier;
			}

			return transformed;
		},
		async (doc, db) => {
			const { _id, eventId, salespersonId, consumptionTypeId, pickupPointId, paymentMethodId, cashierId, ...rest } = doc;

			// Migrar appliedPromotionsSnapshot del formato antiguo al nuevo (retrocompatibilidad)
			// Formato antiguo: [{ promotionId, promotionName, productId, productName, quantity, discountCents, rule }]
			// Formato nuevo: [{ productId, productName, quantity, unitPriceOriginal, unitPriceFinal, subtotal, promotionsApplied: [...] }]
			if (rest.appliedPromotionsSnapshot && Array.isArray(rest.appliedPromotionsSnapshot)) {
				const snapshot = rest.appliedPromotionsSnapshot as Array<Record<string, unknown>>;
				// Detectar formato antiguo: tiene discountCents pero no tiene unitPriceOriginal
				if (snapshot.length > 0 && 'discountCents' in snapshot[0] && !('unitPriceOriginal' in snapshot[0])) {
					// Migrar al nuevo formato agrupando por productId
					const productMap = new Map<string, any>();
					for (const oldItem of snapshot) {
						const productId = String(oldItem.productId);
						if (!productMap.has(productId)) {
							productMap.set(productId, {
								productId,
								productName: String(oldItem.productName || 'Producto'),
								quantity: Number(oldItem.quantity || 1),
								unitPriceOriginal: '0.00', // No tenemos esta info en formato antiguo
								unitPriceFinal: '0.00', // Se calculará después
								subtotal: '0.00', // Se calculará después
								promotionsApplied: [],
							});
						}
						// Agregar promoción al producto
						productMap.get(productId)!.promotionsApplied.push({
							promotionId: String(oldItem.promotionId),
							promotionName: String(oldItem.promotionName || 'Promoción'),
							rule: String(oldItem.rule || 'Unknown'),
							discountPerUnit: '0.00', // No podemos calcular sin más info
						});
					}
					rest.appliedPromotionsSnapshot = Array.from(productMap.values());
				}
			}

			// Lookup salesperson (optional)
			let salesperson: { id: string; name: string; phone?: string; isActive: boolean } | undefined;
			if (salespersonId) {
				const salespersonDoc = await db.collection('salespeople').findOne({ _id: salespersonId });
				if (salespersonDoc) {
					salesperson = {
						id: String(salespersonDoc._id),
						name: salespersonDoc.name as string,
						phone: salespersonDoc.phone as string | undefined,
						isActive: (salespersonDoc.isActive ?? true) as boolean,
					};
				}
			}

			// Lookup consumptionType (required)
			const consumptionTypeDoc = await db.collection('consumption_types').findOne({ _id: consumptionTypeId });
			if (!consumptionTypeDoc) {
				throw new Error(`ConsumptionType not found: ${String(consumptionTypeId)}`);
			}
			const consumptionType = {
				id: String(consumptionTypeDoc._id),
				name: consumptionTypeDoc.name as string,
				notes: consumptionTypeDoc.notes as string | undefined,
				isActive: (consumptionTypeDoc.isActive ?? true) as boolean,
			};

			// Lookup pickupPoint (optional)
			let pickupPoint: { id: string; name: string; dealerName?: string; phone?: string; isActive: boolean } | undefined;
			if (pickupPointId) {
				const pickupPointDoc = await db.collection('pickup_points').findOne({ _id: pickupPointId });
				if (pickupPointDoc) {
					pickupPoint = {
						id: String(pickupPointDoc._id),
						name: pickupPointDoc.name as string,
						dealerName: pickupPointDoc.dealerName as string | undefined,
						phone: pickupPointDoc.phone as string | undefined,
						isActive: (pickupPointDoc.isActive ?? true) as boolean,
					};
				}
			}

			// Lookup paymentMethod (required)
			const paymentMethodDoc = await db.collection('payment_methods').findOne({ _id: paymentMethodId });
			if (!paymentMethodDoc) {
				throw new Error(`PaymentMethod not found: ${String(paymentMethodId)}`);
			}
			const paymentMethod = {
				id: String(paymentMethodDoc._id),
				name: paymentMethodDoc.name as string,
				notes: paymentMethodDoc.notes as string | undefined,
				isActive: (paymentMethodDoc.isActive ?? true) as boolean,
			};

			// Lookup cashier (optional)
			let cashier: { id: string; name: string; phone?: string; isActive: boolean } | undefined;
			if (cashierId) {
				const cashierDoc = await db.collection('cashiers').findOne({ _id: cashierId });
				if (cashierDoc) {
					cashier = {
						id: String(cashierDoc._id),
						name: cashierDoc.name as string,
						phone: cashierDoc.phone as string | undefined,
						isActive: (cashierDoc.isActive ?? true) as boolean,
					};
				}
			}

			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				eventId: String(eventId),
				...(salesperson ? { salesperson } : {}),
				consumptionType,
				...(pickupPoint ? { pickupPoint } : {}),
				paymentMethod,
				...(cashier ? { cashier } : {}),
				isActive: rest.isActive !== undefined ? rest.isActive : true,
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Reservation.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar reservas',
				description:
					'Obtiene un listado paginado y ordenable de reservas. Las reservas representan pedidos de clientes que incluyen productos, cantidades, precios con promociones y suplementos, estado de entrega y pago. Por defecto se ordenan por createdAt descendente.',
				querystring: ReservationsQueryParams,
				response: {
					200: ReservationPageResponse.describe('Lista paginada de reservas'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			// Handler personalizado para procesar filtros de reservas
			type QInput = z.infer<typeof ReservationsQueryParams>;
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const query = req.query as QInput;
			const { ObjectId } = await import('mongodb');
			const { makeCrud } = await import('../../infra/mongo/crud');

			// Separar paginación, ordenación y filtros
			const {
				limit: rawLimit,
				after,
				sortBy = 'createdAt',
				sortDir = 'desc',
				eventId,
				reserver,
				isPaid,
				isDelivered,
			} = query;
			const limit = rawLimit || 15;

			// Construir filtros de MongoDB
			const mongoFilters: Record<string, unknown> = { isActive: true };

			// Filtro por eventId: convertir a ObjectId
			if (eventId) {
				if (!ObjectId.isValid(eventId)) {
					const { BadRequestError } = await import('../../core/http/errors');
					throw new BadRequestError(`eventId inválido: "${eventId}" no es un ObjectId válido`);
				}
				mongoFilters.eventId = new ObjectId(eventId);
			}

			// Filtro por reserver: búsqueda parcial case-insensitive
			if (reserver) {
				mongoFilters.reserver = { $regex: reserver, $options: 'i' };
			}

			// Filtro por isPaid
			if (isPaid !== undefined) {
				mongoFilters.isPaid = isPaid;
			}

			// Filtro por isDelivered
			if (isDelivered !== undefined) {
				mongoFilters.isDelivered = isDelivered;
			}

			// Usar makeCrud directamente para aprovechar la paginación genérica
			const crud = makeCrud<ReservationT>({
				collection: 'reservations',
				toDb: (data) => data,
				fromDb: async (doc, db) => {
					const { _id, eventId, salespersonId, consumptionTypeId, pickupPointId, paymentMethodId, cashierId, ...rest } = doc;

					// Migrar appliedPromotionsSnapshot del formato antiguo al nuevo (retrocompatibilidad)
					// Formato antiguo: [{ promotionId, promotionName, productId, productName, quantity, discountCents, rule }]
					// Formato nuevo: [{ productId, productName, quantity, unitPriceOriginal, unitPriceFinal, subtotal, promotionsApplied: [...] }]
					if (rest.appliedPromotionsSnapshot && Array.isArray(rest.appliedPromotionsSnapshot)) {
						const snapshot = rest.appliedPromotionsSnapshot as Array<Record<string, unknown>>;
						// Detectar formato antiguo: tiene discountCents pero no tiene unitPriceOriginal
						if (snapshot.length > 0 && 'discountCents' in snapshot[0] && !('unitPriceOriginal' in snapshot[0])) {
							// Migrar al nuevo formato agrupando por productId
							const productMap = new Map<string, any>();
							for (const oldItem of snapshot) {
								const productId = String(oldItem.productId);
								if (!productMap.has(productId)) {
									productMap.set(productId, {
										productId,
										productName: String(oldItem.productName || 'Producto'),
										quantity: Number(oldItem.quantity || 1),
										unitPriceOriginal: '0.00', // No tenemos esta info en formato antiguo
										unitPriceFinal: '0.00', // Se calculará después
										subtotal: '0.00', // Se calculará después
										promotionsApplied: [],
									});
								}
								// Agregar promoción al producto
								productMap.get(productId)!.promotionsApplied.push({
									promotionId: String(oldItem.promotionId),
									promotionName: String(oldItem.promotionName || 'Promoción'),
									rule: String(oldItem.rule || 'Unknown'),
									discountPerUnit: '0.00', // No podemos calcular sin más info
								});
							}
							rest.appliedPromotionsSnapshot = Array.from(productMap.values());
						}
					}

					// Lookup salesperson (optional)
					let salesperson: { id: string; name: string; phone?: string; isActive: boolean } | undefined;
					if (salespersonId) {
						const salespersonDoc = await db.collection('salespeople').findOne({ _id: salespersonId });
						if (salespersonDoc) {
							salesperson = {
								id: String(salespersonDoc._id),
								name: salespersonDoc.name as string,
								phone: salespersonDoc.phone as string | undefined,
								isActive: (salespersonDoc.isActive ?? true) as boolean,
							};
						}
					}

					// Lookup consumptionType (required)
					const consumptionTypeDoc = await db.collection('consumption_types').findOne({ _id: consumptionTypeId });
					if (!consumptionTypeDoc) {
						throw new Error(`ConsumptionType not found: ${String(consumptionTypeId)}`);
					}
					const consumptionType = {
						id: String(consumptionTypeDoc._id),
						name: consumptionTypeDoc.name as string,
						notes: consumptionTypeDoc.notes as string | undefined,
						isActive: (consumptionTypeDoc.isActive ?? true) as boolean,
					};

					// Lookup pickupPoint (optional)
					let pickupPoint: { id: string; name: string; dealerName?: string; phone?: string; isActive: boolean } | undefined;
					if (pickupPointId) {
						const pickupPointDoc = await db.collection('pickup_points').findOne({ _id: pickupPointId });
						if (pickupPointDoc) {
							pickupPoint = {
								id: String(pickupPointDoc._id),
								name: pickupPointDoc.name as string,
								dealerName: pickupPointDoc.dealerName as string | undefined,
								phone: pickupPointDoc.phone as string | undefined,
								isActive: (pickupPointDoc.isActive ?? true) as boolean,
							};
						}
					}

					// Lookup paymentMethod (required)
					const paymentMethodDoc = await db.collection('payment_methods').findOne({ _id: paymentMethodId });
					if (!paymentMethodDoc) {
						throw new Error(`PaymentMethod not found: ${String(paymentMethodId)}`);
					}
					const paymentMethod = {
						id: String(paymentMethodDoc._id),
						name: paymentMethodDoc.name as string,
						notes: paymentMethodDoc.notes as string | undefined,
						isActive: (paymentMethodDoc.isActive ?? true) as boolean,
					};

					// Lookup cashier (optional)
					let cashier: { id: string; name: string; phone?: string; isActive: boolean } | undefined;
					if (cashierId) {
						const cashierDoc = await db.collection('cashiers').findOne({ _id: cashierId });
						if (cashierDoc) {
							cashier = {
								id: String(cashierDoc._id),
								name: cashierDoc.name as string,
								phone: cashierDoc.phone as string | undefined,
								isActive: (cashierDoc.isActive ?? true) as boolean,
							};
						}
					}

					const base = {
						...(rest as Record<string, unknown>),
						id: String(_id),
						eventId: String(eventId),
						...(salesperson ? { salesperson } : {}),
						consumptionType,
						...(pickupPoint ? { pickupPoint } : {}),
						paymentMethod,
						...(cashier ? { cashier } : {}),
						isActive: rest.isActive !== undefined ? rest.isActive : true,
					};
					const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
					return Reservation.parse(normalized);
				},
				softDelete: true,
				defaultSortBy: 'createdAt',
				defaultSortDir: 'desc',
			});

			const result = await crud.list(
				db,
				mongoFilters as import('mongodb').Filter<import('mongodb').Document>,
				{
					limit,
					after: after || null,
					sortBy,
					sortDir,
				},
			);

			return reply.send(result);
		},
	);

	app.get(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener reserva por ID',
				description:
					'Devuelve los detalles completos de una reserva específica incluyendo el pedido (mapa de productos y cantidades), importe total, estado de entrega, estado de pago y toda la información asociada.',
				params: IdParam,
				response: {
					200: Reservation.describe('Reserva encontrada'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	app.post(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Crear nueva reserva',
				description:
					'Registra una nueva reserva para un evento. Incluye el pedido (productos y cantidades), cálculo de precios con promociones y suplementos según el tipo de consumo, anticipo, y métodos de pago. VALIDA: existencia de productos, stock disponible, pertenencia al evento, y validez de todos los catálogos referenciados.',
				body: ReservationCreate,
				response: {
					201: ReservationCreatedResponse.describe('Reserva creada exitosamente'),
					400: ValidationErrorResponse.describe(
						'Error de validación: productos inexistentes, stock insuficiente, catálogos inválidos, etc.',
					),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					404: NotFoundResponse.describe('Evento no encontrado'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof ReservationCreate>;

			// Importar validaciones y control de stock
			const {
				validateEvent,
				validateProducts,
				validateReservationCatalogs,
				validateLinkedReservations,
			} = await import('./validation');
			const { createReservationWithStockControl } = await import('./stock');
			const { calculateReservationTotal } = await import('./pricing');
			const { ObjectId } = await import('mongodb');

			// 1. Validar que el evento existe y está activo
			await validateEvent(db, body.eventId);

			// 2. Validar productos: existencia, pertenencia al evento y stock
			await validateProducts(db, body.eventId, body.order);

			// 3. Validar catálogos: salesperson, consumptionType, pickupPoint, paymentMethod, cashier
			await validateReservationCatalogs(db, body.eventId, {
				salespersonId: body.salespersonId ?? undefined,
				consumptionTypeId: body.consumptionTypeId,
				pickupPointId: body.pickupPointId ?? undefined,
				paymentMethodId: body.paymentMethodId,
				cashierId: body.cashierId ?? undefined,
			});

			// 4. Validar reservas vinculadas (si existen)
			await validateLinkedReservations(db, body.linkedReservations, body.eventId);

			// 5. Calcular precio automáticamente (el cliente NO puede enviar totalAmount)
			const isPaid = body.isPaid ?? false;
			const isDelivered = body.isDelivered ?? false;
			const generateSnapshot = isPaid || isDelivered;

			const pricingResult = await calculateReservationTotal(
				db,
				body.eventId,
				body.order,
				body.consumptionTypeId,
				new Date(),
				isPaid,
				isDelivered,
				generateSnapshot,
				true, // Saltar validación de congelación en creación
			);

			// 6. Crear reserva con control de stock atómico
			// Preparar datos con timestamps y pricing calculado
			const reservationData = {
				...body,
				totalAmount: pricingResult.totalAmount, // Sobrescribir con precio calculado
				hasPromoApplied: pricingResult.hasPromoApplied,
				appliedPromotionsSnapshot: pricingResult.appliedPromotionsSnapshot,
				eventId: new ObjectId(body.eventId),
				isActive: body.isActive ?? true,
				isPaid: isPaid,
				isDelivered: isDelivered,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Crear reserva decrementando stock atómicamente
			const insertedId = await createReservationWithStockControl(db, reservationData);

			// Obtener la reserva creada para devolverla
			const created = await db.collection('reservations').findOne({
				_id: new ObjectId(insertedId),
			});

			if (!created) {
				throw new Error('Failed to retrieve created reservation');
			}

			// Transformar y devolver
			const { _id, ...rest } = created;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				eventId: String((created.eventId as typeof ObjectId).toString()),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			const result = Reservation.parse(normalized);

			return reply.code(201).send(result);
		},
	);

	app.put(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Reemplazar reserva completa',
				description:
					'Reemplaza todos los campos de una reserva existente (excepto eventId). Requiere proporcionar todos los campos obligatorios. VALIDA: existencia de productos, stock disponible, y validez de todos los catálogos referenciados.',
				params: IdParam,
				body: ReservationReplace,
				response: {
					200: Reservation.describe('Reserva actualizada exitosamente'),
					400: ValidationErrorResponse.describe(
						'Error de validación: productos inexistentes, stock insuficiente, catálogos inválidos, etc.',
					),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };
			const body = req.body as z.infer<typeof ReservationReplace>;

			// Importar validaciones
			const {
				validateProducts,
				validateReservationCatalogs,
				validateLinkedReservations,
			} = await import('./validation');
			const { recalculateReservationIfNeeded } = await import('./pricing');
			const { ObjectId } = await import('mongodb');
			const { NotFoundError } = await import('../../core/http/errors');

			// Obtener la reserva existente para obtener el eventId
			const existing = await db.collection('reservations').findOne({
				_id: new ObjectId(id),
			});

			if (!existing) {
				throw new NotFoundError('reservations', id);
			}

			const eventId = (existing.eventId as typeof ObjectId).toString();

			// Validar productos si hay cambios en el pedido
			if (body.order) {
				await validateProducts(db, eventId, body.order);
			}

			// Validar catálogos referenciados
			await validateReservationCatalogs(db, eventId, {
				salespersonId: body.salespersonId ?? undefined,
				consumptionTypeId: body.consumptionTypeId,
				pickupPointId: body.pickupPointId ?? undefined,
				paymentMethodId: body.paymentMethodId,
				cashierId: body.cashierId ?? undefined,
			});

			// Validar reservas vinculadas
			await validateLinkedReservations(db, body.linkedReservations, eventId);

			// Recalcular precio si es necesario
			const pricingResult = await recalculateReservationIfNeeded(db, id, {
				order: body.order,
				consumptionTypeId: body.consumptionTypeId,
				isPaid: body.isPaid,
				isDelivered: body.isDelivered,
			});

			// Aplicar pricing calculado si existe
			const updatedBody = pricingResult
				? {
						...body,
						totalAmount: pricingResult.totalAmount,
						hasPromoApplied: pricingResult.hasPromoApplied,
						appliedPromotionsSnapshot: pricingResult.appliedPromotionsSnapshot,
				  }
				: body;

			// Actualizar el request body con los valores calculados
			req.body = updatedBody;

			// Usar el controlador genérico para la actualización
			return ctrl.replace(req, reply);
		},
	);

	app.patch(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Actualizar reserva parcialmente',
				description:
					'Actualiza uno o más campos de una reserva existente. Útil para marcar como entregada (isDelivered), pagada (isPaid), o modificar el pedido. VALIDA: si se modifican referencias, verifica que existan y sean válidas.',
				params: IdParam,
				body: ReservationPatch,
				response: {
					200: Reservation.describe('Reserva actualizada exitosamente'),
					400: ValidationErrorResponse.describe(
						'Error de validación: productos inexistentes, stock insuficiente, catálogos inválidos, etc.',
					),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };
			const body = req.body as z.infer<typeof ReservationPatch>;

			// Importar validaciones
			const {
				validateProducts,
				validateOptionalCatalog,
				validateRequiredCatalog,
				validateLinkedReservations,
			} = await import('./validation');
			const { recalculateReservationIfNeeded } = await import('./pricing');
			const { ObjectId } = await import('mongodb');
			const { NotFoundError } = await import('../../core/http/errors');

			// Obtener la reserva existente para obtener el eventId
			const existing = await db.collection('reservations').findOne({
				_id: new ObjectId(id),
			});

			if (!existing) {
				throw new NotFoundError('reservations', id);
			}

			const eventId = (existing.eventId as typeof ObjectId).toString();

			// Validar productos si hay cambios en el pedido
			if (body.order) {
				await validateProducts(db, eventId, body.order);
			}

			// Validar catálogos solo si se están modificando
			if (body.salespersonId !== undefined) {
				await validateOptionalCatalog(db, 'vendedores', body.salespersonId, eventId, 'vendedor');
			}
			if (body.consumptionTypeId !== undefined) {
				await validateRequiredCatalog(
					db,
					'tipos de consumo',
					body.consumptionTypeId,
					eventId,
					'tipo de consumo',
				);
			}
			if (body.pickupPointId !== undefined) {
				await validateOptionalCatalog(
					db,
					'puntos de recogida',
					body.pickupPointId,
					eventId,
					'punto de recogida',
				);
			}
			if (body.paymentMethodId !== undefined) {
				await validateRequiredCatalog(
					db,
					'métodos de pago',
					body.paymentMethodId,
					eventId,
					'método de pago',
				);
			}
			if (body.cashierId !== undefined) {
				await validateOptionalCatalog(db, 'cashiers', body.cashierId, eventId, 'cajero');
			}

			// Validar reservas vinculadas si se están modificando
			if (body.linkedReservations !== undefined) {
				await validateLinkedReservations(db, body.linkedReservations, eventId);
			}

			// Recalcular precio si es necesario
			const pricingResult = await recalculateReservationIfNeeded(db, id, {
				order: body.order,
				consumptionTypeId: body.consumptionTypeId,
				isPaid: body.isPaid,
				isDelivered: body.isDelivered,
			});

			// Aplicar pricing calculado si existe
			const updatedBody = pricingResult
				? {
						...body,
						totalAmount: pricingResult.totalAmount,
						hasPromoApplied: pricingResult.hasPromoApplied,
						appliedPromotionsSnapshot: pricingResult.appliedPromotionsSnapshot,
				  }
				: body;

			// Actualizar el request body con los valores calculados
			req.body = updatedBody;

			// Usar el controlador genérico para la actualización
			return ctrl.patch(req, reply);
		},
	);

	app.delete(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Eliminar reserva',
				description:
					'Realiza un borrado lógico de la reserva (establece isActive=false) y RESTAURA el stock de los productos. La reserva no se elimina físicamente de la base de datos. El stock se devuelve automáticamente a los productos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe(
						'Reserva eliminada y stock restaurado exitosamente',
					),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };

			// Importar control de stock
			const { deleteReservationWithStockRestore } = await import('./stock');

			// Eliminar reserva y restaurar stock atómicamente
			await deleteReservationWithStockRestore(db, id);

			return reply.code(204).send();
		},
	);

	// GET /reservations/:id/invoice-data - Obtener datos de facturación
	app.get(
		'/:id/invoice-data',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener datos de facturación',
				description:
					'Devuelve información detallada de facturación de una reserva incluyendo:\n\n' +
					'- Información básica de la reserva (cliente, importes, estado)\n' +
					'- Detalle de productos con precios originales y finales\n' +
					'- Promociones aplicadas a cada producto (con descuentos)\n' +
					'- Suplementos aplicados (por tipo de consumo)\n' +
					'- Reservas vinculadas (para grupos o pedidos múltiples)\n' +
					'- Total final\n\n' +
					'**Nota**: Si la reserva tiene `isPaid=true` o `isDelivered=true`, los datos provienen del snapshot inmutable guardado en el momento del congelamiento. Si no, se calculan dinámicamente desde los productos actuales.',
				params: IdParam,
				response: {
					200: InvoiceData.describe('Datos de facturación de la reserva'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };

			// Importar función de generación de factura
			const { generateInvoiceData } = await import('./invoice');

			// Generar datos de facturación
			const invoiceData = await generateInvoiceData(db, id);

			return reply.send(invoiceData);
		},
	);
}
