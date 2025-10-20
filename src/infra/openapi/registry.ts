/**
 * Registro central de OpenAPI.
 * - Aquí registramos modelos (Zod) y rutas (paths) para generar el spec.
 * - Compatible con zod v3 y @asteasolutions/zod-to-openapi@7.x
 */
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * Registro global: lo usan los módulos para:
 *  - registry.register('NombreDelModelo', zodSchema)
 *  - registry.registerPath({...})
 */
export const registry = new OpenAPIRegistry();

/**
 * Registra componentes globales (p.ej. seguridad) en el registry.
 * En zod-to-openapi v7, los componentes se registran aquí,
 * no dentro del objeto pasado a generateDocument().
 */
registry.registerComponent('securitySchemes', 'bearerAuth', {
	type: 'http',
	scheme: 'bearer',
	bearerFormat: 'JWT',
});
