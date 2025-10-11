import { z } from "zod";
import { itemEnvelopeSchema, listEnvelopeSchema, errorEnvelopeSchema } from "../../core/http/schemas";

const gastoBase = z.object({
    id: z.string(),
    eventId: z.string().min(1),
    importe: z.string().regex(/^-?\d+(\.\d+)?$/, "importe debe ser un decimal en string"),
    descripcion: z.string().max(1000).nullable().optional(),
    proveedor: z.string().max(255).nullable().optional(),
    comprobado: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export const gastoItemSchema = itemEnvelopeSchema(gastoBase);
export const gastoListSchema = listEnvelopeSchema(gastoBase);
export const gastoErrorSchema = errorEnvelopeSchema;

export const gastosQuerySchema = z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sort: z.string().optional(),          // "createdAt:desc" | "createdAt:asc"
    comprobado: z.enum(["true", "false"]).optional(),
    q: z.string().max(200).optional(),    // búsqueda texto en descripcion/proveedor
});
