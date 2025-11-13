import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Schema para validar que un string sea un ObjectId válido de MongoDB
 */
export const ObjectIdSchema = z
	.string()
	.min(24)
	.max(24)
	.regex(/^[a-f0-9]{24}$/i, 'Debe ser un ObjectId válido de MongoDB (24 caracteres hexadecimales)')
	.refine((val) => ObjectId.isValid(val), {
		message: 'ObjectId inválido',
	});

/**
 * Schema para params de ruta con id
 */
export const IdParamsSchema = z.object({
	id: ObjectIdSchema.describe('ID del recurso (ObjectId de MongoDB)'),
});

/**
 * Type para params con id
 */
export type IdParams = z.infer<typeof IdParamsSchema>;
