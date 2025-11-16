# Compartir Documentación API con Frontend

Este documento explica cómo compartir la documentación del API con el equipo de frontend.

---

## 📄 Opciones Disponibles

### 1. **Markdown (Recomendado)** ✅

El archivo `docs/API-REFERENCE.md` contiene la documentación completa en formato Markdown.

**Ventajas:**
- Fácil de leer en GitHub, GitLab, editores de código
- Formato estándar compatible con cualquier plataforma
- Ligero (~15KB)
- Puede verse directamente en el navegador

**Cómo compartir:**
```bash
# Generar/actualizar documentación
npm run docs:generate

# El archivo se encuentra en:
docs/API-REFERENCE.md
```

**Opciones de distribución:**
- Commit al repositorio Git (ya incluido)
- Enviar por email/Slack/Discord
- Subir a Notion/Confluence
- Ver directamente en GitHub: `https://github.com/tu-org/eventos-backend/blob/main/docs/API-REFERENCE.md`

---

### 2. **PDF** 📑

Convertir el Markdown a PDF para distribución profesional.

**Opciones para generar PDF:**

#### **Opción A: Herramientas Online (Más fácil)**

1. Abrir https://md2pdf.netlify.app/
2. Copiar contenido de `docs/API-REFERENCE.md`
3. Pegar y descargar PDF

Otras opciones online:
- https://www.markdowntopdf.com/
- https://www.markdowntohtml.com/ + Imprimir como PDF en Chrome
- https://dillinger.io/ (exportar a PDF)

#### **Opción B: VSCode Extension**

1. Instalar extensión: **Markdown PDF** by yzane
2. Abrir `docs/API-REFERENCE.md`
3. `Ctrl+Shift+P` → "Markdown PDF: Export (pdf)"
4. PDF se genera en `docs/API-REFERENCE.pdf`

#### **Opción C: Comando (Linux/Mac)**

```bash
# Instalar pandoc
sudo apt install pandoc wkhtmltopdf  # Ubuntu/Debian
brew install pandoc wkhtmltopdf      # macOS

# Generar PDF
pandoc docs/API-REFERENCE.md -o docs/API-REFERENCE.pdf --pdf-engine=wkhtmltopdf
```

#### **Opción D: Node.js Script (Requiere Chrome/Chromium)**

```bash
# Instalar md-to-pdf globalmente
npm install -g md-to-pdf

# Generar PDF (desde la raíz del proyecto)
md-to-pdf docs/API-REFERENCE.md --config-file scripts/md-to-pdf.config.js

# El PDF se genera en: docs/API-REFERENCE.pdf
```

---

### 3. **HTML Estático** 🌐

Convertir a HTML para hostear en cualquier servidor web.

```bash
# Usando pandoc
pandoc docs/API-REFERENCE.md -o docs/API-REFERENCE.html --standalone --css=docs/styles.css

# O usando markdown-it CLI
npx markdown-it docs/API-REFERENCE.md > docs/API-REFERENCE.html
```

---

### 4. **Swagger UI (Localhost)** 💻

Si el frontend tiene acceso a tu localhost:

```bash
# Levantar servidor
npm run dev

# Compartir URL:
http://localhost:3000/swagger
```

**Limitaciones:**
- Requiere servidor corriendo
- Solo accesible desde tu red local
- No funciona si frontend está remoto

---

### 5. **Postman Collection** 📮

Exportar como Postman Collection (requiere OpenAPI spec):

```bash
# 1. Generar OpenAPI JSON (requiere servidor con MongoDB)
npm run dev  # En otra terminal

# 2. Obtener spec
curl http://localhost:3000/swagger/json > docs/openapi.json

# 3. Importar en Postman:
# - Abrir Postman
# - File → Import → openapi.json
# - Compartir collection con el equipo
```

---

## 🚀 Método Recomendado para Integración Frontend

### **Paso 1: Generar Documentación**

```bash
npm run docs:generate
```

Esto genera `docs/API-REFERENCE.md` con:
- ✅ Todos los endpoints documentados
- ✅ Autenticación explicada
- ✅ Paginación y populate strategy
- ✅ Códigos de error
- ✅ Ejemplos de uso

### **Paso 2: Compartir**

Elige una de estas opciones según preferencia del equipo frontend:

| Método | Facilidad | Profesionalismo | Offline |
|--------|-----------|----------------|---------|
| Markdown | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ |
| PDF | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| HTML | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| Swagger Local | ⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ |
| Postman | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |

### **Paso 3: Mantener Actualizado**

Cada vez que cambies el API:

```bash
# Regenerar documentación
npm run docs:generate

# Commit cambios
git add docs/API-REFERENCE.md
git commit -m "docs: update API reference"
git push
```

---

## 📋 Contenido de API-REFERENCE.md

El archivo generado incluye:

- **Introducción**: Overview del API
- **Autenticación**: JWT Local y Auth0 OAuth
- **Paginación**: Cursor-based con ejemplos
- **Populate Strategy**: Explicación de objetos embebidos
- **Códigos de Error**: Tabla de errores HTTP
- **Endpoints**: 16 módulos documentados:
  - Authentication (5 endpoints)
  - Users (6 endpoints)
  - Events (6 endpoints)
  - Reservations (7 endpoints)
  - Products (6 endpoints)
  - Promotions (6 endpoints)
  - Expenses (6 endpoints)
  - Y 9 catálogos más...

**Total: ~90 endpoints** documentados

---

## 🔄 Actualización Automática

Para mantener la documentación siempre actualizada, puedes agregar un hook pre-commit:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run docs:generate
git add docs/API-REFERENCE.md
```

O integrar en tu CI/CD para generar automáticamente en cada push.

---

## ❓ Preguntas Frecuentes

### ¿La documentación incluye ejemplos de request/response?

El archivo Markdown incluye la estructura general. Para ejemplos completos, el equipo frontend puede:
1. Ver `docs/api.md` para ejemplos detallados
2. Usar Swagger UI local: `http://localhost:3000/swagger`
3. Ver tests en `src/**/*.test.ts`

### ¿Puedo hospedar Swagger UI estático?

Sí, pero requiere exportar el spec OpenAPI JSON. Ver "Postman Collection" arriba para obtener el JSON, luego usar herramientas como:
- https://github.com/swagger-api/swagger-ui (standalone)
- https://redocly.com/ (Redoc static HTML)

### ¿Cómo actualizo la documentación?

1. Modificar `scripts/generate-api-docs.ts` si cambian endpoints
2. Ejecutar `npm run docs:generate`
3. Commit y compartir

---

## 📚 Recursos Adicionales

- **Documentación completa**: `docs/` (arquitectura, data model, etc.)
- **Ejemplos de API**: `docs/api.md`
- **Populate Strategy**: `docs/populate-strategy.md`
- **Variables de entorno**: `docs/env.md`
- **Swagger local**: `http://localhost:3000/swagger` (servidor corriendo)

---

**Última actualización**: ${new Date().toISOString().split('T')[0]}
