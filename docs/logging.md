# Logging

## Implementación Actual

El proyecto usa **Pino** como sistema de logging estructurado, integrado con Fastify.

**Librería**: [pino](https://github.com/pinojs/pino) - Logger de alto rendimiento para Node.js

---

## Configuración

### Logger Options

Configurado en `src/core/logging/logger.ts`:

```typescript
export function buildLoggerOptions() {
	return {
		level: process.env.LOG_LEVEL ?? 'info',
	};
}
```

**Variable de entorno**:

```bash
LOG_LEVEL=debug   # debug | info | warn | error
```

### Niveles de Log

| Nivel   | Uso                                 |
| ------- | ----------------------------------- |
| `debug` | Información detallada de depuración |
| `info`  | Información general (default)       |
| `warn`  | Advertencias que no detienen la app |
| `error` | Errores que requieren atención      |

---

## Request ID (Trazabilidad)

Cada request tiene un ID único para rastrear logs relacionados.

**Implementación**: `src/core/logging/requestId.ts`

```typescript
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export default fp(async (app) => {
	app.addHook('onRequest', async (req) => {
		req.id = randomUUID();
	});
});
```

**Uso**: El `requestId` se incluye automáticamente en todos los logs de la request.

---

## Logging en el Ciclo de Vida

### 1. Arranque del Servidor

```typescript
app.log.info(`Eventos API v2.0.0 on :${env.PORT}${env.BASE_PATH} (docs at /docs)`);
```

**Ver**: `src/server.ts:9`

### 2. Registro de Rutas

```typescript
app.addHook('onRoute', (r) => {
	app.log.info({ method: r.method, url: r.url, routePrefix: (r as any).prefix }, 'ROUTE_ADDED');
});
```

**Ver**: `src/app.ts:85-90`

### 3. Requests Completadas

```typescript
app.addHook('onResponse', async (req, reply) => {
	req.log.info(
		{
			statusCode: reply.statusCode,
			method: req.method,
			url: req.url,
			responseTime: reply.elapsedTime,
		},
		'request completed',
	);
});
```

**Ver**: `src/app.ts:73-83`

**Ejemplo de log**:

```json
{
	"level": 30,
	"time": 1705325400000,
	"pid": 12345,
	"hostname": "server-01",
	"reqId": "a1b2c3d4-...",
	"statusCode": 200,
	"method": "GET",
	"url": "/api/products?limit=10",
	"responseTime": 45.2,
	"msg": "request completed"
}
```

### 4. Errores

```typescript
app.setErrorHandler((err, _req, reply) => {
	const status = typeof (err as any).statusCode === 'number' ? (err as any).statusCode : 500;

	const payload =
		process.env.NODE_ENV === 'production'
			? { ok: false, error: err.message }
			: { ok: false, error: err.message, stack: err.stack };

	reply.code(status).send(payload);
});
```

**Ver**: `src/app.ts:97-104`

### 5. Rutas No Encontradas

```typescript
app.setNotFoundHandler((req, reply) => {
	req.log.warn({ url: req.url, method: req.method }, 'route not found');
	reply.code(404).send({ ok: false, error: 'Not Found' });
});
```

**Ver**: `src/app.ts:92-95`

---

## Formato de Salida

### Desarrollo (Pretty Print)

En desarrollo con `pino-pretty`:

```bash
npm run dev
```

**Salida**:

```
[10:30:15.234] INFO: Eventos API v2.0.0 on :3000/api (docs at /docs)
[10:30:20.456] INFO (reqId: a1b2c3d4): GET /api/products -> 200 (45ms)
```

### Producción (JSON)

En producción, logs en formato JSON (una línea por log):

```json
{ "level": 30, "time": 1705325400000, "msg": "request completed", "statusCode": 200 }
```

**Ventajas**:

- Fácil de parsear
- Compatible con sistemas de agregación (ELK, Datadog, etc.)
- Menor overhead

---

## Logging Manual

### En Controladores

```typescript
export default async function myHandler(req: FastifyRequest, reply: FastifyReply) {
	req.log.info('Processing request');
	req.log.debug({ eventId: '123' }, 'Fetching event');

	try {
		// ...
	} catch (err) {
		req.log.error({ err }, 'Failed to process');
		throw err;
	}
}
```

### En Servicios

```typescript
app.log.info({ db: env.MONGODB_DB }, 'Connected to MongoDB');
app.log.warn({ collection: 'products' }, 'Collection empty');
app.log.error({ err }, 'Database error');
```

---

## Mejoras Pendientes

### 🔄 Rotación de Logs

**Estado**: No implementado

**Problema**: El archivo de log crece indefinidamente

**Solución**: Usar `pino-rotating-file` o similar:

```typescript
import pino from 'pino';
import { createStream } from 'rotating-file-stream';

const stream = createStream('app.log', {
	interval: '1d', // Rotar diariamente
	maxFiles: 7, // Mantener 7 días
	path: './logs',
});

const logger = pino(stream);
```

### 🔒 Redacción de Datos Sensibles

**Estado**: No implementado

**Problema**: Tokens y passwords pueden aparecer en logs

**Solución**: Configurar `redact` en Pino:

```typescript
export function buildLoggerOptions() {
	return {
		level: process.env.LOG_LEVEL ?? 'info',
		redact: {
			paths: [
				'req.headers.authorization',
				'req.headers.cookie',
				'*.password',
				'*.token',
				'*.secret',
			],
			censor: '[REDACTED]',
		},
	};
}
```

**Ejemplo**:

```json
{
	"req": {
		"headers": {
			"authorization": "[REDACTED]"
		}
	}
}
```

### 📊 Serializers Personalizados

**Estado**: No implementado

**Mejora**: Formatear objetos automáticamente:

```typescript
export function buildLoggerOptions() {
	return {
		level: process.env.LOG_LEVEL ?? 'info',
		serializers: {
			req: (req) => ({
				id: req.id,
				method: req.method,
				url: req.url,
				// Omitir headers por defecto
			}),
			err: pino.stdSerializers.err,
		},
	};
}
```

---

## Integración con Sistemas Externos

### ELK Stack (Elasticsearch + Logstash + Kibana)

1. Logs en JSON (ya implementado)
2. Enviar a Logstash:

```bash
node dist/server.js | logstash -f logstash.conf
```

3. Visualizar en Kibana

### Datadog

```bash
npm install dd-trace

# En server.ts
import tracer from 'dd-trace';
tracer.init();
```

### CloudWatch (AWS)

Usar `pino-cloudwatch`:

```bash
npm install pino-cloudwatch
```

---

## Debugging

### Ver Logs en Tiempo Real

```bash
npm run dev | grep ERROR
npm run dev | grep 'request completed'
```

### Filtrar por Request ID

```bash
npm run dev | grep 'reqId: a1b2c3d4'
```

### Analizar Performance

Buscar requests lentas:

```bash
npm run dev | jq 'select(.responseTime > 1000)'
```

---

## Ver también

- [Pino Documentation](https://github.com/pinojs/pino/blob/master/docs/api.md)
- [Security](./security.md) - Redacción de datos sensibles
- [Operations](./operations.md) - Monitoreo en producción
- `src/core/logging/logger.ts` - Configuración actual
- `src/core/logging/requestId.ts` - Plugin de trazabilidad
