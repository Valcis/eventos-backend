import { z } from 'zod';
import { UserPublic } from '../users/schema';

/**
 * Schema para registro de nuevo usuario (POST /api/auth/register)
 */
export const RegisterRequest = z.object({
	email: z
		.string({ required_error: 'El email es obligatorio' })
		.email({ message: 'El email no es válido. Debe tener el formato: usuario@ejemplo.com' })
		.toLowerCase()
		.describe('Email del usuario'),
	password: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
		.max(100, { message: 'La contraseña no puede exceder 100 caracteres' })
		.describe('Contraseña (mínimo 8 caracteres)'),
	name: z
		.string({ required_error: 'El nombre es obligatorio' })
		.min(1, { message: 'El nombre no puede estar vacío' })
		.max(100, { message: 'El nombre no puede exceder 100 caracteres' })
		.describe('Nombre completo del usuario'),
});

export type RegisterRequestT = z.infer<typeof RegisterRequest>;

/**
 * Schema para login (POST /api/auth/login)
 */
export const LoginRequest = z.object({
	email: z
		.string({ required_error: 'El email es obligatorio' })
		.email({ message: 'El email no es válido' })
		.toLowerCase()
		.describe('Email del usuario'),
	password: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(1, { message: 'La contraseña no puede estar vacía' })
		.describe('Contraseña'),
});

export type LoginRequestT = z.infer<typeof LoginRequest>;

/**
 * Schema para respuesta de login/register exitoso
 */
export const AuthResponse = z.object({
	ok: z.literal(true),
	accessToken: z.string().describe('JWT access token (válido por JWT_EXPIRES_IN)'),
	refreshToken: z.string().optional().describe('JWT refresh token (válido por 30 días)'),
	user: UserPublic.describe('Datos del usuario autenticado'),
	expiresIn: z.string().describe('Tiempo de expiración del access token (ej: "24h")'),
});

export type AuthResponseT = z.infer<typeof AuthResponse>;

/**
 * Schema para refresh token (POST /api/auth/refresh)
 */
export const RefreshTokenRequest = z.object({
	refreshToken: z
		.string({ required_error: 'El refresh token es obligatorio' })
		.describe('Refresh token JWT'),
});

export type RefreshTokenRequestT = z.infer<typeof RefreshTokenRequest>;

/**
 * Schema para cambio de contraseña (POST /api/auth/change-password)
 */
export const ChangePasswordRequest = z.object({
	currentPassword: z
		.string({ required_error: 'La contraseña actual es obligatoria' })
		.min(1, { message: 'La contraseña actual no puede estar vacía' })
		.describe('Contraseña actual'),
	newPassword: z
		.string({ required_error: 'La nueva contraseña es obligatoria' })
		.min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
		.max(100, { message: 'La nueva contraseña no puede exceder 100 caracteres' })
		.describe('Nueva contraseña (mínimo 8 caracteres)'),
});

export type ChangePasswordRequestT = z.infer<typeof ChangePasswordRequest>;
