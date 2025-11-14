import { z } from 'zod';
import { Id, DateTime } from '../catalogs/zod.schemas';

/**
 * Roles de usuario en el sistema
 * - user: Usuario estándar (puede ver eventos, hacer reservas)
 * - admin: Administrador (gestión completa de eventos y catálogos)
 * - owner: Propietario (acceso total, gestión de usuarios)
 */
export const UserRole = z.enum(['user', 'admin', 'owner']);
export type UserRoleT = z.infer<typeof UserRole>;

/**
 * Proveedor de autenticación
 * - local: Email + password tradicional
 * - auth0: OAuth a través de Auth0 (Google, Instagram, etc.)
 */
export const AuthProvider = z.enum(['local', 'auth0']);
export type AuthProviderT = z.infer<typeof AuthProvider>;

/**
 * Schema completo de Usuario
 * Representa un usuario del sistema con autenticación local o Auth0
 */
export const User = z.object({
	isActive: z.boolean().default(true).describe('Estado de activación del usuario'),
	id: Id.optional().describe('Identificador único del usuario'),
	email: z
		.string()
		.email()
		.toLowerCase()
		.describe('Email del usuario (único). Ejemplo: "usuario@ejemplo.com"'),
	passwordHash: z
		.string()
		.optional()
		.describe('Hash bcrypt de la contraseña (solo para provider=local)'),
	name: z.string().min(1).max(100).describe('Nombre completo del usuario. Ejemplo: "Juan Pérez"'),
	role: UserRole.default('user').describe('Rol del usuario en el sistema'),
	provider: AuthProvider.default('local').describe('Proveedor de autenticación'),
	providerId: z
		.string()
		.optional()
		.describe('ID del usuario en el proveedor externo (para Auth0)'),
	eventIds: z
		.array(Id)
		.optional()
		.describe(
			'IDs de eventos a los que el usuario tiene acceso. Si vacío/null, acceso a todos.',
		),
	avatar: z.string().url().optional().describe('URL del avatar del usuario'),
	emailVerified: z
		.boolean()
		.default(false)
		.describe('Indica si el email ha sido verificado'),
	lastLoginAt: DateTime.optional().describe('Fecha del último login'),
	createdAt: DateTime.optional().describe('Fecha de creación del usuario'),
	updatedAt: DateTime.optional().describe('Fecha de última actualización'),
});

export type UserT = z.infer<typeof User>;

/**
 * Schema para crear un nuevo usuario (POST /api/users)
 * Excluye id, createdAt, updatedAt (generados por el servidor)
 * Solo para uso administrativo (crear usuarios manualmente)
 */
export const UserCreate = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación'),
	email: z.string().email().toLowerCase().describe('Email del usuario'),
	password: z
		.string()
		.min(8)
		.max(100)
		.optional()
		.describe('Contraseña (mínimo 8 caracteres, solo para provider=local)'),
	name: z.string().min(1).max(100).describe('Nombre completo'),
	role: UserRole.default('user').optional().describe('Rol del usuario'),
	provider: AuthProvider.default('local').optional().describe('Proveedor de autenticación'),
	providerId: z.string().optional().describe('ID del proveedor externo'),
	eventIds: z.array(Id).optional().describe('IDs de eventos permitidos'),
	avatar: z.string().url().optional().describe('URL del avatar'),
	emailVerified: z.boolean().default(false).optional().describe('Email verificado'),
});

export type UserCreateT = z.infer<typeof UserCreate>;

/**
 * Schema para reemplazo completo de usuario (PUT /api/users/:id)
 */
export const UserReplace = z.object({
	isActive: z.boolean().default(true).optional().describe('Estado de activación'),
	email: z.string().email().toLowerCase().describe('Email del usuario'),
	name: z.string().min(1).max(100).describe('Nombre completo'),
	role: UserRole.default('user').optional().describe('Rol del usuario'),
	provider: AuthProvider.default('local').optional().describe('Proveedor de autenticación'),
	providerId: z.string().optional().describe('ID del proveedor externo'),
	eventIds: z.array(Id).optional().describe('IDs de eventos permitidos'),
	avatar: z.string().url().optional().describe('URL del avatar'),
	emailVerified: z.boolean().optional().describe('Email verificado'),
});

export type UserReplaceT = z.infer<typeof UserReplace>;

/**
 * Schema para actualización parcial de usuario (PATCH /api/users/:id)
 * Todos los campos son opcionales
 */
export const UserPatch = z.object({
	isActive: z.boolean().optional().describe('Estado de activación'),
	email: z.string().email().toLowerCase().optional().describe('Email del usuario'),
	name: z.string().min(1).max(100).optional().describe('Nombre completo'),
	role: UserRole.optional().describe('Rol del usuario'),
	provider: AuthProvider.optional().describe('Proveedor de autenticación'),
	providerId: z.string().optional().describe('ID del proveedor externo'),
	eventIds: z.array(Id).optional().describe('IDs de eventos permitidos'),
	avatar: z.string().url().optional().describe('URL del avatar'),
	emailVerified: z.boolean().optional().describe('Email verificado'),
	lastLoginAt: DateTime.optional().describe('Fecha del último login'),
});

export type UserPatchT = z.infer<typeof UserPatch>;

/**
 * Schema para respuesta pública de usuario (sin campos sensibles)
 * Nunca devolver passwordHash al cliente
 */
export const UserPublic = User.omit({ passwordHash: true });
export type UserPublicT = z.infer<typeof UserPublic>;
