import { z } from 'zod';

/** Respuesta del healthcheck */
export const HealthResponse = z.object({
	status: z.literal('ok'),
	uptime: z.number().int().nonnegative(),
	timestamp: z.string().datetime(), // ISO-8601
});

export type HealthResponseT = z.infer<typeof HealthResponse>;
