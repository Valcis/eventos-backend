import { z } from 'zod';
import { Id, DateTime, Money } from '../catalogs/zod.schemas';

/**
 * Schema de snapshot de promoción aplicada
 * Guarda un registro inmutable de cada promoción aplicada a un producto
 */
export const AppliedPromotionSnapshot = z.object({
	promotionId: Id.describe('ID de la promoción aplicada'),
	promotionName: z.string().describe('Nombre de la promoción al momento de aplicarla'),
	rule: z.string().describe('Tipo de regla de la promoción (XForY, DiscountPerUnit, etc.)'),
	discountPerUnit: Money.describe('Descuento aplicado por unidad. Ejemplo: "2.50"'),
});

export type AppliedPromotionSnapshotT = z.infer<typeof AppliedPromotionSnapshot>;

/**
 * Schema de snapshot de producto con promociones
 * Guarda un registro inmutable de cada línea de pedido con sus promociones aplicadas
 */
export const ProductPromotionSnapshot = z.object({
	productId: Id.describe('ID del producto'),
	productName: z.string().describe('Nombre del producto al momento de la reserva'),
	quantity: z.number().int().positive().describe('Cantidad pedida'),
	unitPriceOriginal: Money.describe('Precio unitario original sin promociones. Ejemplo: "10.00"'),
	unitPriceFinal: Money.describe('Precio unitario final con promociones aplicadas. Ejemplo: "7.50"'),
	subtotal: Money.describe('Subtotal de la línea (unitPriceFinal * quantity). Ejemplo: "22.50"'),
	promotionsApplied: z
		.array(AppliedPromotionSnapshot)
		.describe('Listado de promociones aplicadas a este producto'),
});

export type ProductPromotionSnapshotT = z.infer<typeof ProductPromotionSnapshot>;

/**
 * Schema completo de Reserva
 * Representa una reserva/pedido realizado por un cliente para un evento
 */
export const Reservation = z.object({
	isActive: z.boolean().default(true).describe('Estado de activación de la reserva'),
	id: Id.optional().describe('Identificador único de la reserva'),
	eventId: Id.describe('ID del evento al que pertenece esta reserva'),
	reserver: z
		.string()
		.min(1)
		.describe('Nombre del cliente que realiza la reserva. Ejemplo: "Juan Pérez"'),
	order: z
		.record(z.string(), z.number().int().positive())
		.describe(
			'Pedido como mapa de productId -> cantidad. Ejemplo: {"507f1f77bcf86cd799439011": 2, "507f1f77bcf86cd799439012": 3}',
		),
	totalAmount: Money.describe(
		'Importe total de la reserva con promociones y suplementos aplicados. Ejemplo: "43.50"',
	),
	salespersonId: Id.optional().describe(
		'ID del vendedor que gestionó la reserva. Opcional si la reserva es online.',
	),
	consumptionTypeId: Id.describe(
		'ID del tipo de consumo (para llevar, en el sitio, etc.). Afecta a los suplementos del precio.',
	),
	pickupPointId: Id.optional().describe(
		'ID del punto de recogida donde el cliente recogerá su pedido. Opcional.',
	),
	hasPromoApplied: z
		.boolean()
		.describe('Indica si se aplicó alguna promoción al calcular el totalAmount'),
	linkedReservations: z
		.array(Id)
		.optional()
		.describe(
			'Array de IDs de otras reservas relacionadas (para grupos o pedidos múltiples). Ejemplo: ["507f1f77bcf86cd799439011"]',
		),
	deposit: Money.optional().describe(
		'Anticipo o señal pagada al realizar la reserva. Puede ser "0.00" si no hubo anticipo. Ejemplo: "20.00"',
	),
	isDelivered: z
		.boolean()
		.default(false)
		.describe(
			'Indica si el pedido ha sido entregado al cliente (true) o está pendiente (false)',
		),
	isPaid: z
		.boolean()
		.default(false)
		.describe(
			'Indica si la reserva ha sido pagada completamente (true) o está pendiente (false)',
		),
	paymentMethodId: Id.describe(
		'ID del método de pago utilizado o previsto (Efectivo, Tarjeta, Bizum, etc.)',
	),
	cashierId: Id.optional().describe('ID del cajero que gestionó el pago. Opcional.'),
	notes: z
		.string()
		.optional()
		.describe(
			'Notas adicionales sobre la reserva. Ejemplo: "Cliente habitual", "Sin gluten", "Pedido urgente"',
		),
	appliedPromotionsSnapshot: z
		.array(ProductPromotionSnapshot)
		.optional()
		.describe(
			'Snapshot inmutable de productos, precios y promociones aplicadas al momento de crear/modificar la reserva. Se guarda cuando isPaid=true o isDelivered=true para auditoría.',
		),
	createdAt: DateTime.optional().describe('Fecha de creación de la reserva'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type ReservationT = z.infer<typeof Reservation>;

/**
 * Schema para crear una nueva reserva (POST)
 * Excluye id, createdAt y updatedAt (generados por el servidor)
 */
export const ReservationCreate = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación de la reserva'),
	eventId: Id.describe('ID del evento'),
	reserver: z.string().min(1).describe('Nombre del cliente. Ejemplo: "Juan Pérez"'),
	order: z
		.record(z.string(), z.number().int().positive())
		.describe('Mapa productId -> cantidad. Ejemplo: {"507f...": 2, "608f...": 3}'),
	totalAmount: Money.describe('Importe total de la reserva. Ejemplo: "43.50"'),
	salespersonId: Id.optional().describe('ID del vendedor (opcional)'),
	consumptionTypeId: Id.describe('ID del tipo de consumo'),
	pickupPointId: Id.optional().describe('ID del punto de recogida (opcional)'),
	hasPromoApplied: z.boolean().describe('¿Se aplicó promoción? true/false'),
	linkedReservations: z.array(Id).optional().describe('IDs de reservas relacionadas (opcional)'),
	deposit: Money.optional().describe('Anticipo pagado. Ejemplo: "20.00"'),
	isDelivered: z.boolean().default(false).optional().describe('¿Pedido entregado? true/false'),
	isPaid: z.boolean().default(false).optional().describe('¿Reserva pagada? true/false'),
	paymentMethodId: Id.describe('ID del método de pago'),
	cashierId: Id.optional().describe('ID del cajero (opcional)'),
	notes: z.string().optional().describe('Notas adicionales'),
	appliedPromotionsSnapshot: z
		.array(ProductPromotionSnapshot)
		.optional()
		.describe('Snapshot de promociones aplicadas (opcional, generado automáticamente)'),
});

export type ReservationCreateT = z.infer<typeof ReservationCreate>;

/**
 * Schema para reemplazo completo de reserva (PUT)
 * Similar a ReservationCreate pero sin eventId (no se puede cambiar)
 */
export const ReservationReplace = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación'),
	reserver: z.string().min(1).describe('Nombre del cliente'),
	order: z.record(z.string(), z.number().int().positive()).describe('Mapa productId -> cantidad'),
	totalAmount: Money.describe('Importe total'),
	salespersonId: Id.optional().describe('ID del vendedor'),
	consumptionTypeId: Id.describe('ID del tipo de consumo'),
	pickupPointId: Id.optional().describe('ID del punto de recogida'),
	hasPromoApplied: z.boolean().describe('¿Promoción aplicada?'),
	linkedReservations: z.array(Id).optional().describe('IDs de reservas relacionadas'),
	deposit: Money.optional().describe('Anticipo pagado'),
	isDelivered: z.boolean().default(false).optional().describe('¿Pedido entregado?'),
	isPaid: z.boolean().default(false).optional().describe('¿Reserva pagada?'),
	paymentMethodId: Id.describe('ID del método de pago'),
	cashierId: Id.optional().describe('ID del cajero'),
	notes: z.string().optional().describe('Notas adicionales'),
	appliedPromotionsSnapshot: z
		.array(ProductPromotionSnapshot)
		.optional()
		.describe('Snapshot de promociones aplicadas (opcional)'),
});

export type ReservationReplaceT = z.infer<typeof ReservationReplace>;

/**
 * Schema para actualización parcial de reserva (PATCH)
 * Todos los campos son opcionales
 */
export const ReservationPatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación. Ejemplo: true'),
	reserver: z.string().min(1).optional().describe('Nombre del cliente'),
	order: z
		.record(z.string(), z.number().int().positive())
		.optional()
		.describe('Mapa productId -> cantidad'),
	totalAmount: Money.optional().describe('Importe total'),
	salespersonId: Id.optional().describe('ID del vendedor'),
	consumptionTypeId: Id.optional().describe('ID del tipo de consumo'),
	pickupPointId: Id.optional().describe('ID del punto de recogida'),
	hasPromoApplied: z.boolean().optional().describe('¿Promoción aplicada?'),
	linkedReservations: z.array(Id).optional().describe('IDs de reservas relacionadas'),
	deposit: Money.optional().describe('Anticipo pagado'),
	isDelivered: z.boolean().optional().describe('¿Pedido entregado?'),
	isPaid: z.boolean().optional().describe('¿Reserva pagada?'),
	paymentMethodId: Id.optional().describe('ID del método de pago'),
	cashierId: Id.optional().describe('ID del cajero'),
	notes: z.string().optional().describe('Notas adicionales'),
	appliedPromotionsSnapshot: z
		.array(ProductPromotionSnapshot)
		.optional()
		.describe('Snapshot de promociones aplicadas (opcional)'),
});

export type ReservationPatchT = z.infer<typeof ReservationPatch>;
