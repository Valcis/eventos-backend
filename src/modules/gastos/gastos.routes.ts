import {FastifyPluginAsync} from "fastify";
import {parsePage, parsePageSize} from '../../utils/pagination';
import {listGastos} from './gastos.repo';
import {listGastosQuerySchema, listGastosResponseSchema} from './gastos.schemas';
import {NotImplementedError} from '../../core/http/errors';
import {ok, noContent} from '../../core/http/reply';


const gastosRoutes: FastifyPluginAsync = async (app) => {
    // Guardia anti-duplicado
    if (!app.hasDecorator('gastosRoutesLoaded')) app.decorate('gastosRoutesLoaded', true);
    else {
        app.log.warn('gastosRoutes already registered — skipping duplicate');
        return;
    }

    app.get('/', {
        schema: {
            summary: 'List gastos (V1 paginación)',
            querystring: listGastosQuerySchema,
            response: {200: listGastosResponseSchema}
        }
    }, async (req, reply) => {
        const {eventId, page, pageSize, filters, sort} = req.query as Record<string, string>;
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        req.log.debug({eventId, page: p, pageSize: ps, filters, sort}, 'listGastos');
        const {rows, total} = await listGastos({eventId, page: p, pageSize: ps, filters, sort});
        req.log.info({eventId, count: rows.length, total}, 'gastos listed');
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    app.post('/', {schema: {summary: 'Create gasto (TBD)'}}, async () => {
        throw new NotImplementedError();
    });
    app.put('/:id', {schema: {summary: 'Update gasto (TBD)'}}, async () => {
        throw new NotImplementedError();
    });
    app.delete('/:id', {schema: {summary: 'Delete gasto (TBD)'}}, async (_req, reply) => {
        return noContent(reply);
    });
}


export default gastosRoutes;