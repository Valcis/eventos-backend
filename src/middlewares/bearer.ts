import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEnv } from '../config/env';

export interface BearerOptions {
    /** rutas que no requieren bearer; acepta prefijos (empiezan por) */
    exemptPaths?: string[];
    /** si true, exige siempre token aunque AUTH_ENABLED=false */
    forceEnabled?: boolean;
}

function isExempt(pathname: string, exempt: readonly string[] = []): boolean {
    return exempt.some(p => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}

export default fp<BearerOptions>(async function bearerPlugin(app: FastifyInstance, opts) {
    const env = getEnv(); // leído una vez; si quieres que sea dinámico, muévelo dentro del hook
    const exempt = opts?.exemptPaths ?? [];
    const isEnabled = opts?.forceEnabled ?? env.AUTH_ENABLED;

    app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
        if (!isEnabled) return;
        const urlPath = req.raw.url?.split('?')[0] ?? '';
        if (isExempt(urlPath, exempt)) return;

        const auth = req.headers['authorization'];
        const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;

        if (!token) {
            return reply.code(401).send({ code: 'FORBIDDEN', message: 'Falta token Bearer' });
        }

        // TODO: verificación real de token (JWT, HMAC, etc.)
        // const payload = verifyJwt(token) ...
        // (req as any).user = payload;  // añade un tipo si lo usas
    });
}, { name: 'bearer-plugin' });
