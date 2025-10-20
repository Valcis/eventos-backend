import { z } from 'zod';
import { Id, DateTime, Money, Quantity } from '../catalogs/zod.schemas';

/**
 * Schema completo de Gasto
 * Representa un gasto o compra de ingredientes/materiales para un evento
 */
export const Expense = z.object({
	isActive: z.boolean().default(true).describe('Estado de activación del gasto'),
	id: Id.optional().describe('Identificador único del gasto'),
	eventId: Id.describe('ID del evento al que pertenece este gasto'),
	ingredient: z
		.string()
		.min(1)
		.describe(
			'Nombre del ingrediente o material comprado. Ejemplo: "Carne de res", "Carbón", "Servilletas"',
		),
	unitId: Id.optional().describe(
		'ID de la unidad de medida (kg, L, ud, etc.). Opcional si no aplica unidad específica.',
	),
	quantity: Quantity.optional().describe(
		'Cantidad comprada en la unidad especificada. Ejemplo: "25.00" para 25 kg',
	),
	basePrice: Money.describe(
		'Precio base sin IVA. Calculado como netPrice / (1 + vatPct/100). Ejemplo: "192.31"',
	),
	vatPct: z
		.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)])
		.describe('Porcentaje de IVA aplicado. Valores permitidos: 0, 4, 10, 21'),
	vatAmount: Money.describe(
		'Importe del IVA aplicado. Calculado como basePrice * (vatPct/100). Ejemplo: "7.69"',
	),
	netPrice: Money.describe(
		'Precio final con IVA incluido (basePrice + vatAmount). Ejemplo: "200.00"',
	),
	isPackage: z
		.boolean()
		.describe(
			'Indica si la compra es por paquetes/lotes (true) o por unidades individuales (false)',
		),
	unitsPerPack: z
		.number()
		.int()
		.positive()
		.optional()
		.describe(
			'Número de unidades por paquete. Solo aplica si isPackage=true. Ejemplo: 100 servilletas por paquete',
		),
	unitPrice: Money.optional().describe(
		'Precio por unidad individual. Calculado como netPrice / (quantity * unitsPerPack) si isPackage=true, o netPrice / quantity si isPackage=false. Ejemplo: "0.07"',
	),
	payerId: Id.describe('ID del pagador que realizó el gasto'),
	storeId: Id.optional().describe('ID de la tienda/proveedor donde se realizó la compra. Opcional.'),
	isVerified: z
		.boolean()
		.describe(
			'Indica si el gasto ha sido verificado/aprobado (true) o está pendiente de revisión (false)',
		),
	notes: z
		.string()
		.optional()
		.describe('Notas adicionales sobre el gasto. Ejemplo: "Compra urgente para el evento"'),
	createdAt: DateTime.optional().describe('Fecha de creación del registro'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type ExpenseT = z.infer<typeof Expense>;

/**
 * Schema para crear un nuevo gasto (POST)
 * Excluye id, createdAt y updatedAt (generados por el servidor)
 */
export const ExpenseCreate = z.object({
	isActive: z
		.boolean()
		.default(true)
		.optional()
		.describe('Estado de activación del gasto'),
	eventId: Id.describe('ID del evento al que pertenece este gasto'),
	ingredient: z
		.string()
		.min(1)
		.describe('Nombre del ingrediente o material. Ejemplo: "Carne de res"'),
	unitId: Id.optional().describe('ID de la unidad de medida (opcional)'),
	quantity: Quantity.optional().describe('Cantidad comprada. Ejemplo: "25.00"'),
	basePrice: Money.describe('Precio base sin IVA. Ejemplo: "192.31"'),
	vatPct: z
		.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)])
		.describe('Porcentaje de IVA. Valores: 0, 4, 10, 21'),
	vatAmount: Money.describe('Importe del IVA. Ejemplo: "7.69"'),
	netPrice: Money.describe('Precio final con IVA. Ejemplo: "200.00"'),
	isPackage: z.boolean().describe('¿Es compra por paquetes? true/false'),
	unitsPerPack: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Unidades por paquete (si isPackage=true). Ejemplo: 100'),
	unitPrice: Money.optional().describe('Precio por unidad individual. Ejemplo: "0.07"'),
	payerId: Id.describe('ID del pagador'),
	storeId: Id.optional().describe('ID de la tienda/proveedor (opcional)'),
	isVerified: z.boolean().describe('¿Gasto verificado? true/false'),
	notes: z.string().optional().describe('Notas adicionales'),
});

export type ExpenseCreateT = z.infer<typeof ExpenseCreate>;

/**
 * Schema para reemplazo completo de gasto (PUT)
 * Similar a ExpenseCreate pero sin eventId (no se puede cambiar)
 */
export const ExpenseReplace = z.object({
	isActive: z
		.boolean()
		.default(true)
		.optional()
		.describe('Estado de activación del gasto'),
	ingredient: z.string().min(1).describe('Nombre del ingrediente o material'),
	unitId: Id.optional().describe('ID de la unidad de medida'),
	quantity: Quantity.optional().describe('Cantidad comprada'),
	basePrice: Money.describe('Precio base sin IVA'),
	vatPct: z
		.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)])
		.describe('Porcentaje de IVA'),
	vatAmount: Money.describe('Importe del IVA'),
	netPrice: Money.describe('Precio final con IVA'),
	isPackage: z.boolean().describe('¿Es compra por paquetes?'),
	unitsPerPack: z.number().int().positive().optional().describe('Unidades por paquete'),
	unitPrice: Money.optional().describe('Precio por unidad individual'),
	payerId: Id.describe('ID del pagador'),
	storeId: Id.optional().describe('ID de la tienda/proveedor'),
	isVerified: z.boolean().describe('¿Gasto verificado?'),
	notes: z.string().optional().describe('Notas adicionales'),
});

export type ExpenseReplaceT = z.infer<typeof ExpenseReplace>;

/**
 * Schema para actualización parcial de gasto (PATCH)
 * Todos los campos son opcionales
 */
export const ExpensePatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación. Ejemplo: true'),
	ingredient: z.string().min(1).optional().describe('Nombre del ingrediente'),
	unitId: Id.optional().describe('ID de la unidad de medida'),
	quantity: Quantity.optional().describe('Cantidad comprada'),
	basePrice: Money.optional().describe('Precio base sin IVA'),
	vatPct: z
		.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)])
		.optional()
		.describe('Porcentaje de IVA'),
	vatAmount: Money.optional().describe('Importe del IVA'),
	netPrice: Money.optional().describe('Precio final con IVA'),
	isPackage: z.boolean().optional().describe('¿Es compra por paquetes?'),
	unitsPerPack: z.number().int().positive().optional().describe('Unidades por paquete'),
	unitPrice: Money.optional().describe('Precio por unidad'),
	payerId: Id.optional().describe('ID del pagador'),
	storeId: Id.optional().describe('ID de la tienda'),
	isVerified: z.boolean().optional().describe('¿Gasto verificado?'),
	notes: z.string().optional().describe('Notas adicionales'),
});

export type ExpensePatchT = z.infer<typeof ExpensePatch>;
