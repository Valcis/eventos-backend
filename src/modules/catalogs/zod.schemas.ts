import { z } from 'zod';

/**
 * Identificador único de entidad
 * Representado como string opaco (MongoDB ObjectId en formato hex)
 * Ejemplo: "507f1f77bcf86cd799439011"
 */
export const Id = z.string().min(1).describe('Identificador único de la entidad');

/**
 * Fecha y hora en formato ISO 8601 (UTC)
 * Ejemplo: "2024-03-15T10:30:00.000Z"
 */
export const DateTime = z.string().datetime().describe('Fecha y hora en formato ISO 8601 (UTC)');

/**
 * Porcentaje representado como número decimal entre 0 y 100
 * Ejemplos: 0 (0%), 15.5 (15.5%), 100 (100%)
 */
export const Percentage = z.number().min(0).max(100).describe('Porcentaje entre 0 y 100');

/**
 * Importes monetarios positivos (capitalAmount, precios, etc.)
 * Formato flexible: acepta enteros o decimales con hasta 2 decimales
 * Solo valores no negativos (>= 0)
 * Ejemplos: "0", "100", "5000", "123.45", "5000.00"
 */
export const Money = z
	.string()
	.regex(/^(0|[1-9]\d{0,4})(\.\d{1,2})?$/)
	.describe(
		'Importe monetario positivo. Acepta enteros o decimales (máx. 5 enteros + hasta 2 decimales). Ejemplos: "0", "100", "5000.00", "123.45"',
	);

/**
 * Cantidades/stock representados como string con formato decimal fijo
 * Formato: hasta 5 dígitos enteros + 2 decimales obligatorios
 * Solo valores no negativos (para inventarios, cantidades de productos)
 * Ejemplos: "0.00", "10.50", "999.99"
 */
export const Quantity = z
	.string()
	.regex(/^(0|[1-9]\d{0,4})\.\d{2}$/)
	.describe(
		'Cantidad o inventario en formato decimal (máx. 5 enteros + 2 decimales). Solo valores >= 0. Ejemplos: "0.00", "10.50", "999.99"',
	);

/**
 * Campos de borrado lógico (soft delete)
 * isActive = true: entidad activa/visible
 * isActive = false: entidad marcada como eliminada (oculta)
 */
export const SoftDelete = z
	.object({
		isActive: z
			.boolean()
			.default(true)
			.describe('Indica si la entidad está activa (true) o eliminada lógicamente (false)'),
	})
	.describe('Campos de borrado lógico');
