/**
 * Generador del documento OpenAPI (Swagger) a partir del registry.
 */
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIV3 } from 'openapi-types';
import { registry } from './registry';

/**
 * Construye el documento OpenAPI 3.0 desde el estado actual del registry.
 * Debe llamarse después de registrar modelos y rutas.
 */
export function buildOpenApiDocument(): OpenAPIV3.Document {
	const generator = new OpenApiGeneratorV3(registry.definitions);

	const base = generator.generateDocument({
		openapi: '3.0.3',
		info: {
			title: 'EVENTOS API',
			version: '1.0.0',
			description:
				'Especificación generada dinámicamente desde Zod + rutas Fastify (sin YAML manual).',
		},
		servers: [{ url: 'http://localhost:3000', description: 'Desarrollo' }],
		tags: [
			{ name: 'Eventos', description: 'Gestión de eventos' },
			{ name: 'reservations', description: 'Reservas' },
			{ name: 'expenses', description: 'Gastos' },
			{ name: 'catalogs', description: 'Catálogos' },
			{ name: 'products', description: 'Productos' },
			{ name: 'promotions', description: 'Promociones' },
			{ name: 'Sistema', description: 'Comprobaciones del sistema' },
		],
	});

	// 1) Servers: rehacer para evitar el choque ServerVariable.enum
	const servers: OpenAPIV3.ServerObject[] = [
		{ url: 'http://localhost:3000', description: 'Desarrollo' },
	];

	// 2) paths y components: el JSON es válido; la fricción es SOLO de tipado.
	//    Hacemos un type assertion en el borde (sin `any`).
	const paths = (base.paths ?? {}) as unknown as OpenAPIV3.PathsObject;
	const components = (base.components ?? {}) as unknown as OpenAPIV3.ComponentsObject;

	return {
		openapi: '3.0.3',
		info: base.info,
		servers,
		tags: base.tags ?? [],
		paths,
		components,
		...(base.security ? { security: base.security } : {}),
		...(base.externalDocs ? { externalDocs: base.externalDocs } : {}),
	};
}
