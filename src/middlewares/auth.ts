import type {FastifyRequest, FastifyReply} from 'fastify';
import type {HookHandlerDoneFunction} from 'fastify/types/hooks';
import {getEnv} from '../config/env';

/** preHandler Bearer opcional. Si AUTH_ENABLED=false, deja pasar. */
export function bearerAuth(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    if (!getEnv().AUTH_ENABLED) return done();
    const auth = request.headers['authorization'];
    if (!auth || !auth.toString().startsWith('Bearer ')) {
        reply.code(401).send({code: 'FORBIDDEN', message: 'Falta token Bearer'});
        return;
    }
    // Aquí podrías verificar la firma JWT (pendiente)
    return done();
}
