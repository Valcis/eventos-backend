import fp from 'fastify-plugin';
import {parsePage, parsePageSize} from '../../utils/pagination.js';
import {listPrecios} from './precios.repo.js';
import {listPreciosQuerySchema, listPreciosResponseSchema} from './precios.schemas.js';
import {NotImplementedError} from '../../core/http/errors.js';
import {ok, noContent} from '../../core/http/reply.js';

export default fp(async (app) => {
    // --- GUARDIA anti-registro duplicado ---
    if (app.hasDecorator('preciosRoutesLoaded')) {
        app.log.warn('preciosRoutes already registered — skipping duplicate');
        return;
    }
    app.decorate('preciosRoutesLoaded', true);
    // ---------------------------------------
    app.get('/', {
        schema: {
            summary: 'List precios (V1 paginación)',
            querystring: listPreciosQuerySchema,
            response: {200: listPreciosResponseSchema}
        }
    }, async (req, reply) => {
        const {eventId, page, pageSize, q} = req.query as Record<string, string>;
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        req.log.debug({eventId, page: p, pageSize: ps, q}, 'listPrecios');
        const {rows, total} = await listPrecios({eventId, page: p, pageSize: ps, q});
        req.log.info({eventId, count: rows.length, total}, 'precios listed');
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    app.post('/', {schema: {summary: 'Create precio (TBD)'}},
        async () => {
            throw new NotImplementedError();
        });

    app.put('/test/:id', {schema: {summary: 'Update precio (TBD)'}},
        async () => {
            throw new NotImplementedError();
        });

    app.delete('/:id', {schema: {summary: 'Delete precio (TBD)'}},
        async (_req, reply) => {
            return noContent(reply);
        });
});
