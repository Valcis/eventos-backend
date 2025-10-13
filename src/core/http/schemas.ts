import { z } from 'zod';

export const metaPageSchema = z.object({
	page: z.number().int().nonnegative(),
	pageSize: z.number().int().positive(),
	totalItems: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
});

export const errorEnvelopeSchema = z.object({
	ok: z.literal(false),
	code: z.string(),
	message: z.string(),
	details: z.record(z.unknown()).optional(),
});

export function itemEnvelopeSchema<T extends z.ZodTypeAny>(item: T) {
	return z.object({
		ok: z.literal(true),
		data: item,
	});
}

export function listEnvelopeSchema<T extends z.ZodTypeAny>(item: T) {
	return z.object({
		ok: z.literal(true),
		data: z.array(item),
		meta: metaPageSchema,
	});
}

export const errorSchema = {
	type: 'object',
	properties: {
		ok: { type: 'boolean', const: false },
		code: { type: 'string' },
		message: { type: 'string' },
	},
	required: ['ok', 'message'],
	additionalProperties: false,
} as const;
