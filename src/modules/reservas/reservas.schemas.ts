import {z} from "zod";
import {itemEnvelopeSchema, listEnvelopeSchema, errorEnvelopeSchema} from "../../core/http/schemas";

export const reservaEstadoSchema = z.enum(["pendiente", "confirmada", "cancelada"]);

const reservaBase = z.object({
    id: z.string(),
    eventId: z.string().min(1),
    estado: reservaEstadoSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export const reservaItemSchema = itemEnvelopeSchema(reservaBase);
export const reservaListSchema = listEnvelopeSchema(reservaBase);
export const reservaErrorSchema = errorEnvelopeSchema;

export const reservasQuerySchema = z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sort: z.string().optional(), // "createdAt:desc" | "createdAt:asc"
    estado: reservaEstadoSchema.optional(),
});
