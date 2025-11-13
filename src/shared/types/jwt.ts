import type { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';

/**
 * JWT Payload personalizado para el sistema de eventos
 * Extiende el payload estándar de JWT con campos específicos del negocio
 */
export interface JwtPayload extends BaseJwtPayload {
	/** ID del usuario autenticado */
	userId: string;

	/** Email del usuario */
	email: string;

	/** Rol del usuario en el sistema */
	role: 'admin' | 'salesperson' | 'cashier' | 'viewer';

	/** Eventos a los que el usuario tiene acceso (opcional, para multi-tenancy) */
	eventIds?: string[];

	/** Timestamp de emisión del token (inherited from BaseJwtPayload.iat) */
	// iat?: number;

	/** Timestamp de expiración (inherited from BaseJwtPayload.exp) */
	// exp?: number;

	/** Issuer - quién emitió el token (inherited from BaseJwtPayload.iss) */
	// iss?: string;

	/** Subject - para quién es el token (inherited from BaseJwtPayload.sub) */
	// sub?: string;
}

/**
 * Extensión del módulo fastify para añadir el usuario autenticado a las requests
 */
declare module 'fastify' {
	interface FastifyRequest {
		/** Usuario autenticado a partir del JWT */
		user?: JwtPayload;
	}
}
