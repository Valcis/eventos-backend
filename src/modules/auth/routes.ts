import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import type { JwtPayload } from '../../shared/types/jwt';
import {
	RegisterRequest,
	LoginRequest,
	AuthResponse,
	RefreshTokenRequest,
	ChangePasswordRequest,
} from './schema';
import { UserPublic } from '../users/schema';
import {
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
} from '../../shared/schemas/responses';
import { BadRequestError, UnauthorizedError } from '../../core/http/errors';
import { isoifyFields } from '../../shared/lib/dates';

const TAG = 'Autenticación';

export default async function authRoutes(app: FastifyInstance) {
	const env = getEnv();

	/**
	 * POST /api/auth/register
	 * Registra un nuevo usuario con email y password
	 */
	app.post(
		'/register',
		{
			schema: {
				tags: [TAG],
				summary: 'Registrar nuevo usuario',
				description:
					'Crea una nueva cuenta de usuario con email y contraseña. El usuario se crea con rol "user" por defecto.',
				body: RegisterRequest,
				response: {
					201: AuthResponse.describe('Usuario registrado exitosamente'),
					400: ValidationErrorResponse.describe('Email ya existe o datos inválidos'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof RegisterRequest>;

			// Validar que el email no exista
			const existing = await db.collection('usuarios').findOne({
				email: body.email,
			});

			if (existing) {
				throw new BadRequestError('El email ya está registrado');
			}

			// Hash de la contraseña
			const passwordHash = await bcrypt.hash(body.password, 10);

			// Crear usuario
			const userData = {
				email: body.email,
				passwordHash,
				name: body.name,
				role: 'user' as const,
				provider: 'local' as const,
				isActive: true,
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await db.collection('usuarios').insertOne(userData);

			const created = await db.collection('usuarios').findOne({
				_id: result.insertedId,
			});

			if (!created) {
				throw new Error('Failed to retrieve created user');
			}

				// Generar tokens JWT
			const userId = created._id.toString();
			const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
				userId,
				email: created.email as string,
				role: created.role as 'user' | 'admin' | 'owner',
				eventIds: (created.eventIds as string[]) || undefined,
			};

			// @ts-expect-error - jwt.sign tipo incompatible con expiresIn
			const accessToken = jwt.sign(payload, env.JWT_SECRET!, {
				algorithm: env.JWT_ALGORITHM || 'HS256',
				expiresIn: env.JWT_EXPIRES_IN || '24h',
				issuer: 'eventos-backend',
				subject: userId,
			});

			const refreshToken = jwt.sign(
				{ userId, type: 'refresh' },
				env.JWT_SECRET!,
				{
					algorithm: env.JWT_ALGORITHM || 'HS256',
					expiresIn: '30d',
					issuer: 'eventos-backend',
					subject: userId,
				},
			);

			// Actualizar lastLoginAt
			await db.collection('usuarios').updateOne(
				{ _id: created._id },
				{ $set: { lastLoginAt: new Date() } },
			);

			// Transformar usuario para respuesta (sin passwordHash)
			const { _id, passwordHash: _, ...rest } = created;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, [
				'lastLoginAt',
				'createdAt',
				'updatedAt',
			] as const);
			const publicUser = UserPublic.parse(normalized);

			return reply.code(201).send({
				ok: true,
				accessToken,
				refreshToken,
				user: publicUser,
				expiresIn: env.JWT_EXPIRES_IN || '24h',
			});
		},
	);

	/**
	 * POST /api/auth/login
	 * Inicia sesión con email y password
	 */
	app.post(
		'/login',
		{
			schema: {
				tags: [TAG],
				summary: 'Iniciar sesión',
				description: 'Autentica un usuario con email y contraseña.',
				body: LoginRequest,
				response: {
					200: AuthResponse.describe('Login exitoso'),
					401: UnauthorizedResponse.describe('Credenciales inválidas'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof LoginRequest>;

			// Buscar usuario por email
			const user = await db.collection('usuarios').findOne({
				email: body.email,
				isActive: true,
			});

			if (!user) {
				throw new UnauthorizedError('Credenciales inválidas');
			}

			// Verificar que sea usuario local (con password)
			if (user.provider !== 'local' || !user.passwordHash) {
				throw new UnauthorizedError(
					'Este usuario usa autenticación externa (Auth0)',
				);
			}

			// Verificar contraseña
			const isValid = await bcrypt.compare(
				body.password,
				user.passwordHash as string,
			);

			if (!isValid) {
				throw new UnauthorizedError('Credenciales inválidas');
			}

			// Generar tokens JWT
			const userId = user._id.toString();
			const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
				userId,
				email: user.email as string,
				role: user.role as 'user' | 'admin' | 'owner',
				eventIds: (user.eventIds as string[]) || undefined,
			};

			// @ts-expect-error - jwt.sign tipo incompatible con expiresIn
			const accessToken = jwt.sign(payload, env.JWT_SECRET!, {
				algorithm: env.JWT_ALGORITHM || 'HS256',
				expiresIn: env.JWT_EXPIRES_IN || '24h',
				issuer: 'eventos-backend',
				subject: userId,
			});

			const refreshToken = jwt.sign(
				{ userId, type: 'refresh' },
				env.JWT_SECRET!,
				{
					algorithm: env.JWT_ALGORITHM || 'HS256',
					expiresIn: '30d',
					issuer: 'eventos-backend',
					subject: userId,
				},
			);

			// Actualizar lastLoginAt
			await db.collection('usuarios').updateOne(
				{ _id: user._id },
				{ $set: { lastLoginAt: new Date() } },
			);

			// Transformar usuario para respuesta (sin passwordHash)
			const { _id, passwordHash: _, ...rest } = user;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, [
				'lastLoginAt',
				'createdAt',
				'updatedAt',
			] as const);
			const publicUser = UserPublic.parse(normalized);

			return reply.send({
				ok: true,
				accessToken,
				refreshToken,
				user: publicUser,
				expiresIn: env.JWT_EXPIRES_IN || '24h',
			});
		},
	);

	/**
	 * POST /api/auth/refresh
	 * Renueva el access token usando un refresh token válido
	 */
	app.post(
		'/refresh',
		{
			schema: {
				tags: [TAG],
				summary: 'Renovar access token',
				description:
					'Genera un nuevo access token usando un refresh token válido.',
				body: RefreshTokenRequest,
				response: {
					200: AuthResponse.describe('Token renovado exitosamente'),
					401: UnauthorizedResponse.describe('Refresh token inválido o expirado'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof RefreshTokenRequest>;

			try {
				// Verificar refresh token
				const decoded = jwt.verify(body.refreshToken, env.JWT_SECRET!, {
					algorithms: [(env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm],
				}) as { userId: string; type: string };

				if (decoded.type !== 'refresh') {
					throw new UnauthorizedError('Token inválido');
				}

				// Buscar usuario
				const { ObjectId } = await import('mongodb');
				const user = await db.collection('usuarios').findOne({
					_id: new ObjectId(decoded.userId),
					isActive: true,
				});

				if (!user) {
					throw new UnauthorizedError('Usuario no encontrado');
				}

					// Generar nuevo access token
				const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
					userId: decoded.userId,
					email: user.email as string,
					role: user.role as 'user' | 'admin' | 'owner',
					eventIds: (user.eventIds as string[]) || undefined,
				};

			// @ts-expect-error - jwt.sign tipo incompatible con expiresIn
				const accessToken = jwt.sign(payload, env.JWT_SECRET!, {
					algorithm: env.JWT_ALGORITHM || 'HS256',
					expiresIn: env.JWT_EXPIRES_IN || '24h',
					issuer: 'eventos-backend',
					subject: decoded.userId,
				});

				// Transformar usuario para respuesta
				const { _id, passwordHash: _, ...rest } = user;
				const base = {
					...(rest as Record<string, unknown>),
					id: String(_id),
				};
				const normalized = isoifyFields(base, [
					'lastLoginAt',
					'createdAt',
					'updatedAt',
				] as const);
				const publicUser = UserPublic.parse(normalized);

				return reply.send({
					ok: true,
					accessToken,
					refreshToken: body.refreshToken, // Devolver el mismo refresh token
					user: publicUser,
					expiresIn: env.JWT_EXPIRES_IN || '24h',
				});
			} catch (err) {
				if (err instanceof jwt.TokenExpiredError) {
					throw new UnauthorizedError('Refresh token expirado');
				}
				if (err instanceof jwt.JsonWebTokenError) {
					throw new UnauthorizedError('Refresh token inválido');
				}
				throw err;
			}
		},
	);

	/**
	 * GET /api/auth/me
	 * Obtiene los datos del usuario autenticado
	 * Requiere Bearer token
	 */
	app.get(
		'/me',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener usuario actual',
				description:
					'Devuelve los datos del usuario autenticado a partir del JWT.',
				response: {
					200: UserPublic.describe('Usuario autenticado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;

			// req.user viene del plugin bearer
			if (!req.user) {
				throw new UnauthorizedError('Usuario no autenticado');
			}

			// Buscar usuario actualizado en la DB
			const { ObjectId } = await import('mongodb');
			const user = await db.collection('usuarios').findOne({
				_id: new ObjectId(req.user.userId),
				isActive: true,
			});

			if (!user) {
				throw new UnauthorizedError('Usuario no encontrado');
			}

			// Transformar usuario para respuesta (sin passwordHash)
			const { _id, passwordHash: _, ...rest } = user;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, [
				'lastLoginAt',
				'createdAt',
				'updatedAt',
			] as const);
			const publicUser = UserPublic.parse(normalized);

			return reply.send(publicUser);
		},
	);

	/**
	 * POST /api/auth/change-password
	 * Cambia la contraseña del usuario autenticado
	 * Requiere Bearer token
	 */
	app.post(
		'/change-password',
		{
			schema: {
				tags: [TAG],
				summary: 'Cambiar contraseña',
				description:
					'Cambia la contraseña del usuario autenticado. Solo para usuarios con provider=local.',
				body: ChangePasswordRequest,
				response: {
					200: z.object({
						ok: z.literal(true),
						message: z.string(),
					}),
					400: ValidationErrorResponse.describe('Contraseña actual incorrecta'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof ChangePasswordRequest>;

			if (!req.user) {
				throw new UnauthorizedError('Usuario no autenticado');
			}

			// Buscar usuario
			const { ObjectId } = await import('mongodb');
			const user = await db.collection('usuarios').findOne({
				_id: new ObjectId(req.user.userId),
				isActive: true,
			});

			if (!user) {
				throw new UnauthorizedError('Usuario no encontrado');
			}

			// Verificar que sea usuario local
			if (user.provider !== 'local' || !user.passwordHash) {
				throw new BadRequestError(
					'Solo usuarios con autenticación local pueden cambiar contraseña',
				);
			}

			// Verificar contraseña actual
			const isValid = await bcrypt.compare(
				body.currentPassword,
				user.passwordHash as string,
			);

			if (!isValid) {
				throw new BadRequestError('Contraseña actual incorrecta');
			}

			// Hash de la nueva contraseña
			const newPasswordHash = await bcrypt.hash(body.newPassword, 10);

			// Actualizar contraseña
			await db.collection('usuarios').updateOne(
				{ _id: user._id },
				{
					$set: {
						passwordHash: newPasswordHash,
						updatedAt: new Date(),
					},
				},
			);

			return reply.send({
				ok: true,
				message: 'Contraseña actualizada exitosamente',
			});
		},
	);
}
