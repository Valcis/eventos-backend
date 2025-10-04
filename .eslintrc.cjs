/* eslint-disable */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    project: false
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn'],
  env: { node: true, es2022: true },
  settings: {
    'import/extensions': ['.ts', '.tsx', '.d.ts'],
    'import/resolver': {
      node: { extensions: ['.ts', '.tsx'] }
    }
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

        // 4) Un par de buenas prácticas de Node ESM
        'unicorn/prefer-node-protocol': 'error', // usar node:fs en vez de 'fs' si tocas built-ins
        'import/no-absolute-path': 'error'
      }
    }
  ]
};
