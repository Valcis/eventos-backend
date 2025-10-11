import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import yaml from 'yaml';

export interface SwaggerPluginOptions {
	routePrefix?: '/' | `/${string}`;
	yamlPath?: string;
	openapiOverride?: Record<string, unknown>;
}

// __dirname ESM-safe
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveYamlPath(explicit?: string): string | null {
	if (explicit && fs.existsSync(explicit)) return explicit;
	const env = process.env.OPENAPI_PATH;
	if (env && fs.existsSync(env)) return env;
	const rel = resolve(__dirname, '../../openapi/openapi.yaml'); // src/openapi/openapi.yaml
	if (fs.existsSync(rel)) return rel;
	const cwd = resolve(process.cwd(), 'src/openapi/openapi.yaml');
	if (fs.existsSync(cwd)) return cwd;
	return null;
}

export default fp<SwaggerPluginOptions>(
	async function docsPlugin(app: FastifyInstance, opts) {
		const yamlPath = resolveYamlPath(opts?.yamlPath);

		let doc: any;
		if (yamlPath) {
			const raw = fs.readFileSync(yamlPath, 'utf-8');
			const parsed = yaml.parse(raw);
			doc = opts?.openapiOverride ? { ...parsed, ...opts.openapiOverride } : parsed;
		} else {
			app.log.warn('openapi.yaml no encontrado; se servirá un documento mínimo');
			doc = { openapi: '3.0.3', info: { title: 'API', version: '1.0.0' }, paths: {} };
		}

		// Registra el documento OpenAPI (estático)
		await app.register(Swagger, { openapi: doc });

		const relPrefix = opts?.routePrefix ?? '/';
		await app.register(SwaggerUI, {
			routePrefix: relPrefix,
			uiConfig: { docExpansion: 'list' },
			staticCSP: true,
			transformStaticCSP: (h) => h,
		});

		app.log.info({ relPrefix, yamlPath: yamlPath ?? 'MINIMAL' }, 'Swagger UI registrado');
	},
	{ name: 'swagger-plugin' },
);
