import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		exclude: ['node_modules', 'dist', 'build'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'build/',
				'src/**/*.test.ts',
				'src/**/*.spec.ts',
				'src/system/cli/**',
			],
		},
		testTimeout: 10000,
		hookTimeout: 10000,
	},
});
