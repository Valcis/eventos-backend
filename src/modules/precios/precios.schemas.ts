import {z} from "zod";
import {itemEnvelopeSchema, listEnvelopeSchema, errorEnvelopeSchema} from "../../core/http/schemas";

const precioBase = z.object({
    id: z.string(),
    eventId: z.string().min(1),
    productoId: z.string().min(1),
    precio: z.string().regex(/^-?\d+(\.\d+)?$/, "precio debe ser un decimal en string"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export const precioItemSchema = itemEnvelopeSchema(precioBase);
export const precioListSchema = listEnvelopeSchema(precioBase);
export const precioErrorSchema = errorEnvelopeSchema;

export const preciosQuerySchema = z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sort: z.string().optional(), // "createdAt:desc" | "createdAt:asc"
    productoId: z.string().optional(),
});
