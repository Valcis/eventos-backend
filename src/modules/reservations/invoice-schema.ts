import { z } from 'zod';
import { Id, Money, DateTime } from '../catalogs/zod.schemas';
import { AppliedPromotionSnapshot } from './schema';

/**
 * Detalle de un suplemento aplicado
 */
export const InvoiceSupplementDetail = z.object({
	concept: z.string().describe('Concepto del suplemento (ej: "Delivery", "Tarjeta")'),
	amount: Money.describe('Importe del suplemento en formato Money. Ejemplo: "0.50"'),
});

export type InvoiceSupplementDetailT = z.infer<typeof InvoiceSupplementDetail>;

/**
 * Detalle de un producto en la factura
 */
export const InvoiceProductDetail = z.object({
	productId: Id.describe('ID del producto'),
	productName: z.string().describe('Nombre del producto al momento de la reserva'),
	quantity: z.number().int().positive().describe('Cantidad pedida'),
	unitPriceOriginal: Money.describe('Precio unitario original sin promociones. Ejemplo: "10.00"'),
	unitPriceFinal: Money.describe('Precio unitario final con promociones y suplementos. Ejemplo: "8.50"'),
	subtotal: Money.describe('Subtotal de la línea (unitPriceFinal * quantity). Ejemplo: "25.50"'),
	promotionsApplied: z
		.array(AppliedPromotionSnapshot)
		.describe('Listado de promociones aplicadas a este producto'),
	supplementsApplied: z
		.array(InvoiceSupplementDetail)
		.describe('Listado de suplementos aplicados a este producto'),
});

export type InvoiceProductDetailT = z.infer<typeof InvoiceProductDetail>;

/**
 * Información básica de una reserva vinculada
 */
export const InvoiceLinkedReservation = z.object({
	id: Id.describe('ID de la reserva vinculada'),
	reserver: z.string().describe('Nombre del cliente de la reserva vinculada'),
	totalAmount: Money.describe('Importe total de la reserva vinculada'),
	isPaid: z.boolean().describe('¿Está pagada?'),
	isDelivered: z.boolean().describe('¿Está entregada?'),
	createdAt: DateTime.describe('Fecha de creación'),
});

export type InvoiceLinkedReservationT = z.infer<typeof InvoiceLinkedReservation>;

/**
 * Información de IVA (si aplica)
 */
export const InvoiceVATInfo = z.object({
	baseImponible: Money.describe('Base imponible (precio sin IVA)'),
	vatPct: z.number().describe('Porcentaje de IVA aplicado'),
	vatAmount: Money.describe('Importe de IVA'),
});

export type InvoiceVATInfoT = z.infer<typeof InvoiceVATInfo>;

/**
 * Información básica de la reserva para facturación
 */
export const InvoiceReservationInfo = z.object({
	id: Id.describe('ID de la reserva'),
	reserver: z.string().describe('Nombre del cliente'),
	totalAmount: Money.describe('Importe total de la reserva'),
	deposit: Money.optional().describe('Anticipo o señal pagada'),
	isPaid: z.boolean().describe('¿Está pagada?'),
	isDelivered: z.boolean().describe('¿Está entregada?'),
	hasPromoApplied: z.boolean().describe('¿Se aplicó alguna promoción?'),
	salespersonId: Id.optional().describe('ID del vendedor'),
	consumptionTypeId: Id.describe('ID del tipo de consumo'),
	pickupPointId: Id.optional().describe('ID del punto de recogida'),
	paymentMethodId: Id.describe('ID del método de pago'),
	cashierId: Id.optional().describe('ID del cajero'),
	notes: z.string().optional().describe('Notas adicionales'),
	createdAt: DateTime.describe('Fecha de creación'),
	updatedAt: DateTime.describe('Última actualización'),
});

export type InvoiceReservationInfoT = z.infer<typeof InvoiceReservationInfo>;

/**
 * Datos completos de facturación de una reserva
 *
 * Incluye:
 * - Información básica de la reserva
 * - Detalle de productos con promociones y suplementos
 * - IVA (si aplica)
 * - Reservas vinculadas
 * - Total final
 */
export const InvoiceData = z.object({
	reservation: InvoiceReservationInfo.describe('Información básica de la reserva'),
	products: z.array(InvoiceProductDetail).describe('Detalle de productos con precios y descuentos'),
	vat: InvoiceVATInfo.optional().describe('Información de IVA (si aplica)'),
	linkedReservations: z
		.array(InvoiceLinkedReservation)
		.optional()
		.describe('Reservas vinculadas a esta'),
	totalFinal: Money.describe('Total final de la reserva (equivalente a reservation.totalAmount)'),
});

export type InvoiceDataT = z.infer<typeof InvoiceData>;
