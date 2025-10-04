import fp from 'fastify-plugin';
import {parsePage, parsePageSize} from '../../utils/pagination';
import {listReservas} from './reservas.repo';
import {listReservasQuerySchema, listReservasResponseSchema} from './reservas.schemas';
import {NotImplementedError} from '../../core/http/errors';
import {ok, noContent} from '../../core/http/reply';

export default fp(async (app) => {
    if (!app.hasDecorator('reservasRoutesLoaded')) app.decorate('reservasRoutesLoaded', true);
    else {
        app.log.warn('reservasRoutes already registered — skipping duplicate');
        return;
    }

    app.get('/', {
        schema: {
            summary: 'List reservas (V1 paginación)',
            querystring: listReservasQuerySchema,
            response: {200: listReservasResponseSchema}
        }
    }, async (req, reply) => {
        const {eventId, page, pageSize, filters, sort} = req.query as Record<string, string>;
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        req.log.debug({eventId, page: p, pageSize: ps, filters, sort}, 'listReservas');
        const {rows, total} = await listReservas({eventId, page: p, pageSize: ps, filters, sort});
        req.log.info({eventId, count: rows.length, total}, 'reservas listed');
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    app.post('/', {schema: {summary: 'Create reserva (TBD)'}}, async () => {
        throw new NotImplementedError();
    });
    app.put('/:id', {schema: {summary: 'Update reserva (TBD)'}}, async () => {
        throw new NotImplementedError();
    });
    app.delete('/:id', {schema: {summary: 'Delete reserva (TBD)'}}, async (_req, reply) => {
        return noContent(reply);
    });
});
