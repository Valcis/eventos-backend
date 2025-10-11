import type { FastifyInstance } from 'fastify';
import swaggerPlugin from '../../plugins/swagger';

export interface SwaggerModuleOptions {
	prefix?: string;
	yamlPath?: string;
	openapiOverride?: Record<string, unknown>;
}

const kDocsRegistered = Symbol('swagger-registered');

export default async function swaggerModule(app: FastifyInstance, opts?: SwaggerModuleOptions) {
	if ((app as any)[kDocsRegistered]) return;
	(app as any)[kDocsRegistered] = true;

	await app.register(swaggerPlugin, {
		routePrefix: '/',
		...(opts?.yamlPath ? { yamlPath: opts.yamlPath } : {}),
		...(opts?.openapiOverride ? { openapiOverride: opts.openapiOverride } : {}),
	});
}
