# Folder Structure & Organization

Este documento define la **estructura de carpetas del proyecto** y los **criterios de organización** para mantener consistencia y evitar duplicación.

---

## 📂 Estructura General

```
eventos-backend/
├── .github/                  # GitHub Actions workflows
├── docs/                     # 📖 Documentación del proyecto
├── openapi/                  # OpenAPI/Swagger YAML estático
├── src/                      # 💻 Código fuente TypeScript
└── package.json              # Dependencias y npm scripts
```

---

## 📖 `/docs` - Documentación

Toda la documentación técnica del proyecto en formato Markdown.

```
docs/
├── architecture.md           # Arquitectura en capas
├── api.md                   # Contratos API y ejemplos
├── data-model.md            # Modelo de datos MongoDB
├── data_model.puml          # Diagrama UML de relaciones
├── db.indexes.md            # Índices MongoDB
├── env.md                   # Variables de entorno
├── error-codes.md           # Códigos de error de la API
├── folder-structure.md      # ⭐ Este documento
├── logging.md               # Configuración de logging
├── overview.md              # Visión general del proyecto
├── pagination.md            # Estrategia de paginación
├── reservations-validation.md # Validación de reservas
├── runbook.md               # Troubleshooting, operaciones y tareas pendientes
└── security.md              # Consideraciones de seguridad
```

**Criterio**: Documentar todo lo relevante para entender, mantener y operar el sistema.

---

## 💻 `/src` - Código Fuente

Todo el código TypeScript del proyecto.

### Estructura de `/src`

```
src/
├── app.ts                   # ⭐ Bootstrap de Fastify + registro de plugins/rutas
├── server.ts                # ⭐ Entry point (levanta el servidor)
├── config/                  # Configuración y variables de entorno
├── core/                    # Núcleo: logging, HTTP utils, errores
├── infra/                   # Infraestructura: MongoDB, externos
├── modules/                 # Módulos de negocio (eventos, reservas, catálogos)
├── plugins/                 # Plugins de Fastify
├── shared/                  # Código compartido (types, lib, schemas)
└── system/                  # Sistema: rutas HTTP + CLI tools
    ├── cli/                 # CLI tools y utilidades TypeScript
    └── healthCheck.ts       # Health check HTTP endpoint
```

---

## 📁 `/src/config` - Configuración

Validación y exposición de variables de entorno.

```
src/config/
└── env.ts                   # Zod schema + getEnv() para validar .env
```

**Criterio**:

- Un solo archivo de configuración centralizado
- Validación con Zod
- Exporta función `getEnv()` tipo-safe

---

## 🔧 `/src/core` - Núcleo

Funcionalidades core del framework: logging, HTTP utils, error handling.

```
src/core/
├── http/
│   ├── envelopes.ts         # Wrappers de respuesta estándar
│   ├── errorHandler.ts      # Error handler global
│   └── errors.ts            # AppError custom class
└── logging/
    ├── requestId.ts         # Request ID tracking
    └── index.ts             # Logger Pino configurado
```

**Criterio**:

- Funcionalidades **transversales** a todos los módulos
- No contiene lógica de negocio
- Reutilizable en cualquier proyecto Fastify

---

## 🗄️ `/src/infra` - Infraestructura

Integración con servicios externos: bases de datos, APIs externas, etc.

```
src/infra/
└── mongo/
    ├── artifacts.ts         # Índices y validators MongoDB
    ├── client.ts            # Conexión MongoDB singleton
    └── crud.ts              # ⭐ Factory CRUD genérico
```

**Criterio**:

- Abstrae acceso a **infraestructura externa**
- Permite cambiar proveedores sin tocar lógica de negocio
- Solo MongoDB actualmente, pero puede crecer: `/redis`, `/s3`, etc.

---

## 📦 `/src/modules` - Módulos de Negocio

Cada módulo representa una **entidad de negocio** o grupo de funcionalidades relacionadas.

```
src/modules/
├── controller.ts            # ⭐ Factory genérico de controladores CRUD
├── events/
│   ├── routes.ts            # Registro de rutas Fastify
│   └── schema.ts            # Schemas Zod + tipos
├── reservations/
│   ├── routes.ts
│   ├── schema.ts
│   ├── validation.ts        # Validaciones de integridad referencial
│   └── stock.ts             # Control de stock con transacciones
├── expenses/
│   ├── routes.ts
│   └── schema.ts
└── catalogs/                # Catálogos compartidos por todos los eventos
    ├── zod.schemas.ts       # Schemas base compartidos
    ├── products/
    │   ├── routes.ts
    │   └── schema.ts
    ├── promotions/
    │   ├── routes.ts
    │   └── schema.ts
    ├── salespeople/
    │   ├── routes.ts
    │   └── schema.ts
    ├── payment-methods/
    │   ├── routes.ts
    │   └── schema.ts
    └── ... (otros catálogos)
```

### Estructura Interna de un Módulo

Cada módulo sigue esta estructura:

```
modules/{module}/
├── routes.ts                # Define endpoints HTTP (GET, POST, etc.)
├── schema.ts                # Zod schemas + tipos TypeScript
├── validation.ts            # ⚠️ OPCIONAL: validaciones complejas
└── {specific}.ts            # ⚠️ OPCIONAL: lógica específica (ej: stock.ts)
```

**Criterio**:

- **`routes.ts`** - SIEMPRE presente. Default export de función plugin Fastify
- **`schema.ts`** - SIEMPRE presente. Schemas Zod para validación
- Archivos adicionales **solo si hay lógica compleja** (validación, transacciones, etc.)
- **NO crear** archivos innecesarios (ej: service.ts vacío)

---

## 🔌 `/src/plugins` - Plugins Fastify

Plugins reutilizables de Fastify para middleware, decoradores, hooks.

```
src/plugins/
├── bearer.ts                # Autenticación JWT Bearer
├── cors.ts                  # Configuración CORS
└── openapi.ts               # Swagger/OpenAPI
```

**Criterio**:

- Un archivo por plugin
- Exporta default `fastify-plugin`
- Puede recibir opciones (interface `{Plugin}Options`)

---

## 🤝 `/src/shared` - Código Compartido

Código compartido entre módulos: tipos, utilidades, schemas.

```
src/shared/
├── lib/                     # Librerías y utilidades
│   ├── cursor.ts            # Paginación cursor-based
│   ├── dates.ts             # Helpers de fechas
│   └── mongo.ts             # Helpers MongoDB
├── schemas/                 # Schemas Zod reutilizables
│   └── responses.ts         # Schemas de respuestas OpenAPI
└── types/                   # ⭐ Tipos TypeScript compartidos
    ├── fastify.ts           # Helper types + module augmentation
    ├── jwt.ts               # JWT payload + module augmentation
    ├── pagination.ts        # Tipos de paginación
    └── sort.ts              # Tipos de ordenación
```

### 📝 `/src/shared/types` - Tipos Compartidos

**IMPORTANTE**: Este es el **ÚNICO** directorio para tipos compartidos.

**Criterio**:

- **Un solo directorio** para tipos (no crear `/src/types` duplicado)
- Tipos **reutilizables** entre módulos
- Module augmentation de librerías (Fastify, etc.)

**Contenido**:

- **`fastify.ts`** - Helper types (IdParams, PageQuery, etc.) + module augmentation para `FastifyInstance`
- **`jwt.ts`** - JWT payload interface + module augmentation para `FastifyRequest.user`
- **`pagination.ts`** - Tipos de paginación
- **`sort.ts`** - Tipos de ordenación

---

## 🏥 `/src/system` - Sistema

Agrupa todo lo relacionado con el **sistema** (no negocio): rutas HTTP del sistema y CLI tools.

```
src/system/
├── cli/                     # CLI tools y utilidades TypeScript
│   ├── check-import-extensions.ts  # Verifica extensiones .js en imports
│   ├── check-mongo.ts              # Verifica conexión MongoDB
│   ├── db-ensure.ts                # Crea índices manualmente
│   ├── generate-jwt.ts             # Genera tokens JWT de prueba
│   └── seed.ts                     # Seed de datos de ejemplo
└── healthCheck.ts           # Health check HTTP endpoint
```

### `/src/system/cli` - CLI Tools

Scripts TypeScript ejecutables para desarrollo, mantenimiento y utilidades.

**Criterio**:

- Scripts **TypeScript** ejecutables con `tsx`
- Referenciados en `package.json` bajo `scripts`
- Herramientas de **desarrollo, mantenimiento, testing**

**Ejemplos de uso**:

```bash
npm run check:mongo      # tsx src/system/cli/check-mongo.ts
npm run seed             # tsx src/system/cli/seed.ts
npm run generate-jwt     # tsx src/system/cli/generate-jwt.ts
npm run db:ensure        # tsx src/system/cli/db-ensure.ts
```

### `/src/system/healthCheck.ts` - Health Check

Endpoint HTTP del sistema para verificar el estado del servicio.

**Criterio**:

- Rutas HTTP **no relacionadas con negocio**
- Monitoring, métricas, status
- Accesibles vía HTTP (ej: `GET /health`)

---

## 🎯 Principios de Organización

### 1. **DRY (Don't Repeat Yourself)**

- Si algo se repite, crear en `/src/shared`
- Usar factories genéricos (`makeController`, `makeCrud`)

### 2. **Separación de Responsabilidades**

- Cada carpeta tiene un propósito claro
- No mezclar infraestructura con lógica de negocio
- No mezclar TypeScript con Shell scripts

### 3. **Convención sobre Configuración**

- Estructura predecible: `modules/{module}/routes.ts`
- Nombres descriptivos: `check-mongo.ts`, `test-errors.sh`

### 4. **Minimalismo**

- No crear archivos vacíos o innecesarios
- No crear carpetas duplicadas (`types` vs `shared/types`)
- Solo añadir archivos cuando hay lógica real

### 5. **Documentación Actualizada**

- Cuando creas carpetas o archivos, actualiza este documento
- Si algo cambia, documéntalo

---

## ❌ Anti-Patrones - NO HACER

### ❌ NO crear directorios duplicados

```
❌ src/types/ (cuando ya existe src/shared/types/)
❌ src/utils/ (cuando ya existe src/shared/lib/)
❌ src/scripts/ (cuando ya existe src/system/cli/)
❌ /scripts en raíz (testing redundante - usar Swagger)
```

### ❌ NO crear subdirectorios innecesarios

```
❌ src/system/health/health.routes.ts  ← Subdirectorio innecesario
✅ src/system/healthCheck.ts           ← Correcto
```

### ❌ NO crear archivos vacíos o con solo comentarios

```
❌ service.ts (vacío, sin lógica)
❌ helpers.ts (solo comentarios, sin código)
```

### ❌ NO profundizar innecesariamente

```
❌ src/modules/events/routes/index.ts  ← Innecesario
✅ src/modules/events/routes.ts        ← Correcto
```

---

## 🔄 Flujo de Decisión: ¿Dónde va mi código?

```mermaid
graph TD
    A[¿Qué tipo de código es?] --> B{¿Es documentación?}
    B -->|Sí| C[/docs/*.md]
    B -->|No| D{¿Es script CLI/utility?}
    D -->|Sí| E[/src/system/cli/*.ts]
    D -->|No| F{¿Es infraestructura?}
    F -->|Sí| G[/src/infra/*]
    F -->|No| H{¿Es entidad de negocio?}
    H -->|Sí| I[/src/modules/{entity}/]
    H -->|No| J{¿Es código compartido?}
    J -->|Tipos| K[/src/shared/types/]
    J -->|Utils| L[/src/shared/lib/]
    J -->|Schemas| M[/src/shared/schemas/]
    J -->|No| N{¿Es plugin Fastify?}
    N -->|Sí| O[/src/plugins/]
    N -->|No| P{¿Es ruta HTTP del sistema?}
    P -->|Sí| Q[/src/system/*.ts]
    P -->|No| R[/src/core/]
```

---

## 📋 Checklist al Crear Código

Antes de crear archivos/carpetas, pregúntate:

- [ ] ¿Ya existe una carpeta para esto?
- [ ] ¿Es realmente necesario crear este archivo?
- [ ] ¿Estoy respetando la convención de nomenclatura?
- [ ] ¿Este código es compartido o específico de un módulo?
- [ ] ¿He actualizado la documentación?

---

## 🔗 Ver También

- [Architecture](./architecture.md) - Arquitectura en capas del sistema
- [Overview](./overview.md) - Visión general del proyecto
- [Operations](./operations.md) - Guía de operaciones y mantenimiento

---

**Última actualización**: 2025-11-13
**Mantenedor**: Documentar cambios estructurales siempre en este archivo.
