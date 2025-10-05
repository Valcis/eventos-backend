import type {FastifyPluginAsync} from 'fastify';
import {parsePage, parsePageSize} from '../../utils/pagination';
import {listResponseV1, listQueryV1} from './precios.schemas';
import {listPrecios, createPrecio, updatePrecio, deletePrecio} from './precios.repo';
import {ok, noContent} from '../../core/http/reply';

const preciosRoutes: FastifyPluginAsync = async (app) => {
    app.get('/', {
        schema: {summary: 'List precios (V1 paginación)', querystring: listQueryV1, response: {200: listResponseV1}}
    }, async (req, reply) => {
        const {eventId, page, pageSize, q} = req.query as Record<string, string>;
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        const {rows, total} = await listPrecios({eventId, page: p, pageSize: ps, q});
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    app.post('/', {schema: {summary: 'Create precio'}}, async (req, reply) => {
        const id = await createPrecio(req.body as any);
        return reply.code(201).send({id});
    });

    app.put('/:id', {schema: {summary: 'Update precio'}}, async (req, reply) => {
        const {id} = req.params as { id: string };
        await updatePrecio(id, req.body as any);
        return reply.code(204).send();
    });

    app.delete('/:id', {schema: {summary: 'Delete precio'}}, async (req, reply) => {
        const {id} = req.params as { id: string };
        await deletePrecio(id);
        return noContent(reply);
    });
};

export default preciosRoutes;
