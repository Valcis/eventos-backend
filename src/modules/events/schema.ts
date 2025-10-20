import { z } from 'zod';
import { Id, DateTime, Money } from '../catalogs/zod.schemas';

/**
 * Schema completo de Evento
 * Un evento es la entidad raíz que agrupa todos los catálogos, productos, reservas y gastos
 */
export const Event = z.object({
	isActive: z.boolean().default(true).describe('Indica si el evento está activo'),
	id: Id.optional().describe('Identificador único del evento'),
	name: z.string().min(1).describe('Nombre del evento. Ejemplo: "Feria de San Juan 2024"'),
	date: DateTime.describe(
		'Fecha y hora de celebración del evento. Ejemplo: "2024-06-24T12:00:00.000Z"',
	),
	capacity: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Capacidad máxima de asistentes (opcional). Ejemplo: 500'),
	capitalAmount: Money.optional().describe(
		'Capital inicial invertido en el evento (opcional). Ejemplo: "5000.00"',
	),
	createdAt: DateTime.optional().describe('Fecha de creación del registro'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type EventT = z.infer<typeof Event>;

/**
 * Schema para crear un nuevo evento (POST)
 * Excluye id, createdAt y updatedAt (generados automáticamente por el servidor)
 */
export const EventCreate = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación del evento'),
	name: z.string().min(1).describe('Nombre del evento. Ejemplo: "Feria de San Juan 2024"'),
	date: DateTime.describe(
		'Fecha y hora de celebración del evento. Ejemplo: "2024-06-24T12:00:00.000Z"',
	),
	capacity: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Capacidad máxima de asistentes. Ejemplo: 500'),
	capitalAmount: Money.optional().describe('Capital inicial invertido. Ejemplo: "5000.00"'),
});

export type EventCreateT = z.infer<typeof EventCreate>;

/**
 * Schema para reemplazo completo de evento (PUT)
 * Similar a EventCreate, todos los campos requeridos deben enviarse
 */
export const EventReplace = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación del evento'),
	name: z.string().min(1).describe('Nombre del evento'),
	date: DateTime.describe('Fecha y hora de celebración del evento'),
	capacity: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Capacidad máxima de asistentes'),
	capitalAmount: Money.optional().describe('Capital inicial invertido'),
});

export type EventReplaceT = z.infer<typeof EventReplace>;

/**
 * Schema para actualización parcial de evento (PATCH)
 * Todos los campos son opcionales - solo se actualizan los campos enviados
 */
export const EventPatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación del evento'),
	name: z.string().min(1).optional().describe('Nombre del evento'),
	date: DateTime.optional().describe('Fecha y hora de celebración'),
	capacity: z.number().int().nonnegative().optional().describe('Capacidad máxima'),
	capitalAmount: Money.optional().describe('Capital inicial'),
});

export type EventPatchT = z.infer<typeof EventPatch>;
