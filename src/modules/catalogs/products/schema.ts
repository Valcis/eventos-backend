import { z } from 'zod';
import { Id, DateTime, Money } from '../zod.schemas';

/**
 * Schema completo de Producto
 * Representa un producto/artículo vendible dentro de un evento
 */
export const Product = z.object({
	isActive: z.boolean().default(true).describe('Estado de activación del producto'),
	id: Id.optional().describe('Identificador único del producto'),
	eventId: Id.describe('ID del evento al que pertenece este producto'),
	name: z.string().min(1).describe('Nombre del producto. Ejemplo: "Bocadillo de jamón"'),
	description: z
		.string()
		.optional()
		.describe(
			'Descripción detallada del producto. Ejemplo: "Bocadillo de jamón serrano con tomate y aceite de oliva"',
		),
	stock: z
		.number()
		.int()
		.nonnegative()
		.describe('Cantidad disponible en inventario. Ejemplo: 50'),
	promotions: z
		.array(Id)
		.optional()
		.default([])
		.describe(
			'Array de IDs de promociones aplicables a este producto. Ejemplo: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]',
		),
	nominalPrice: Money.optional().describe(
		'Precio nominal/base del producto sin suplementos ni promociones. Ejemplo: "5.50"',
	),
	supplement: z
		.record(Id, z.number().int())
		.optional()
		.describe(
			'Mapa de suplementos por tipo de consumo. Clave: consumptionTypeId, Valor: importe adicional en céntimos. Ejemplo: {"507f1f77bcf86cd799439011": 50, "507f1f77bcf86cd799439012": 0}',
		),
	notes: z
		.string()
		.optional()
		.describe(
			'Notas adicionales sobre el producto (ingredientes, alergias, etc.). Ejemplo: "Contiene gluten. Disponible sin gluten bajo pedido."',
		),
	createdAt: DateTime.optional().describe('Fecha de creación del producto'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type ProductT = z.infer<typeof Product>;

/**
 * Schema para crear un nuevo producto (POST)
 * Excluye id, createdAt y updatedAt (generados por el servidor)
 */
export const ProductCreate = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación del producto'),
	eventId: Id.describe('ID del evento al que pertenece este producto'),
	name: z.string().min(1).describe('Nombre del producto. Ejemplo: "Bocadillo de jamón"'),
	description: z
		.string()
		.optional()
		.describe(
			'Descripción detallada del producto. Ejemplo: "Bocadillo de jamón serrano con tomate y aceite de oliva"',
		),
	stock: z
		.number()
		.int()
		.nonnegative()
		.describe('Cantidad inicial en inventario. Ejemplo: 50'),
	promotions: z
		.array(Id)
		.optional()
		.default([])
		.describe('Array de IDs de promociones aplicables. Ejemplo: ["507f1f77bcf86cd799439011"]'),
	nominalPrice: Money.optional().describe(
		'Precio nominal/base del producto. Ejemplo: "5.50"',
	),
	supplement: z
		.record(Id, z.number().int())
		.optional()
		.describe(
			'Suplementos por tipo de consumo. Mapa consumptionTypeId -> céntimos. Ejemplo: {"507f1f77bcf86cd799439011": 50}',
		),
	notes: z
		.string()
		.optional()
		.describe('Notas adicionales. Ejemplo: "Contiene gluten"'),
});

export type ProductCreateT = z.infer<typeof ProductCreate>;

/**
 * Schema para reemplazo completo de producto (PUT)
 * Similar a ProductCreate pero sin eventId (no se puede cambiar)
 */
export const ProductReplace = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación del producto'),
	name: z.string().min(1).describe('Nombre del producto. Ejemplo: "Bocadillo de jamón"'),
	description: z
		.string()
		.optional()
		.describe('Descripción del producto. Ejemplo: "Bocadillo de jamón con tomate"'),
	stock: z.number().int().nonnegative().describe('Cantidad en inventario. Ejemplo: 50'),
	promotions: z
		.array(Id)
		.optional()
		.default([])
		.describe('IDs de promociones aplicables. Ejemplo: ["507f1f77bcf86cd799439011"]'),
	nominalPrice: Money.optional().describe('Precio nominal del producto. Ejemplo: "5.50"'),
	supplement: z
		.record(Id, z.number().int())
		.optional()
		.describe('Suplementos por consumo. Ejemplo: {"507f1f77bcf86cd799439011": 50}'),
	notes: z.string().optional().describe('Notas adicionales. Ejemplo: "Contiene gluten"'),
});

export type ProductReplaceT = z.infer<typeof ProductReplace>;

/**
 * Schema para actualización parcial de producto (PATCH)
 * Todos los campos son opcionales
 */
export const ProductPatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación. Ejemplo: true'),
	name: z.string().min(1).optional().describe('Nombre del producto. Ejemplo: "Bocadillo"'),
	description: z.string().optional().describe('Descripción del producto'),
	stock: z.number().int().nonnegative().optional().describe('Cantidad en inventario. Ejemplo: 25'),
	promotions: z
		.array(Id)
		.optional()
		.describe('IDs de promociones aplicables. Ejemplo: ["507f1f77bcf86cd799439011"]'),
	nominalPrice: Money.optional().describe('Precio nominal. Ejemplo: "5.50"'),
	supplement: z
		.record(Id, z.number().int())
		.optional()
		.describe('Suplementos por consumo. Ejemplo: {"507f1f77bcf86cd799439011": 50}'),
	notes: z.string().optional().describe('Notas adicionales'),
});

export type ProductPatchT = z.infer<typeof ProductPatch>;
