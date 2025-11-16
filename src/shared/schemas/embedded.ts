import { z } from 'zod';
import { Id, DateTime, Money } from '../../modules/catalogs/zod.schemas';

/**
 * Schemas para objetos embebidos (populated references)
 * Estos schemas representan versiones ligeras de las entidades completas,
 * conteniendo solo los campos esenciales para mostrar en el frontend.
 */

/**
 * Evento embebido (para mostrar en listas)
 */
export const EmbeddedEvent = z.object({
	id: Id,
	name: z.string(),
	date: DateTime,
	isActive: z.boolean(),
});

export type EmbeddedEventT = z.infer<typeof EmbeddedEvent>;

/**
 * Vendedor embebido
 */
export const EmbeddedSalesperson = z.object({
	id: Id,
	name: z.string(),
	phone: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedSalespersonT = z.infer<typeof EmbeddedSalesperson>;

/**
 * Tipo de consumo embebido
 */
export const EmbeddedConsumptionType = z.object({
	id: Id,
	name: z.string(),
	notes: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedConsumptionTypeT = z.infer<typeof EmbeddedConsumptionType>;

/**
 * Punto de recogida embebido
 */
export const EmbeddedPickupPoint = z.object({
	id: Id,
	name: z.string(),
	dealerName: z.string().optional(),
	phone: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedPickupPointT = z.infer<typeof EmbeddedPickupPoint>;

/**
 * Método de pago embebido
 */
export const EmbeddedPaymentMethod = z.object({
	id: Id,
	name: z.string(),
	notes: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedPaymentMethodT = z.infer<typeof EmbeddedPaymentMethod>;

/**
 * Cajero embebido
 */
export const EmbeddedCashier = z.object({
	id: Id,
	name: z.string(),
	phone: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedCashierT = z.infer<typeof EmbeddedCashier>;

/**
 * Pagador embebido
 */
export const EmbeddedPayer = z.object({
	id: Id,
	name: z.string(),
	phone: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedPayerT = z.infer<typeof EmbeddedPayer>;

/**
 * Tienda embebida
 */
export const EmbeddedStore = z.object({
	id: Id,
	name: z.string(),
	seller: z.string().optional(),
	phone: z.string().optional(),
	isActive: z.boolean(),
});

export type EmbeddedStoreT = z.infer<typeof EmbeddedStore>;

/**
 * Unidad embebida
 */
export const EmbeddedUnit = z.object({
	id: Id,
	name: z.string(),
	abbreviation: z.string(),
	isActive: z.boolean(),
});

export type EmbeddedUnitT = z.infer<typeof EmbeddedUnit>;

/**
 * Producto embebido (versión ligera)
 */
export const EmbeddedProduct = z.object({
	id: Id,
	name: z.string(),
	description: z.string().optional(),
	nominalPrice: Money,
	stock: z.number(),
	isActive: z.boolean(),
});

export type EmbeddedProductT = z.infer<typeof EmbeddedProduct>;

/**
 * Promoción embebida (versión ligera)
 */
export const EmbeddedPromotion = z.object({
	id: Id,
	name: z.string(),
	description: z.string().optional(),
	rule: z.string(),
	priority: z.number(),
	isCumulative: z.boolean(),
	startDate: DateTime,
	endDate: DateTime,
	isActive: z.boolean(),
});

export type EmbeddedPromotionT = z.infer<typeof EmbeddedPromotion>;
