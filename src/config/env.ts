import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const Env = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	BASE_PATH: z.string().default('/api'),
	MONGO_URL: z.string().min(1), // requerido
	MONGODB_DB: z.string().min(1), // requerido
	MONGO_BOOT: z.enum(['0', '1']).default('0'),
	AUTH_ENABLED: z.coerce.boolean().default(false),
});

export function getEnv() {
	const parsed = Env.safeParse(process.env);
	if (!parsed.success) {
		console.error(parsed.error.format());
		process.exit(1);
	}
	return parsed.data;
}
