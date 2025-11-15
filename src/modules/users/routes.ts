import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import {
	User,
	UserCreate,
	UserReplace,
	UserPatch,
	UserPublic,
	type UserT,
} from './schema';
import { isoifyFields } from '../../shared/lib/dates';
import { Id } from '../catalogs/zod.schemas';
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../shared/schemas/responses';
import bcrypt from 'bcrypt';
import { BadRequestError } from '../../core/http/errors';

const TAG = 'Usuarios';

const UsersQueryParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'name', 'email'])
		.optional()
		.describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	email: z.string().optional().describe('Filtrar por email (búsqueda parcial)'),
	role: z.enum(['user', 'admin', 'owner']).optional().describe('Filtrar por rol'),
	provider: z.enum(['local', 'auth0']).optional().describe('Filtrar por proveedor'),
});

const UserPageResponse = createPagedResponse(UserPublic, 'usuarios');
const UserCreatedResponse = createCreatedResponse(UserPublic, 'Usuario');

const IdParam = z.object({
	id: Id,
});

export default async function usersRoutes(app: FastifyInstance) {
	const ctrl = makeController<UserT>(
		'usuarios',
		(data) => {
			// No validamos aquí - Fastify ya validó con UserCreate/UserReplace/UserPatch
			// Solo transformamos las fechas si existen
			const transformed: Record<string, unknown> = { ...data };
			if ('lastLoginAt' in data && typeof data.lastLoginAt === 'string') {
				transformed.lastLoginAt = new Date(data.lastLoginAt);
			}
			return transformed;
		},
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, [
				'lastLoginAt',
				'createdAt',
				'updatedAt',
			] as const);

			// Nunca devolver passwordHash
			const { passwordHash: _, ...publicUser } = normalized as UserT;

			return UserPublic.parse(publicUser);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar usuarios',
				description:
					'Obtiene un listado paginado y ordenable de usuarios. Solo accesible por administradores. Por defecto se ordenan por createdAt descendente.',
				querystring: UsersQueryParams,
				response: {
					200: UserPageResponse.describe('Lista paginada de usuarios'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.list,
	);

	app.get(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener usuario por ID',
				description:
					'Devuelve los detalles completos de un usuario específico (sin passwordHash).',
				params: IdParam,
				response: {
					200: UserPublic.describe('Usuario encontrado'),
					404: NotFoundResponse.describe('Usuario no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	app.post(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Crear nuevo usuario',
				description:
					'Registra un nuevo usuario en el sistema. Si provider=local, requiere password. Si provider=auth0, requiere providerId. Solo accesible por administradores.',
				body: UserCreate,
				response: {
					201: UserCreatedResponse.describe('Usuario creado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					409: ValidationErrorResponse.describe('Email ya existe'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof UserCreate>;

			// Validar que el email no exista
			const existing = await db.collection('usuarios').findOne({
				email: body.email,
			});

			if (existing) {
				throw new BadRequestError('El email ya está registrado');
			}

			// Si es provider=local, requiere password
			if (body.provider === 'local' || !body.provider) {
				if (!body.password) {
					throw new BadRequestError(
						'El campo password es obligatorio para provider=local',
					);
				}

				// Hash de la contraseña
				const passwordHash = await bcrypt.hash(body.password, 10);

				// Preparar datos con passwordHash
				const userData = {
					...body,
					passwordHash,
					provider: 'local' as const,
					createdAt: new Date(),
					updatedAt: new Date(),
					isActive: body.isActive ?? true,
				};

				// Remover password del objeto (ya tenemos passwordHash)
				const { password: _, ...dataToInsert } = userData;

				const result = await db.collection('usuarios').insertOne(dataToInsert);

				const created = await db.collection('usuarios').findOne({
					_id: result.insertedId,
				});

				if (!created) {
					throw new Error('Failed to retrieve created user');
				}

				// Transformar y devolver (sin passwordHash)
				const { _id, passwordHash: __, ...rest } = created;
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

				return reply.code(201).send(publicUser);
			}

			// Si es provider=auth0, requiere providerId
			if (body.provider === 'auth0') {
				if (!body.providerId) {
					throw new BadRequestError(
						'El campo providerId es obligatorio para provider=auth0',
					);
				}

				const userData = {
					...body,
					createdAt: new Date(),
					updatedAt: new Date(),
					isActive: body.isActive ?? true,
				};

				// Remover password si existe
				const { password: _, ...dataToInsert } = userData;

				const result = await db.collection('usuarios').insertOne(dataToInsert);

				const created = await db.collection('usuarios').findOne({
					_id: result.insertedId,
				});

				if (!created) {
					throw new Error('Failed to retrieve created user');
				}

				// Transformar y devolver
				const { _id, passwordHash: __, ...rest } = created;
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

				return reply.code(201).send(publicUser);
			}

			throw new BadRequestError('Proveedor de autenticación inválido');
		},
	);

	app.put(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Reemplazar usuario completo',
				description:
					'Reemplaza todos los campos de un usuario existente. No permite cambiar password (usar endpoint específico).',
				params: IdParam,
				body: UserReplace,
				response: {
					200: UserPublic.describe('Usuario actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Usuario no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.replace,
	);

	app.patch(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Actualizar usuario parcialmente',
				description:
					'Actualiza uno o más campos de un usuario existente. No permite cambiar password (usar endpoint específico).',
				params: IdParam,
				body: UserPatch,
				response: {
					200: UserPublic.describe('Usuario actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Usuario no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.patch,
	);

	app.delete(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Eliminar usuario',
				description:
					'Realiza un borrado lógico del usuario (establece isActive=false). El usuario no se elimina físicamente de la base de datos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe('Usuario eliminado exitosamente'),
					404: NotFoundResponse.describe('Usuario no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
