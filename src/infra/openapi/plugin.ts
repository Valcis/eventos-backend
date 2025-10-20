import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import type { OpenAPIV3 } from 'openapi-types';
import { buildOpenApiDocument } from './generator';

export interface OpenApiPluginOptions {
	routePrefix?: string; // '/swagger' por defecto
}

const openApiPluginBase: FastifyPluginCallback<OpenApiPluginOptions> = (app, opts, done) => {
	const doc: OpenAPIV3.Document = buildOpenApiDocument();

	app.register(swagger, {
		mode: 'static',
		specification: { document: doc },
	});

	app.register(swaggerUI, {
		routePrefix: opts.routePrefix ?? '/swagger',
		staticCSP: true,
		uiConfig: {
			// Visual / UX
			docExpansion: 'list', // 'none' | 'list' | 'full'
			deepLinking: true,
			filter: true, // buscador de operaciones
			displayRequestDuration: true, // muestra ms de las requests
			tryItOutEnabled: true, // “Try it out” activado por defecto
			persistAuthorization: true, // mantiene el token tras recargar

			// Modelos y ejemplos
			defaultModelsExpandDepth: -1, // oculta el panel “Schemas”
			defaultModelExpandDepth: 2, // profundidad de un schema
			defaultModelRendering: 'model', // 'model' | 'example'

			// Código: tema oscuro para syntax highlighting
			syntaxHighlight: {
				activate: true,
				theme: 'monokai', // oscuro (solo afecta a bloques de código)
			},
		},

		// Tema: inyectamos CSS para “dark mode” general de la UI
		theme: {
			title: 'EVENTOS API',
			/*css: [{
                filename: 'dark-soft.css',
                content: `
@media (prefers-color-scheme: dark) {
  :root{
    --bg: #0f1216;          /!* fondo principal (no negro puro) *!/
    --panel: #161a20;       /!* tarjetas/paneles *!/
    --muted: #8c96a5;       /!* textos secundarios *!/
    --text: #e7eaf0;        /!* texto principal *!/
    --border: #232a33;      /!* bordes suaves *!/
    --accent: #77b0ff;      /!* enlaces/acentos *!/
    --accent-strong: #2f81f7; /!* botones *!/
    --op-bg: #1a1f26;       /!* cabecera opblocks *!/
    --op-border: #263040;
    --code-bg: #0e1318;     /!* fondo bloques code *!/
  }

  /!* Fondo y tipografía *!/
  body, .swagger-ui { background-color: var(--bg); color: var(--text); }

  /!* Topbar *!/
  .swagger-ui .topbar, .swagger-ui .topbar-wrapper {
    background: var(--bg); border-bottom: 1px solid var(--border);
  }
  .swagger-ui .topbar .download-url-wrapper input[type=text]{
    background: var(--panel); color: var(--text); border-color: var(--border);
  }

  /!* Enlaces *!/
  .swagger-ui a, .swagger-ui .nostyle, .swagger-ui .opblock-summary-path {
    color: var(--accent);
  }
  .swagger-ui a:hover { filter: brightness(1.1); }

  /!* Paneles / tarjetas *!/
  .swagger-ui .scheme-container,
  .swagger-ui .information-container,
  .swagger-ui .wrapper { background: var(--bg); }

  .swagger-ui .opblock {
    background: var(--panel);
    border: 1px solid var(--op-border);
  }
  .swagger-ui .opblock-summary {
    background: var(--op-bg);
    border-bottom: 1px solid var(--op-border);
  }

  /!* Tablas / listas *!/
  .swagger-ui table thead tr th,
  .swagger-ui table tbody tr td { border-color: var(--border); }
  .swagger-ui .prop-format, .swagger-ui .prop-type { color: var(--muted); }

  /!* Inputs *!/
  .swagger-ui input, .swagger-ui select, .swagger-ui textarea {
    background: var(--panel); color: var(--text); border-color: var(--border);
  }

  /!* Modelos *!/
  .swagger-ui .model, .swagger-ui .model-box,
  .swagger-ui .property.primitive { background: var(--panel); }
  .swagger-ui .model-toggle { color: var(--muted); }

  /!* Código *!/
  .swagger-ui .microlight, pre, code {
    background: var(--code-bg) !important; color: var(--text);
  }

  /!* Botones *!/
  .swagger-ui .btn, .swagger-ui .authorize__btn {
    background: var(--accent-strong); color: #fff; border: 0;
  }
  .swagger-ui .btn[disabled]{ opacity: .6; }
  .swagger-ui .btn:hover, .swagger-ui .authorize__btn:hover { filter: brightness(1.08); }

  /!* Badges de método (más suaves, mantienen diferenciación) *!/
  .opblock.opblock-get .opblock-summary-method { background: #2b7a77; }
  .opblock.opblock-post .opblock-summary-method { background: #3763d8; }
  .opblock.opblock-put .opblock-summary-method { background: #9364d6; }
  .opblock.opblock-delete .opblock-summary-method { background: #c14545; }
  .opblock.opblock-patch .opblock-summary-method { background: #b7852a; }

  /!* Bordes y separadores *!/
  .swagger-ui .opblock .tab-header,
  .swagger-ui .opblock .opblock-section-header { border-color: var(--border); }
}
      `,
            }],
            js: [{
                filename: 'theme-toggle.js',
                content: `
(function(){
  var KEY='swagger.ui.theme';
  var cur = localStorage.getItem(KEY) || 'light';
  function apply(t){ document.documentElement.setAttribute('data-theme', t); }
  function btn(){
    var b=document.createElement('button');
    b.textContent = (cur==='dark'?'☀️ Light':'🌙 Dark');
    b.style.cssText='margin-left:8px;padding:6px 10px;border:0;border-radius:8px;cursor:pointer';
    b.onclick=function(){
      cur = cur==='dark'?'light':'dark';
      localStorage.setItem(KEY,cur);
      apply(cur);
      b.textContent = (cur==='dark'?'☀️ Light':'🌙 Dark');
    };
    return b;
  }
  function mount(){
    apply(cur);
    var tb=document.querySelector('.topbar .topbar-wrapper');
    if(tb && !tb.querySelector('[data-theme-btn]')){
      var holder=document.createElement('span'); holder.setAttribute('data-theme-btn','1');
      holder.appendChild(btn());
      tb.appendChild(holder);
    }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', mount); }
  else { mount(); }
})();`
            }]*/
		},
	});

	done();
};

export const openApiPlugin = fp(openApiPluginBase, { name: 'openapi-plugin' });
