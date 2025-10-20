/**
 * Helper para registrar paths (rutas) en OpenAPI (zod-to-openapi v7.x).
 * Adapta Zod a los tipos RouteParameter/ZodRequestBody que exige la librería.
 */
import type { ZodTypeAny } from 'zod';
import { registry } from './registry';

// Tipos de la implementación de registry (v7) para evitar 'any'
import type {
	RouteConfig,
	RouteParameter,
	ZodRequestBody,
} from '@asteasolutions/zod-to-openapi/dist/openapi-registry';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RegisterPathParams {
	method: HttpMethod;
	path: string;
	tag: string;
	summary: string;
	operationId: string; // único y estable
	params?: ZodTypeAny; // z.object({...}) con params de ruta
	query?: ZodTypeAny; // z.object({...}) con querystring
	body?: { contentType: 'application/json'; schema: ZodTypeAny };
	responses: ReadonlyArray<{
		status: number;
		description: string;
		schema?: ZodTypeAny;
	}>;
	securityBearer?: boolean;
}

/**
 * Cast seguro a RouteParameter exigido por RouteConfig.request.*
 * (La lib acepta objetos Zod; las typings de v7 son más estrictas.)
 */
function toRouteParam(zobj: ZodTypeAny): RouteParameter {
	return zobj as unknown as RouteParameter;
}

/**
 * Construye el bloque 'body' con el tipo ZodRequestBody correcto.
 */
function toRequestBody(schema: ZodTypeAny, contentType: 'application/json'): ZodRequestBody {
	return {
		content: {
			[contentType]: { schema },
		},
	} as const;
}

export function registerPath(p: RegisterPathParams): void {
	// Respuestas → OpenAPI responses
	const responses = Object.fromEntries(
		p.responses.map((r) => {
			if (!r.schema) {
				return [String(r.status), { description: r.description }];
			}
			return [
				String(r.status),
				{
					description: r.description,
					content: {
						'application/json': { schema: r.schema },
					},
				},
			];
		}),
	);

	// Request → ajustado a los tipos de RouteConfig (v7)
	const request: RouteConfig['request'] = {
		...(p.params ? { params: toRouteParam(p.params) } : {}),
		...(p.query ? { query: toRouteParam(p.query) } : {}),
		...(p.body ? { body: toRequestBody(p.body.schema, p.body.contentType) } : {}),
	};

	registry.registerPath({
		method: p.method,
		path: p.path,
		summary: p.summary,
		operationId: p.operationId,
		tags: [p.tag],
		request,
		responses,
		...(p.securityBearer ? { security: [{ bearerAuth: [] }] } : {}),
	});
}
