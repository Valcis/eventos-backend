import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { auth as auth0Validator } from 'express-oauth2-jwt-bearer';
import { getEnv } from '../config/env';
import { UnauthorizedError } from '../core/http/errors';

export interface Auth0Options {
	/** rutas que no requieren Auth0; acepta prefijos (empiezan por) */
	exemptPaths?: string[];
}

function isExempt(pathname: string, exempt: readonly string[] = []): boolean {
	return exempt.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}

/**
 * Plugin de Auth0 para validar tokens OAuth
 * Solo se activa si AUTH0_ENABLED=true
 */
export default fp<Auth0Options>(
	async function auth0Plugin(app: FastifyInstance, opts) {
		const env = getEnv();
		const exempt = opts?.exemptPaths ?? [];

		// Si Auth0 no está habilitado, no hacer nada
		if (!env.AUTH0_ENABLED) {
			app.log.info('Auth0 plugin: deshabilitado (AUTH0_ENABLED=false)');
			return;
		}

		app.log.info(
			{
				domain: env.AUTH0_DOMAIN,
				audience: env.AUTH0_AUDIENCE,
			},
			'Auth0 plugin: habilitado',
		);

		// Configurar validador de Auth0
		const validateAccessToken = auth0Validator({
			audience: env.AUTH0_AUDIENCE!,
			issuerBaseURL: `https://${env.AUTH0_DOMAIN}`,
			tokenSigningAlg: 'RS256',
		});

		app.addHook('preHandler', async (req: FastifyRequest, reply) => {
			const urlPath = req.raw.url?.split('?')[0] ?? '';
			if (isExempt(urlPath, exempt)) return;

			const auth = req.headers['authorization'];
			const token =
				typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;

			if (!token) {
				throw new UnauthorizedError('Falta token Bearer');
			}

			try {
				// Crear un objeto request-like para express-oauth2-jwt-bearer
				const mockReq = {
					headers: req.headers,
					get: (name: string) => req.headers[name.toLowerCase()],
				};

				const mockRes = {
					status: (code: number) => ({
						json: (data: unknown) => {
							throw new UnauthorizedError(
								typeof data === 'object' &&
									data !== null &&
									'message' in data
									? String((data as { message: unknown }).message)
									: 'Token inválido',
							);
						},
					}),
				};

				// Validar token con Auth0
				await new Promise<void>((resolve, reject) => {
					validateAccessToken(mockReq as never, mockRes as never, (err: Error | undefined) => {
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					});
				});

				// Si llegamos aquí, el token es válido
				// El payload está en mockReq.auth (añadido por express-oauth2-jwt-bearer)
				const authData = (mockReq as { auth?: { payload: Record<string, unknown> } }).auth;

				if (authData?.payload) {
					// Extraer información del usuario del token Auth0
					const sub = authData.payload.sub as string; // Auth0 user ID
					const email = authData.payload.email as string;

					// Buscar o crear usuario en nuestra base de datos
					const db = (req.server as unknown as { db: import('mongodb').Db }).db;

					let user = await db.collection('usuarios').findOne({
						providerId: sub,
						provider: 'auth0',
					});

					// Si no existe, crear usuario automáticamente
					if (!user) {
						const userData = {
							email: email || `${sub}@auth0.user`,
							name: (authData.payload.name as string) || 'Usuario Auth0',
							role: 'user' as const,
							provider: 'auth0' as const,
							providerId: sub,
							avatar: authData.payload.picture as string | undefined,
							emailVerified: (authData.payload.email_verified as boolean) || false,
							isActive: true,
							createdAt: new Date(),
							updatedAt: new Date(),
							lastLoginAt: new Date(),
						};

						const result = await db.collection('usuarios').insertOne(userData);

						user = await db.collection('usuarios').findOne({
							_id: result.insertedId,
						});
					} else {
						// Actualizar lastLoginAt
						await db.collection('usuarios').updateOne(
							{ _id: user._id },
							{ $set: { lastLoginAt: new Date() } },
						);
					}

					if (!user) {
						throw new UnauthorizedError('Error al obtener usuario');
					}

						// Adjuntar usuario a la request (compatible con JWT)
					req.user = {
						userId: user._id.toString(),
						email: user.email as string,
						role: user.role as 'user' | 'admin' | 'owner',
						eventIds: (user.eventIds as string[]) || undefined,
					};

					req.log.debug(
						{
							userId: req.user?.userId,
							role: req.user?.role,
							provider: 'auth0',
						},
						'Usuario autenticado via Auth0',
					);
				}
			} catch (err) {
				req.log.error({ err }, 'Error al verificar token Auth0');
				throw new UnauthorizedError('Token Auth0 inválido');
			}
		});
	},
	{ name: 'auth0-plugin' },
);
