import fp from 'fastify-plugin';
import {getEventConfig, upsertEventConfig} from './eventConfigs.repo.js';
import {getEventConfigResponseSchema, putEventConfigBodySchema} from './eventConfigs.schemas.js';

type Json = { [k: string]: unknown };

function isObject(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isArray(x: unknown): x is unknown[] {
    return Array.isArray(x);
}

function validateMetodoPagoBizum(patch: Json): void {
    const selectores = isObject((patch as any).selectores) ? (patch as any).selectores as Record<string, unknown> : null;
    const metodoPago = selectores && isArray(selectores.metodoPago) ? (selectores.metodoPago as unknown[]) : null;
    if (!metodoPago) return;
    for (const raw of metodoPago) {
        if (!isObject(raw)) continue;
        const nombre = String((raw as any).nombre ?? '').trim().toLowerCase();
        const requiere = (raw as any).requiereReceptor;
        if (nombre === 'bizum' && requiere !== true) {
            const err = new Error('Para "bizum", el campo requiereReceptor debe ser true.');
            (err as any).statusCode = 400;
            (err as any).code = 'VALIDATION_BIZUM_REQUIERE_RECEPTOR';
            throw err;
        }
    }
}

export default fp(async (app) => {
    if (!app.hasDecorator('eventConfigsRoutesLoaded')) app.decorate('eventConfigsRoutesLoaded', true);
    else {
        app.log.warn('eventConfigsRoutes already registered — skipping duplicate');
        return;
    }

    app.get('/:eventId', {
        schema: {
            summary: 'Get event config (selectores embebidos y settings)',
            params: {type: 'object', properties: {eventId: {type: 'string'}}, required: ['eventId']},
            response: {200: getEventConfigResponseSchema}
        }
    }, async (req, reply) => {
        const {eventId} = req.params as { eventId: string };
        req.log.debug({eventId}, 'getEventConfig');
        const data = await getEventConfig(eventId);
        req.log.info({eventId}, 'eventConfig fetched');
        return reply.code(200).send({data});
    });

    app.put('/:eventId', {
        schema: {
            summary: 'Upsert event config',
            params: {type: 'object', properties: {eventId: {type: 'string'}}, required: ['eventId']},
            body: putEventConfigBodySchema, response: {204: {type: 'null'}}
        }
    }, async (req, reply) => {
        const {eventId} = req.params as { eventId: string };
        const patch = req.body as Json;
        try {
            validateMetodoPagoBizum(patch);
        } catch (e: any) {
            req.log.warn({eventId, code: e.code}, e.message);
            return reply.code(e.statusCode ?? 400).send({
                error: {
                    code: e.code ?? 'VALIDATION_ERROR',
                    message: e.message
                }
            });
        }
        await upsertEventConfig(eventId, patch);
        req.log.info({eventId}, 'eventConfig upserted');
        return reply.code(204).send();
    });
});
