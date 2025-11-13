#!/usr/bin/env tsx

/**
 * Script de utilidad para generar tokens JWT de prueba
 * Uso: npx tsx src/tools/generate-jwt.ts
 */

import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import type { JwtPayload } from '../../shared/types/jwt';

const env = getEnv();

if (!env.JWT_SECRET) {
	console.error('ERROR: JWT_SECRET no está configurado en .env');
	process.exit(1);
}

// Non-null assertion es seguro aquí porque ya verificamos arriba
const jwtSecret: string = env.JWT_SECRET!;

// Payload de ejemplo
const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
	userId: '507f1f77bcf86cd799439011',
	email: 'admin@eventos.com',
	role: 'admin',
	eventIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
};

// Generar token
// @ts-ignore - Tipo de expiresIn tiene problemas con la versión de @types/jsonwebtoken
const token: string = jwt.sign(payload, jwtSecret, {
	algorithm: env.JWT_ALGORITHM || 'HS256',
	expiresIn: env.JWT_EXPIRES_IN || '24h',
	issuer: 'eventos-backend',
	subject: payload.userId,
});

console.log('\n=== TOKEN JWT GENERADO ===\n');
console.log('Token:');
console.log(token);
console.log('\n=== Payload ===\n');
console.log(JSON.stringify(payload, null, 2));
console.log('\n=== Configuración ===\n');
console.log(`Algorithm: ${env.JWT_ALGORITHM || 'HS256'}`);
console.log(`Expires in: ${env.JWT_EXPIRES_IN || '24h'}`);
console.log('\n=== Uso ===\n');
console.log('Copia el token y úsalo en tus requests:');
console.log(
	`curl -H "Authorization: Bearer ${token}" http://localhost:${env.PORT}${env.BASE_PATH}/events`,
);
console.log('\n');

// Verificar que el token es válido
try {
	const decoded = jwt.verify(token, jwtSecret, {
		algorithms: [(env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm],
	});
	console.log('✅ Token verificado correctamente');
	console.log('\n=== Decoded Payload ===\n');
	console.log(JSON.stringify(decoded, null, 2));
} catch (err) {
	console.error('❌ Error al verificar token:', err);
	process.exit(1);
}
