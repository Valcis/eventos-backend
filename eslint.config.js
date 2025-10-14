import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANTE: pasa las built-ins a FlatCompat
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	// Ignora artefactos habituales (añade otros si los usabas)
	{
		ignores: ['node_modules/**', 'dist/**', 'coverage/**', '*.log'],
	},

	// Tu config original, expresada en el mismo objeto que tenías en .eslintrc.cjs
	...compat.config({
		root: true,
		parser: '@typescript-eslint/parser',
		parserOptions: {
			sourceType: 'module',
			ecmaVersion: 2022,
			project: false,
		},
		plugins: ['@typescript-eslint', 'import', 'unicorn'],
		env: { node: true, es2022: true },
		settings: {
			'import/extensions': ['.ts', '.tsx', '.d.ts'],
			'import/resolver': {
				node: { extensions: ['.ts', '.tsx'] },
			},
		},
		overrides: [
			{
				files: ['**/*.ts', '**/*.tsx'],
				rules: {
					// 1) Prohíbe importar con extensión .js desde archivos TS/TSX
					'no-restricted-imports': ['error', { patterns: ['**/*.js'] }],

					// 2) Exige NO poner extensión en imports TS (import/extensions: never)
					'import/extensions': ['error', 'never', { ts: 'never', tsx: 'never' }],

					// 3) Evita require() en TS
					'@typescript-eslint/no-require-imports': 'error',

					// 4) Buenas prácticas Node ESM
					'unicorn/prefer-node-protocol': 'error',
					'import/no-absolute-path': 'error',
				},
			},
		],
		extends: [
			'eslint:recommended',
			'plugin:@typescript-eslint/recommended',
			'plugin:import/recommended',
			'plugin:import/typescript',
			'prettier', // asegura que las reglas de formato no choquen
		],
	}),
];
