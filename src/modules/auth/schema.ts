import { z } from 'zod';
import { UserPublic } from '../users/schema';

/**
 * Schema para registro de nuevo usuario (POST /api/auth/register)
 */
export const RegisterRequest = z.object({
	email: z.string().email().toLowerCase().describe('Email del usuario'),
	password: z
		.string()
		.min(8)
		.max(100)
		.describe('Contraseña (mínimo 8 caracteres)'),
	name: z.string().min(1).max(100).describe('Nombre completo del usuario'),
});

export type RegisterRequestT = z.infer<typeof RegisterRequest>;

/**
 * Schema para login (POST /api/auth/login)
 */
export const LoginRequest = z.object({
	email: z.string().email().toLowerCase().describe('Email del usuario'),
	password: z.string().min(1).describe('Contraseña'),
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
	refreshToken: z.string().describe('Refresh token JWT'),
});

export type RefreshTokenRequestT = z.infer<typeof RefreshTokenRequest>;

/**
 * Schema para cambio de contraseña (POST /api/auth/change-password)
 */
export const ChangePasswordRequest = z.object({
	currentPassword: z.string().min(1).describe('Contraseña actual'),
	newPassword: z.string().min(8).max(100).describe('Nueva contraseña (mínimo 8 caracteres)'),
});

export type ChangePasswordRequestT = z.infer<typeof ChangePasswordRequest>;
