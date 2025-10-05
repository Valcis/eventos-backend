import type {FastifyPluginAsync} from 'fastify';
import {parsePage, parsePageSize} from '../../utils/pagination';
import {
    listQueryV1,
    createPrecioBody, updatePrecioBody,
    type CreatePrecioBody, type UpdatePrecioBody, listResponseV1WithExample, badRequestError, createPrecioResponse
} from './precios.schemas';
import {
    listPrecios, createPrecio, updatePrecio, deletePrecio,
    type PrecioRow
} from './precios.repo';
import {ok, noContent} from '../../core/http/reply';

type ListReply = { data: PrecioRow[]; meta: { total: number; page: number; pageSize: number } };
type CreateReply = { data: PrecioRow };
type IdParams = { id: string };

const preciosRoutes: FastifyPluginAsync = async (app) => {
    // LIST
    app.get<{ Reply: ListReply }>('/', {
        schema: {
            summary: 'List precios (V1 paginación)',
            tags: ['precios'],
            querystring: listQueryV1,
            response: {200: listResponseV1WithExample, 400: badRequestError}
        }
    }, async (req, reply) => {
        const {eventId, page, pageSize, q} = req.query as unknown as {
            eventId: string; page?: string; pageSize?: string; q?: string;
        };
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        const {rows, total} = await listPrecios({eventId, page: p, pageSize: ps, q});
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    // CREATE
    app.post<{ Body: CreatePrecioBody; Reply: CreateReply }>('/', {
        schema: {
            summary: 'Create precio',
            tags: ['precios'],
            body: createPrecioBody,
            response: {201: createPrecioResponse, 400: badRequestError}
        }
    }, async (req, reply) => {
        const b = req.body;
        // No propagar undefined: añadir solo cuando vengan definidos
        const input = {
            eventId: b.eventId,
            concepto: b.concepto,
            importe: b.importe,
            moneda: b.moneda,
            isActive: b.isActive,
            ...(b.createdAt ? {createdAt: new Date(b.createdAt)} : {}),
            ...(b.updatedAt ? {updatedAt: new Date(b.updatedAt)} : {})
        };
        const row = await createPrecio(input);
        return reply.code(201).send({data: row});
    });

    // UPDATE
    app.put<{ Params: IdParams; Body: UpdatePrecioBody }>('/:id', {
        schema: {
            summary: 'Update precio',
            tags: ['precios'],
            body: updatePrecioBody,
            response: {204: {type: 'null'}, 400: badRequestError}
        }
    }, async (req, reply) => {
        const b = req.body;
        const patch = {
            ...('concepto' in b ? {concepto: b.concepto} : {}),
            ...('importe' in b ? {importe: b.importe} : {}),
            ...('moneda' in b ? {moneda: b.moneda} : {}),
            ...('isActive' in b ? {isActive: b.isActive} : {}),
            ...(b.updatedAt ? {updatedAt: new Date(b.updatedAt)} : {})
        };
        await updatePrecio(req.params.id, patch);
        return reply.code(204).send();
    });

    // DELETE
    app.delete<{ Params: IdParams }>('/:id', {
        schema: {
            summary: 'Delete precio',
            tags: ['precios'],
            response: {204: {type: 'null'}}
        }
    }, async (req, reply) => {
        await deletePrecio(req.params.id);
        return noContent(reply);
    });
};

export default preciosRoutes;
