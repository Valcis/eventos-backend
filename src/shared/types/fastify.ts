import type { FastifyRequest } from 'fastify';
import type { Db } from 'mongodb';

export type IdParams = { id: string };
export type PageQuery = { limit?: number; after?: string | null };

// 👇 Ojo: PageQuery se mezcla SIEMPRE con Q
export type ListRequest<Q> = FastifyRequest<{ Querystring: Q & PageQuery }>;

export type GetRequest = FastifyRequest<{ Params: IdParams }>;
export type CreateRequest<B> = FastifyRequest<{ Body: B }>;
export type UpdateRequest<B> = FastifyRequest<{ Params: IdParams; Body: B }>;
export type PatchRequest<B> = FastifyRequest<{ Params: IdParams; Body: Partial<B> }>;
export type RemoveRequest = FastifyRequest<{ Params: IdParams }>;

/**
 * Extensiones de tipos para Fastify
 * Añade tipado para decoradores personalizados
 */
declare module 'fastify' {
	interface FastifyInstance {
		/** Instancia de MongoDB decorada en la aplicación */
		db: Db;
	}

	// FastifyRequest.user está declarado en jwt.ts
}
