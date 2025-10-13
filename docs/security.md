# Seguridad

## Autenticación

### Bearer Token (Actual)

El proyecto usa autenticación **Bearer Token** implementada en `src/plugins/bearer.ts`.

**Configuración**: Variable de entorno `AUTH_ENABLED`

```bash
AUTH_ENABLED=true   # Requiere token en todas las rutas
AUTH_ENABLED=false  # Deshabilitado (desarrollo)
```

### Rutas Protegidas

Cuando `AUTH_ENABLED=true`:

✅ **Rutas que requieren token**:
- `/api/events`
- `/api/products`
- `/api/reservations`
- Todas las rutas de la API

❌ **Rutas excluidas** (sin token):
- `/health` - Health check
- `/swagger` - Documentación

### Cómo Funciona

1. Cliente envía header `Authorization`:
```http
Authorization: Bearer YOUR_TOKEN_HERE
```

2. Plugin valida que el header exista y tenga formato correcto

3. Si falta o es inválido → `401 Unauthorized`:
```json
{
  "code": "FORBIDDEN",
  "message": "Falta token Bearer"
}
```

**Implementación**: `src/plugins/bearer.ts:22-38`

### ⚠️ Validación Pendiente

**IMPORTANTE**: Actualmente el plugin **solo verifica que el token exista**, NO valida su contenido.

```typescript
// TODO en src/plugins/bearer.ts:36
// const payload = verifyJwt(token)
// (req as any).user = payload;
```

**Para implementar validación JWT**:

1. Instalar dependencia:
```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

2. Añadir variables de entorno:
```bash
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
```

3. Implementar verificación:
```typescript
import jwt from 'jsonwebtoken';

const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
(req as any).user = payload;
```

---

## CORS

Configurado en `src/plugins/cors.ts` usando `@fastify/cors`.

**Configuración actual**: Acepta todos los orígenes (desarrollo)

```typescript
await app.register(cors, {
  origin: true, // Acepta cualquier origen
  credentials: true
});
```

**Para producción**, restringir orígenes:

```typescript
await app.register(cors, {
  origin: ['https://app.tudominio.com', 'https://admin.tudominio.com'],
  credentials: true
});
```

O usando variable de entorno:

```bash
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

---

## Gestión de Secretos

### Variables Sensibles

**Nunca** incluir en el código:
- Passwords de bases de datos
- Tokens de API
- Claves JWT
- Credenciales de servicios

### Uso de .env

✅ **Correcto**:
```bash
# .env (en .gitignore)
MONGO_URL=mongodb://user:password@localhost:27017
JWT_SECRET=supersecret123
```

❌ **Incorrecto**:
```typescript
// ¡NO hacer esto!
const JWT_SECRET = 'supersecret123';
```

### Producción

En producción, usar variables de entorno del sistema:

**Docker**:
```yaml
# docker-compose.yml
environment:
  - MONGO_URL=${MONGO_URL}
  - JWT_SECRET=${JWT_SECRET}
```

**Kubernetes**:
```yaml
# deployment.yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: jwt-secret
```

---

## Logging de Seguridad

### Información Sensible

El sistema de logging **debe evitar**:
- ❌ Tokens completos
- ❌ Passwords
- ❌ Headers `Authorization` completos
- ❌ Datos personales (PII)

**Implementación actual**: Básica, sin redacción de campos sensibles.

**Mejora pendiente** (ver `roadmap.md`):

```typescript
// En src/core/logging/logger.ts
export function buildLoggerOptions() {
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token'
      ],
      censor: '[REDACTED]'
    }
  };
}
```

### Auditoría

El hook `onResponse` registra todas las requests:

```typescript
app.addHook('onResponse', async (req, reply) => {
  req.log.info({
    statusCode: reply.statusCode,
    method: req.method,
    url: req.url,
    responseTime: reply.elapsedTime,
  }, 'request completed');
});
```

**Ver**: `src/app.ts:73-83`

---

## Mejoras Pendientes

### 🔒 Rate Limiting

**Estado**: No implementado

**Recomendación**: Usar `@fastify/rate-limit`

```typescript
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  max: 100,              // 100 requests
  timeWindow: '1 minute',
  skipOnError: true,
  allowList: [/^127\.0\.0\.1$/] // Excluir localhost
});
```

### 🔒 Helmet (Headers de Seguridad)

**Estado**: No implementado

**Recomendación**: Usar `@fastify/helmet`

```typescript
import helmet from '@fastify/helmet';

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
});
```

### 🔒 Input Validation

**Estado**: Parcialmente implementado (Zod en config)

**Mejora**: Validar todos los inputs con Zod schemas:

```typescript
import { z } from 'zod';

const CreateProductSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.string().regex(/^\d+\.\d{2}$/),
});

// En route handler
const data = CreateProductSchema.parse(req.body);
```

### 🔒 SQL/NoSQL Injection

**Estado**: Protegido (uso de driver nativo MongoDB)

MongoDB driver maneja automáticamente la sanitización, pero **evitar**:

```typescript
// ❌ MAL - inyección potencial
const query = { $where: req.query.filter };

// ✅ BIEN - usar operadores seguros
const query = { eventId: req.query.eventId };
```

---

## Checklist de Seguridad

### Desarrollo
- [ ] Variables sensibles en `.env` (no en código)
- [ ] `.env` en `.gitignore`
- [ ] Validación de inputs con Zod
- [ ] No loguear secretos

### Staging/Producción
- [ ] `AUTH_ENABLED=true`
- [ ] Validación JWT implementada
- [ ] CORS restringido a dominios específicos
- [ ] Rate limiting activo
- [ ] Helmet configurado
- [ ] HTTPS obligatorio
- [ ] Variables de entorno desde secrets manager
- [ ] Logging con redacción de datos sensibles
- [ ] Monitoring de intentos de acceso fallidos

---

## Ver también

- [Environment Variables](./env.md) - Configuración de AUTH_ENABLED
- [Bearer Plugin](../src/plugins/bearer.ts) - Implementación actual
- [Plan de Cierre](./plan_cierre.md) - Mejoras de seguridad pendientes
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Vulnerabilidades comunes
