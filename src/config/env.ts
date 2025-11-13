import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const Env = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	BASE_PATH: z.string().default('/api'),
	MONGO_URL: z.string().min(1), // requerido
	MONGODB_DB: z.string().min(1), // requerido
	MONGO_BOOT: z.enum(['0', '1']).default('0'),
	AUTH_ENABLED: z
		.string()
		.optional()
		.default('false')
		.transform((val) => val === 'true' || val === '1'),
	// JWT Configuration
	JWT_SECRET: z.string().min(32).optional(), // Requerido si AUTH_ENABLED=true
	JWT_ALGORITHM: z
		.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'])
		.optional()
		.default('HS256'),
	JWT_EXPIRES_IN: z.string().optional().default('24h'), // Ej: "1h", "7d", "30m"
	// CORS Configuration
	CORS_ORIGINS: z.string().optional(), // Lista separada por comas de orígenes permitidos
	// Rate Limiting
	RATE_LIMIT_MAX: z.coerce.number().int().min(1).optional().default(100),
	RATE_LIMIT_WINDOW: z.string().optional().default('1 minute'),
	// Swagger
	SWAGGER_ENABLED: z
		.string()
		.optional()
		.default('true')
		.transform((val) => val === 'true' || val === '1'),
});

export function getEnv() {
	const parsed = Env.safeParse(process.env);
	if (!parsed.success) {
		console.error(parsed.error.format());
		process.exit(1);
	}

	// Validar que JWT_SECRET esté presente si AUTH_ENABLED está activo
	if (parsed.data.AUTH_ENABLED && !parsed.data.JWT_SECRET) {
		console.error('ERROR: JWT_SECRET is required when AUTH_ENABLED is true');
		console.error('Please set JWT_SECRET in your .env file (minimum 32 characters)');
		process.exit(1);
	}

	return parsed.data;
}
