import type {FastifyPluginAsync} from 'fastify';
import {
    eventIdParams,
    upsertEventConfigBody,
    getEventConfigResponseWithExample,
    badRequestBizumRule,
    type UpsertEventConfigBody,
    type EventConfigResponse,
    type SelectorItem
} from './eventConfigs.schemas';
import {getEventConfig, upsertEventConfig} from './eventConfigs.repo';

//
// Pequeños type-guards locales (sin any)
//
function isPlainObject(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isSelectorItem(x: unknown): x is SelectorItem {
    return isPlainObject(x) && typeof (x.nombre ?? '') === 'string';
}

function isSelectorArray(x: unknown): x is SelectorItem[] {
    return Array.isArray(x) && x.every(isSelectorItem);
}

//
// Regla de negocio:
// si existe un item en selectores.metodoPago con nombre "bizum" (case-insensitive),
// entonces requiereReceptor debe ser true.
//
function validateMetodoPagoBizum(body: UpsertEventConfigBody): void {
    const sel = body.selectores;
    if (!sel) return;
    const mp = sel.metodoPago;
    if (!mp || !isSelectorArray(mp)) return;

    for (const item of mp) {
        const nombre = (item.nombre ?? '').trim().toLowerCase();
        if (nombre === 'bizum' && item.requiereReceptor !== true) {
            const err = new Error('Para "bizum", el campo requiereReceptor debe ser true.');
            (err as unknown as { statusCode: number; code: string }).statusCode = 400;
            (err as unknown as { statusCode: number; code: string }).code = 'VALIDATION_BIZUM_REQUIERE_RECEPTOR';
            throw err;
        }
    }
}

type GetParams = { eventId: string };
type PutParams = { eventId: string };
type GetReply = EventConfigResponse;

const eventConfigsRoutes: FastifyPluginAsync = async (app) => {
    // GET /:eventId
    app.get<{ Params: GetParams; Reply: GetReply }>('/:eventId', {
        schema: {
            summary: 'Get event config',
            tags: ['event-configs'],
            params: eventIdParams,
            response: {200: getEventConfigResponseWithExample}
        }
    }, async (req, reply) => {
        const data = await getEventConfig(req.params.eventId);
        const payload: EventConfigResponse = {data: {eventId: String(data.eventId), ...data}};
        return reply.code(200).send(payload);
    });

    // PUT /:eventId
    app.put<{ Params: PutParams; Body: UpsertEventConfigBody }>('/:eventId', {
        schema: {
            summary: 'Upsert event config',
            tags: ['event-configs'],
            params: eventIdParams,
            body: upsertEventConfigBody,
            response: {204: {type: 'null'}, 400: badRequestBizumRule}
        }
    }, async (req, reply) => {
        const patch = req.body;
        validateMetodoPagoBizum(patch);
        await upsertEventConfig(req.params.eventId, patch as Record<string, unknown>);
        return reply.code(204).send();
    });
};

export default eventConfigsRoutes;
