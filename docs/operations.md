# Operación y Despliegue

## Comandos Básicos

### Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo con hot-reload
npm run dev

# Verificar tipos y linting
npm run check

# Fix linting automático
npm run lint:fix

# Formatear código
npm run format
```

### Producción

```bash
# Build para producción
npm run build

# Ejecutar build
npm start

# Variables requeridas
MONGO_URL=mongodb://...
MONGODB_DB=eventos_prod
AUTH_ENABLED=true
```

---

## Health Checks

### Endpoint de Health

```bash
GET /health
```

**Response (200 OK)**:

```json
{
	"status": "ok",
	"timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Implementación**: `src/system/health/health.routes.ts`

**Características**:

- No requiere autenticación
- Responde instantáneamente
- Útil para load balancers y monitoring

### Health Check Mejorado (Futuro)

Añadir verificación de dependencias:

```typescript
app.get('/health/ready', async (req, reply) => {
	try {
		// Verificar MongoDB
		await req.server.db.admin().ping();

		return {
			status: 'ready',
			checks: {
				mongodb: 'ok',
			},
		};
	} catch (err) {
		reply.code(503).send({
			status: 'not ready',
			error: err.message,
		});
	}
});
```

---

## MongoDB Artifacts

### Creación de Índices

Los índices se crean automáticamente con `MONGO_BOOT=1`:

```bash
MONGO_BOOT=1 npm run dev
```

**Qué hace**:

- Ejecuta `ensureMongoArtifacts()` en `src/infra/mongo/artifacts.ts`
- Crea todos los índices de forma idempotente
- No falla si los índices ya existen

**Cuándo usar**:

- ✅ Primer despliegue en un ambiente
- ✅ Desarrollo local (primera vez)
- ✅ Después de añadir nuevos índices al código
- ❌ En producción (hacer fuera del arranque para evitar bloqueos)

### Script Manual

```bash
npm run db:ensure
```

**Implementación**: `src/scripts/db-ensure.ts` (si existe)

---

## Estrategias de Despliegue

### Blue-Green Deployment

1. **Desplegar nueva versión** (green) en paralelo a la actual (blue)
2. **Crear índices** en la nueva versión antes de switchear tráfico
3. **Switch de tráfico** del load balancer
4. **Mantener blue** por un tiempo para rollback rápido

### Rolling Deployment

1. **Actualizar instancias** una por una
2. **Health check** antes de continuar con la siguiente
3. **MONGO_BOOT=0** para evitar múltiples instancias creando índices simultáneamente

### Migraciones

**Estrategia actual**: Ninguna formal

**Recomendación**:

- Usar herramienta como `migrate-mongo`
- Scripts versionados en `migrations/`
- Ejecutar antes del despliegue

```bash
# Ejemplo estructura
migrations/
  ├── 20250101_add_products_index.js
  ├── 20250115_add_isVerified_field.js
  └── migrate-mongo-config.js
```

---

## Observabilidad

### Logs Estructurados

**Sistema**: Pino (JSON)

**Ver logs en producción**:

```bash
# Logs recientes
tail -f logs/app.log | jq

# Errores
grep '"level":50' logs/app.log | jq

# Requests lentas (>1s)
grep 'request completed' logs/app.log | jq 'select(.responseTime > 1000)'
```

**Ver**: [Logging Documentation](./logging.md)

### Métricas (Futuro)

**No implementado**

**Recomendación**: Integrar Prometheus

```typescript
import promClient from 'prom-client';

// Métricas custom
const httpRequestDuration = new promClient.Histogram({
	name: 'http_request_duration_ms',
	help: 'Duration of HTTP requests in ms',
	labelNames: ['method', 'route', 'status_code'],
});

// Endpoint de métricas
app.get('/metrics', async (req, reply) => {
	reply.header('Content-Type', promClient.register.contentType);
	return promClient.register.metrics();
});
```

### Tracing (Futuro)

**No implementado**

**Recomendación**: OpenTelemetry o Datadog APM

```bash
npm install dd-trace

# En server.ts
import tracer from 'dd-trace';
tracer.init();
```

---

## Configuración por Ambiente

### Desarrollo

```bash
# .env.development
MONGO_URL=mongodb://localhost:27017
MONGODB_DB=eventos_dev
MONGO_BOOT=1
AUTH_ENABLED=false
LOG_LEVEL=debug
```

### Staging

```bash
# .env.staging
MONGO_URL=mongodb://staging-db:27017
MONGODB_DB=eventos_staging
MONGO_BOOT=0
AUTH_ENABLED=true
LOG_LEVEL=info
```

### Producción

```bash
# Variables de entorno (no archivo)
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=eventos_prod
MONGO_BOOT=0
AUTH_ENABLED=true
LOG_LEVEL=warn
NODE_ENV=production
```

---

## Docker

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/openapi ./openapi

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
    api:
        build: .
        ports:
            - '3000:3000'
        environment:
            - MONGO_URL=mongodb://mongo:27017
            - MONGODB_DB=eventos_prod
            - AUTH_ENABLED=true
        depends_on:
            - mongo

    mongo:
        image: mongo:7
        ports:
            - '27017:27017'
        volumes:
            - mongo_data:/data/db

volumes:
    mongo_data:
```

### Build y Run

```bash
# Build
docker build -t eventos-api .

# Run
docker run -p 3000:3000 \
  -e MONGO_URL=mongodb://localhost:27017 \
  -e MONGODB_DB=eventos_dev \
  eventos-api

# Con compose
docker-compose up -d
```

---

## Monitoreo en Producción

### Alertas Recomendadas

1. **Health Check Failed** → API no responde
2. **High Error Rate** → >5% requests con 5xx
3. **Slow Requests** → >1s en p95
4. **MongoDB Down** → Conexión perdida
5. **High Memory** → >80% uso de RAM
6. **Disk Full** → Logs ocupan >90% disco

### Dashboards

**Métricas clave**:

- Request rate (req/s)
- Error rate (%)
- Latency (p50, p95, p99)
- Active connections
- MongoDB operations/s

**Herramientas**:

- Grafana + Prometheus
- Datadog
- New Relic
- AWS CloudWatch

---

## Backup y Restauración

### MongoDB Backup

```bash
# Backup manual
mongodump --uri="mongodb://localhost:27017/eventos_prod" --out=/backup/$(date +%Y%m%d)

# Backup automático (cron)
0 2 * * * mongodump --uri="$MONGO_URL" --db=$MONGODB_DB --out=/backup/$(date +\%Y\%m\%d)
```

### Restauración

```bash
# Restaurar desde backup
mongorestore --uri="mongodb://localhost:27017" --db=eventos_prod /backup/20250115/eventos_prod
```

### Backup en Cloud

**MongoDB Atlas**: Backups automáticos incluidos

**AWS**: Usar MongoDB en EC2 + S3 para backups

```bash
# Script de backup a S3
mongodump --uri="$MONGO_URL" --archive | aws s3 cp - s3://backups/eventos/$(date +%Y%m%d).archive
```

---

## Troubleshooting

### API no arranca

1. Verificar variables requeridas:

```bash
echo $MONGO_URL
echo $MONGODB_DB
```

2. Probar conexión a MongoDB:

```bash
npm run check:mongo
```

3. Ver logs de error:

```bash
npm run dev 2>&1 | grep ERROR
```

### Requests lentas

1. Verificar índices en MongoDB:

```javascript
db.products.getIndexes();
```

2. Analizar queries:

```javascript
db.products.find({ eventId: '123' }).explain('executionStats');
```

3. Revisar logs de timing:

```bash
grep 'responseTime' logs/app.log | jq 'select(.responseTime > 1000)'
```

### Errores 401 inesperados

1. Verificar `AUTH_ENABLED`:

```bash
echo $AUTH_ENABLED
```

2. Verificar token en request:

```bash
curl -v http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### MongoDB desconectado

1. Verificar servicio:

```bash
systemctl status mongod
```

2. Verificar conectividad:

```bash
mongo --eval "db.adminCommand('ping')"
```

3. Revisar logs de MongoDB:

```bash
tail -f /var/log/mongodb/mongod.log
```

---

## Scripts Útiles

### seed.ts

Poblar base de datos con datos de ejemplo:

```bash
npm run seed
```

### check-mongo.ts

Verificar conexión a MongoDB:

```bash
npm run check:mongo
```

### check-import-extensions.ts

Validar extensiones de imports ESM:

```bash
npm run check:imports
```

---

## Ver también

- [Environment Variables](./env.md) - Configuración por ambiente
- [Logging](./logging.md) - Sistema de logs
- [Security](./security.md) - Seguridad en producción
- [Runbook](./runbook.md) - Comandos rápidos
- [Plan de Cierre](./plan_cierre.md) - Tareas pendientes
