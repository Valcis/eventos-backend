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

## Características Implementadas

### ✅ Redacción de Datos Sensibles

**Estado**: Implementado

El logger **redacta automáticamente** información sensible.

**Implementación** (`src/core/logging/logger.ts:9-17`):

```typescript
redact: {
	paths: [
		'req.headers.authorization',
		'req.headers.cookie',
		'*.password',
		'*.token',
		'req.body.password',
	],
	censor: '[REDACTED]',
}
```

**Campos protegidos**:

- Headers `Authorization` (Bearer tokens)
- Headers `Cookie`
- Todos los campos `password` y `token`
- `req.body.password` específicamente

**Ejemplo de salida**:

```json
{
	"req": {
		"headers": {
			"authorization": "[REDACTED]"
		}
	}
}
```

### ✅ Serializers Personalizados

**Estado**: Implementado

Formateo automático de objetos request (`src/core/logging/logger.ts:19-36`):

```typescript
serializers: {
	req: (req: unknown) => {
		const r = req as { method?: string; url?: string; hostname?: string; ip?: string; socket?: { remotePort?: number } };
		return {
			method: r.method ?? 'UNKNOWN',
			url: r.url ?? 'UNKNOWN',
			hostname: r.hostname ?? 'UNKNOWN',
			remoteAddress: r.ip ?? 'UNKNOWN',
			remotePort: r.socket?.remotePort ?? 0,
		};
	},
}
```

**Beneficios**:

- Estructura consistente en logs de request
- Elimina información innecesaria
- Reduce tamaño de logs

### ✅ Transport a Archivo

**Estado**: Implementado

Logs se escriben tanto a consola como a archivos (`src/core/logging/logger.ts:38-78`):

**Archivos generados**:

- `logs/app-YYYY-MM-DD.log` - Todos los logs (nivel `info` y superior) con rotación diaria
- `logs/error-YYYY-MM-DD.log` - Solo errores (nivel `error`) con rotación diaria

**Configuración**:

```typescript
transport: {
	targets: [
		// Consola (pretty print en desarrollo)
		{
			target: 'pino-pretty',
			level: 'info',
			options: { colorize: true, translateTime: 'HH:MM:ss' },
		},
		// Archivo general con rotación
		{
			target: 'pino-roll',
			level: 'info',
			options: {
				file: join(process.cwd(), 'logs', 'app'),
				frequency: 'daily',
				size: '10m',
				mkdir: true,
			},
		},
		// Archivo de errores con rotación
		{
			target: 'pino-roll',
			level: 'error',
			options: {
				file: join(process.cwd(), 'logs', 'error'),
				frequency: 'daily',
				size: '10m',
				mkdir: true,
			},
		},
	],
}
```

**Creación automática**: El directorio `logs/` se crea automáticamente si no existe (`mkdir: true`).

### ✅ Rotación de Logs

**Estado**: Implementado

**Estrategia**: Rotación diaria o al alcanzar 10MB usando `pino-roll`

**Configuración**:

- **Frecuencia**: Daily (diaria) - archivos nuevos cada día
- **Tamaño máximo**: 10MB - si un archivo supera 10MB, se rota automáticamente
- **Formato de nombre**: `app-YYYY-MM-DD.log` y `error-YYYY-MM-DD.log`

**Ventajas**:

- Previene crecimiento ilimitado de archivos
- Facilita análisis histórico
- Archivos de tamaño manejable
- Integración nativa con Pino (sin herramientas externas)

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
