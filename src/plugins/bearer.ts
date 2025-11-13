import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import type { JwtPayload } from '../shared/types/jwt';
import { UnauthorizedError, InternalServerError } from '../core/http/errors';

export interface BearerOptions {
	/** rutas que no requieren bearer; acepta prefijos (empiezan por) */
	exemptPaths?: string[];
	/** si true, exige siempre token aunque AUTH_ENABLED=false */
	forceEnabled?: boolean;
}

function isExempt(pathname: string, exempt: readonly string[] = []): boolean {
	return exempt.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}

export default fp<BearerOptions>(
	async function bearerPlugin(app: FastifyInstance, opts) {
		const env = getEnv(); // leído una vez; si quieres que sea dinámico, muévelo dentro del hook
		const exempt = opts?.exemptPaths ?? [];
		const isEnabled = opts?.forceEnabled ?? env.AUTH_ENABLED;

		app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
			if (!isEnabled) return;
			const urlPath = req.raw.url?.split('?')[0] ?? '';
			if (isExempt(urlPath, exempt)) return;

			const auth = req.headers['authorization'];
			const token =
				typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;

			if (!token) {
				throw new UnauthorizedError('Falta token Bearer');
			}

			// Verificar y decodificar JWT
			try {
				const jwtSecret = env.JWT_SECRET;
				if (!jwtSecret) {
					req.log.error('JWT_SECRET no configurado pero AUTH_ENABLED=true');
					throw new InternalServerError('Configuración de autenticación incorrecta');
				}

				const payload = jwt.verify(token, jwtSecret, {
					algorithms: [env.JWT_ALGORITHM || 'HS256'],
				}) as JwtPayload;

				// Validaciones adicionales del payload
				if (!payload.userId || !payload.email || !payload.role) {
					throw new UnauthorizedError('Token JWT inválido: faltan campos requeridos');
				}

				// Adjuntar usuario autenticado a la request
				req.user = payload;

				req.log.debug(
					{ userId: payload.userId, role: payload.role },
					'Usuario autenticado',
				);
			} catch (err) {
				// Manejar errores específicos de JWT
				if (err instanceof jwt.TokenExpiredError) {
					throw new UnauthorizedError('Token expirado');
				}

				if (err instanceof jwt.JsonWebTokenError) {
					throw new UnauthorizedError('Token inválido');
				}

				// Re-lanzar si ya es un AppError
				if (err instanceof UnauthorizedError || err instanceof InternalServerError) {
					throw err;
				}

				// Error genérico
				req.log.error({ err }, 'Error al verificar JWT');
				throw new UnauthorizedError('Error al verificar token');
			}
		});
	},
	{ name: 'bearer-plugin' },
);
