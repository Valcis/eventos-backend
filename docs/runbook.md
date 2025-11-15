# Runbook - Referencia Rápida

Comandos y procedimientos esenciales para operar **Eventos Backend**.

---

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# 1. Clonar y configurar
git clone <repo-url>
cd eventos-backend
npm install

# 2. Configurar variables de entorno
# Crear archivo .env con variables requeridas (ver docs/env.md)
# Mínimo: MONGO_URL y MONGODB_DB

# 3. Iniciar MongoDB local (si no está corriendo)
mongod --dbpath ./data

# 4. Crear índices (primera vez)
MONGO_BOOT=1 npm run dev

# 5. Desarrollo con hot-reload
npm run dev
```

**API disponible en**: `http://localhost:3000/api`
**Swagger**: `http://localhost:3000/swagger`

---

## 📦 Comandos npm

### Desarrollo

| Comando                 | Descripción                                |
| ----------------------- | ------------------------------------------ |
| `npm install`           | Instalar dependencias                      |
| `npm run dev`           | Modo desarrollo con hot-reload (tsx watch) |
| `npm run check:lint`    | Verificar tipos TypeScript + ESLint        |
| `npm run lint`          | Ejecutar ESLint                            |
| `npm run lint:types`    | Verificar tipos TypeScript                 |
| `npm run lint:fix`      | Fix automático de linting                  |
| `npm run format`        | Formatear código con Prettier              |

### Producción

| Comando         | Descripción                   |
| --------------- | ----------------------------- |
| `npm run build` | Compilar TypeScript → `dist/` |
| `npm start`     | Ejecutar build de producción  |

### Scripts Útiles

| Comando                 | Descripción                           |
| ----------------------- | ------------------------------------- |
| `npm run db:ensure`     | Crear índices MongoDB                 |
| `npm run check:mongo`   | Verificar conexión a MongoDB          |
| `npm run seed`          | Poblar BD con datos de ejemplo        |
| `npm run generate-jwt`  | Generar token JWT para testing        |
| `npm run check:imports` | Validar imports ESM                   |

---

## 🏥 Health Checks

### Verificar que el API esté viva

```bash
curl http://localhost:3000/health
```

**Respuesta esperada (200 OK)**:

```json
{
	"status": "ok",
	"timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Verificar Swagger

```bash
curl http://localhost:3000/swagger
# O abrir en navegador: http://localhost:3000/swagger
```

---

## 🗄️ MongoDB

### Variables Requeridas

```bash
MONGO_URL=mongodb://localhost:27017
MONGODB_DB=eventos_dev
```

### Crear Índices

**Primera vez / Después de cambios en índices**:

```bash
MONGO_BOOT=1 npm run dev
```

**Con script (recomendado para producción)**:

```bash
npm run db:ensure
```

### Conectar a MongoDB

```bash
# Con mongo shell
mongosh "mongodb://localhost:27017/eventos_dev"

# Verificar colecciones
show collections

# Ver índices de una colección
db.products.getIndexes()

# Contar documentos
db.events.countDocuments()
```

### Backup

```bash
# Backup completo
mongodump --uri="mongodb://localhost:27017" --db=eventos_dev --out=./backup

# Restaurar
mongorestore --uri="mongodb://localhost:27017" --db=eventos_dev ./backup/eventos_dev
```

---

## 🔐 Autenticación

### Deshabilitar Auth (Desarrollo)

```bash
AUTH_ENABLED=false npm run dev
```

### Habilitar Auth (Producción)

```bash
AUTH_ENABLED=true npm start
```

### Hacer Request con Token

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Sin token** → `401 Unauthorized`

---

## 📝 Logging

### Ver Logs en Tiempo Real

```bash
# Con pino-pretty (desarrollo)
npm run dev

# Sin pretty (JSON raw)
NODE_ENV=production npm start
```

### Filtrar Logs

```bash
# Ver archivo de logs
tail -f logs/app-$(date +%Y-%m-%d).log

# Solo errores (level 50)
tail -f logs/app-*.log | grep '"level":50'

# Requests lentas (>1s)
cat logs/app-*.log | jq 'select(.responseTime > 1000)'

# Por request ID
cat logs/app-*.log | jq 'select(.reqId == "abc123")'

# Errores del día
cat logs/app-$(date +%Y-%m-%d).log | jq 'select(.level >= 50)'
```

### Niveles de Log

```bash
LOG_LEVEL=debug npm run dev   # trace(10) | debug(20) | info(30) | warn(40) | error(50) | fatal(60)
```

**Archivos generados**:
- `logs/app-YYYY-MM-DD.log` - Todos los logs con rotación diaria

---

## 🐛 Troubleshooting

### API no arranca

**1. Verificar variables de entorno**:

```bash
echo $MONGO_URL
echo $MONGODB_DB
```

**2. Verificar conexión a MongoDB**:

```bash
npm run check:mongo
# O manualmente:
mongosh "$MONGO_URL" --eval "db.adminCommand('ping')"
```

**3. Ver errores**:

```bash
npm run dev 2>&1 | grep -i error
```

### Errores 401 (Unauthorized)

**Causa**: Auth habilitado pero falta token

**Solución**:

```bash
# Opción 1: Deshabilitar auth
AUTH_ENABLED=false npm run dev

# Opción 2: Enviar token
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/products
```

### Errores 404 (Not Found)

**Verificar ruta correcta**:

- ✅ `http://localhost:3000/api/products` (correcto)
- ❌ `http://localhost:3000/products` (sin /api)

**Verificar BASE_PATH**:

```bash
echo $BASE_PATH  # Debe ser /api
```

### Query lenta

**1. Analizar con explain**:

```javascript
// En mongo shell
db.products.find({ eventId: '123' }).explain('executionStats');
```

**2. Verificar índices**:

```javascript
db.products.getIndexes();
```

**3. Crear índices si faltan**:

```bash
MONGO_BOOT=1 npm run dev
```

### Puerto ocupado

```bash
# Encontrar proceso usando puerto 3000
lsof -ti:3000

# Matar proceso
kill -9 $(lsof -ti:3000)

# O cambiar puerto
PORT=3001 npm run dev
```

---

## 🐳 Docker

### Build

```bash
docker build -t eventos-api:latest .
```

### Run

```bash
docker run -d \
  --name eventos-api \
  -p 3000:3000 \
  -e MONGO_URL=mongodb://host.docker.internal:27017 \
  -e MONGODB_DB=eventos_dev \
  -e AUTH_ENABLED=false \
  eventos-api:latest
```

### Ver logs

```bash
docker logs -f eventos-api
```

### Ejecutar comando dentro del container

```bash
docker exec -it eventos-api sh
```

### Docker Compose

```bash
# Iniciar stack completo (API + MongoDB)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Detener y borrar volúmenes
docker-compose down -v
```

---

## 🔄 Despliegue

### Pre-despliegue

```bash
# 1. Verificar tipos y linting
npm run check:lint

# 2. Build
npm run build

# 3. Verificar que dist/ existe
ls -la dist/

# 4. Probar el build localmente
NODE_ENV=production \
MONGO_URL=mongodb://localhost:27017 \
MONGODB_DB=eventos_dev \
node dist/server.js
```

### Despliegue con PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar
pm2 start dist/server.js --name eventos-api

# Ver logs
pm2 logs eventos-api

# Reiniciar
pm2 restart eventos-api

# Detener
pm2 stop eventos-api

# Auto-start en boot
pm2 startup
pm2 save
```

### Variables de Producción

```bash
# Mínimo requerido
export MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net"
export MONGODB_DB="eventos_prod"
export AUTH_ENABLED=true
export NODE_ENV=production
export LOG_LEVEL=warn

# Opcional
export PORT=3000
export BASE_PATH=/api
export MONGO_BOOT=0
```

---

## 📊 Monitoreo

### Métricas Clave

```bash
# Request rate del día
grep 'request completed' logs/app-$(date +%Y-%m-%d).log | wc -l

# Error rate del día
grep '"level":50' logs/app-$(date +%Y-%m-%d).log | wc -l

# Average response time
cat logs/app-$(date +%Y-%m-%d).log | \
  jq -r 'select(.responseTime) | .responseTime' | \
  awk '{sum+=$1; n++} END {if(n>0) print sum/n; else print 0}'

# P95 response time
cat logs/app-$(date +%Y-%m-%d).log | \
  jq -r 'select(.responseTime) | .responseTime' | \
  sort -n | \
  awk 'BEGIN{c=0} {val[c++]=$1} END{print val[int(c*0.95)]}'
```

### Alertas Recomendadas

- ❌ Health check failed → API no responde
- ❌ Error rate >5% → Muchos errores 5xx
- ⚠️ Response time p95 >1s → Lentitud
- ⚠️ MongoDB down → Conexión perdida

---

## 🔧 Mantenimiento

### Limpiar Logs

```bash
# Eliminar logs antiguos (más de 30 días)
find logs/ -name "app-*.log" -mtime +30 -delete

# Ver tamaño de logs
du -sh logs/

# Limpiar todos los logs (CUIDADO)
rm -f logs/app-*.log
```

**Nota**: Los logs rotan automáticamente cada día con `pino-roll`

### Limpiar node_modules y reinstalar

```bash
rm -rf node_modules package-lock.json
npm install
```

### Rebuild completo

```bash
npm run format
npm run lint:fix
npm run check
npm run build
```

---

## 🆘 Contactos y Recursos

### Documentación

- [Overview](./overview.md) - **⭐ Visión general del proyecto** con arquitectura
- [API](./api.md) - Endpoints y ejemplos de requests/responses
- [Data Model](./data-model.md) - Colecciones MongoDB y relaciones
- [Security](./security.md) - Autenticación, validación, y best practices
- [Environment](./env.md) - Variables de entorno completas
- [Logging](./logging.md) - Configuración Pino, niveles, rotación

### Comandos de Emergencia

```bash
# Restart completo
pm2 restart eventos-api

# Rollback a versión anterior
git checkout <previous-commit>
npm run build
pm2 restart eventos-api

# Ver estado del sistema
pm2 status
df -h              # Espacio en disco
free -m            # Memoria
top                # CPU y procesos
```

### Logs de Sistema

```bash
# Logs de PM2
pm2 logs eventos-api --lines 100

# Logs de aplicación (día actual)
tail -f logs/app-$(date +%Y-%m-%d).log

# Logs de aplicación (todos)
tail -f logs/app-*.log

# Logs de MongoDB (si local)
tail -f /var/log/mongodb/mongod.log
```

---

## ✅ Checklist de Despliegue

### Pre-deploy

- [ ] `npm run check:lint` pasa sin errores (tipos + ESLint)
- [ ] Variables de entorno configuradas en producción
- [ ] Backup de MongoDB creado
- [ ] JWT_SECRET configurado (si AUTH_ENABLED=true)

### Deploy

- [ ] Build exitoso (`npm run build`)
- [ ] Índices creados (`MONGO_BOOT=1` o script)
- [ ] Servicio iniciado
- [ ] Health check responde OK

### Post-deploy

- [ ] Verificar logs sin errores críticos
- [ ] Smoke tests de endpoints principales
- [ ] Monitoreo activo
- [ ] Documentación actualizada si hubo cambios

---

## ⚠️ Tareas Pendientes

### DevOps

**GitHub Actions CI/CD** (Prioridad: Alta)
- Workflow para validación automática: `npm ci`, `npm run check:lint`, `npm run build`
- Previene errores antes de merge

### Código

**Campos de auditoría** (Prioridad: Media)
- Validar que `createdAt` se establezca automáticamente en POST
- Validar que `updatedAt` se actualice automáticamente en PUT/PATCH
- Revisar: expenses, reservations, products, promotions, catálogos

**Tipado explícito params/querystring** (Prioridad: Baja)
- Algunos endpoints pueden mejorar tipado con `fastify-type-provider-zod`

---

## 📌 Notas Importantes

- ⚠️ **NUNCA** ejecutar `MONGO_BOOT=1` en producción con tráfico alto (puede bloquear)
- ⚠️ **SIEMPRE** hacer backup antes de migraciones
- ⚠️ **VERIFICAR** que `AUTH_ENABLED=true` en producción
- ⚠️ **NO SUBIR** `.env` al repositorio
- ✅ Usar **PM2** o similar para auto-restart
- ✅ Configurar **reverse proxy** (nginx) para HTTPS
- ✅ Monitorear **métricas** y **logs** continuamente
