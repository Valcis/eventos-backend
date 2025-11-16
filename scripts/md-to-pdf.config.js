/**
 * Configuración para convertir Markdown a PDF
 *
 * Usa md-to-pdf para generar PDFs bien formateados desde la documentación Markdown.
 * Ejecutar con: npm run docs:md-to-pdf
 */

module.exports = {
	// Opciones de PDF
	pdf_options: {
		format: 'A4',
		margin: {
			top: '20mm',
			right: '15mm',
			bottom: '20mm',
			left: '15mm',
		},
		printBackground: true,
		displayHeaderFooter: true,
		headerTemplate: `
			<style>
				section { margin: 0 auto; font-family: system-ui; font-size: 9px; color: #555; }
			</style>
			<section>
				<span>EVENTOS API Documentation</span>
			</section>
		`,
		footerTemplate: `
			<style>
				section {
					margin: 0 auto;
					font-family: system-ui;
					font-size: 9px;
					color: #555;
				}
			</style>
			<section>
				<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
			</section>
		`,
	},

	// CSS personalizado para el PDF
	stylesheet: `
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 100%;
			padding: 0;
		}

		h1 {
			color: #2563eb;
			border-bottom: 3px solid #2563eb;
			padding-bottom: 0.5rem;
			margin-top: 2rem;
			page-break-before: always;
		}

		h1:first-child {
			page-break-before: avoid;
		}

		h2 {
			color: #1e40af;
			border-bottom: 2px solid #93c5fd;
			padding-bottom: 0.3rem;
			margin-top: 1.5rem;
		}

		h3 {
			color: #1e3a8a;
			margin-top: 1.2rem;
		}

		code {
			background-color: #f1f5f9;
			padding: 0.2rem 0.4rem;
			border-radius: 3px;
			font-size: 0.9em;
			color: #dc2626;
			font-family: 'Courier New', monospace;
		}

		pre {
			background-color: #1e293b;
			color: #e2e8f0;
			padding: 1rem;
			border-radius: 6px;
			overflow-x: auto;
			font-size: 0.85em;
		}

		pre code {
			background-color: transparent;
			color: #e2e8f0;
			padding: 0;
		}

		table {
			border-collapse: collapse;
			width: 100%;
			margin: 1rem 0;
			font-size: 0.9em;
		}

		th {
			background-color: #2563eb;
			color: white;
			padding: 0.75rem;
			text-align: left;
			font-weight: 600;
		}

		td {
			border: 1px solid #e5e7eb;
			padding: 0.75rem;
		}

		tr:nth-child(even) {
			background-color: #f9fafb;
		}

		blockquote {
			border-left: 4px solid #2563eb;
			padding-left: 1rem;
			margin-left: 0;
			color: #64748b;
			font-style: italic;
		}

		a {
			color: #2563eb;
			text-decoration: none;
		}

		a:hover {
			text-decoration: underline;
		}

		hr {
			border: none;
			border-top: 2px solid #e5e7eb;
			margin: 2rem 0;
		}

		/* Evitar saltos de página en medio de bloques importantes */
		table, pre, blockquote {
			page-break-inside: avoid;
		}

		/* Iconos de emojis */
		h2:has(+ *):before {
			margin-right: 0.5rem;
		}
	`,

	// Lanzar el navegador en modo headless
	launch_options: {
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	},
};
