import type {FastifyPluginAsync} from 'fastify';
import {parsePage, parsePageSize} from '../../utils/pagination';
import {
    listQueryV1,
    listResponseV1WithExample,
    createGastoBody,
    updateGastoBody,
    badRequestError,
    type CreateGastoBody,
    type UpdateGastoBody
} from './gastos.schemas';
import {
    listGastos,
    createGasto,
    updateGasto,
    deleteGasto,
    type GastoRow
} from './gastos.repo';
import {ok, noContent} from '../../core/http/reply';

type ListReply = { data: GastoRow[]; meta: { total: number; page: number; pageSize: number } };
type CreateReply = { data: GastoRow };
type IdParams = { id: string };

const gastosRoutes: FastifyPluginAsync = async (app) => {
    app.get<{ Reply: ListReply }>('/', {
        schema: {
            summary: 'List gastos (V1 paginación)',
            tags: ['gastos'],
            querystring: listQueryV1,
            response: {200: listResponseV1WithExample, 400: badRequestError}
        }
    }, async (req, reply) => {
        const {eventId, page, pageSize, filters, sort} = req.query as unknown as {
            eventId: string; page?: string; pageSize?: string; filters?: string; sort?: string;
        };
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        const {rows, total} = await listGastos({eventId, page: p, pageSize: ps, filters, sort});
        return ok(reply, rows, {total, page: p, pageSize: ps});
    });

    app.post<{ Body: CreateGastoBody; Reply: CreateReply }>('/', {
        schema: {
            summary: 'Create gasto',
            tags: ['gastos'],
            body: createGastoBody,
            response: {
                201: {
                    type: 'object',
                    properties: {data: {type: 'object', additionalProperties: true}},
                    required: ['data']
                }, 400: badRequestError
            }
        }
    }, async (req, reply) => {
        const b = req.body;
        const input = {
            eventId: b.eventId,
            producto: b.producto,
            ...(b.unidadId ? {unidadId: b.unidadId} : {}),
            cantidad: b.cantidad,
            tipoPrecio: b.tipoPrecio,
            ...(typeof b.tipoIVA === 'number' ? {tipoIVA: b.tipoIVA} : {}),
            precioBase: b.precioBase,
            precioNeto: b.precioNeto,
            ...(typeof b.isPack === 'boolean' ? {isPack: b.isPack} : {}),
            ...(b.unidadesPack !== undefined ? {unidadesPack: b.unidadesPack} : {}),
            ...(b.precioUnidad !== undefined ? {precioUnidad: b.precioUnidad} : {}),
            ...(b.pagadorId !== undefined ? {pagadorId: b.pagadorId} : {}),
            ...(b.tiendaId !== undefined ? {tiendaId: b.tiendaId} : {}),
            ...(b.notas !== undefined ? {notas: b.notas} : {}),
            comprobado: b.comprobado,
            locked: b.locked,
            isActive: b.isActive,
            ...(b.createdAt ? {createdAt: new Date(b.createdAt)} : {}),
            ...(b.updatedAt ? {updatedAt: new Date(b.updatedAt)} : {})
        };
        const row = await createGasto(input);
        return reply.code(201).send({data: row});
    });

    app.put<{ Params: IdParams; Body: UpdateGastoBody }>('/:id', {
        schema: {
            summary: 'Update gasto',
            tags: ['gastos'],
            body: updateGastoBody,
            response: {204: {type: 'null'}, 400: badRequestError}
        }
    }, async (req, reply) => {
        const b = req.body;
        const patch = {
            ...('producto' in b ? {producto: b.producto} : {}),
            ...('unidadId' in b ? {unidadId: b.unidadId} : {}),
            ...('cantidad' in b ? {cantidad: b.cantidad} : {}),
            ...('tipoPrecio' in b ? {tipoPrecio: b.tipoPrecio} : {}),
            ...('tipoIVA' in b ? {tipoIVA: b.tipoIVA} : {}),
            ...('precioBase' in b ? {precioBase: b.precioBase} : {}),
            ...('precioNeto' in b ? {precioNeto: b.precioNeto} : {}),
            ...('isPack' in b ? {isPack: b.isPack} : {}),
            ...('unidadesPack' in b ? {unidadesPack: b.unidadesPack} : {}),
            ...('precioUnidad' in b ? {precioUnidad: b.precioUnidad} : {}),
            ...('pagadorId' in b ? {pagadorId: b.pagadorId} : {}),
            ...('tiendaId' in b ? {tiendaId: b.tiendaId} : {}),
            ...('notas' in b ? {notas: b.notas} : {}),
            ...('comprobado' in b ? {comprobado: b.comprobado} : {}),
            ...('locked' in b ? {locked: b.locked} : {}),
            ...('isActive' in b ? {isActive: b.isActive} : {}),
            ...(b.updatedAt ? {updatedAt: new Date(b.updatedAt)} : {})
        };
        await updateGasto(req.params.id, patch);
        return reply.code(204).send();
    });

    app.delete<{ Params: IdParams }>('/:id', {
        schema: {
            summary: 'Delete gasto',
            tags: ['gastos'],
            response: {204: {type: 'null'}}
        }
    }, async (req, reply) => {
        await deleteGasto(req.params.id);
        return noContent(reply);
    });
};

export default gastosRoutes;
