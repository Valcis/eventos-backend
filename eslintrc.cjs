// Sugerencia: integra Prettier para evitar conflictos de reglas de formato
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier' // <- asegura que las reglas de formato no choquen
    ],
    rules: {
        'import/order': ['warn', {'newlines-between': 'always', alphabetize: {order: 'asc'}}]
    }
};
