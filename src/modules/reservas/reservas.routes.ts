import type { FastifyPluginAsync } from 'fastify';
import { parsePage, parsePageSize } from '../../utils/pagination';
import {
    listQueryV1,
    listResponseV1WithExample,
    createReservaBody,
    updateReservaBody,
    badRequestError,
    type CreateReservaBody,
    type UpdateReservaBody
} from './reservas.schemas';
import {
    listReservas,
    createReserva,
    updateReserva,
    deleteReserva,
    type ReservaRow
} from './reservas.repo';
import { ok, noContent } from '../../core/http/reply';

type ListReply = { data: ReservaRow[]; meta: { total: number; page: number; pageSize: number } };
type CreateReply = { data: ReservaRow };
type IdParams = { id: string };

const reservasRoutes: FastifyPluginAsync = async (app) => {
    app.get<{ Reply: ListReply }>('/', {
        schema: {
            summary: 'List reservas (V1 paginación)',
            tags: ['reservas'],
            querystring: listQueryV1,
            response: { 200: listResponseV1WithExample, 400: badRequestError }
        }
    }, async (req, reply) => {
        const { eventId, page, pageSize, filters, sort } = req.query as unknown as {
            eventId: string; page?: string; pageSize?: string; filters?: string; sort?: string;
        };
        const p = parsePage(page);
        const ps = parsePageSize(pageSize);
        const { rows, total } = await listReservas({ eventId, page: p, pageSize: ps, filters, sort });
        return ok(reply, rows, { total, page: p, pageSize: ps });
    });

    app.post<{ Body: CreateReservaBody; Reply: CreateReply }>('/', {
        schema: {
            summary: 'Create reserva',
            tags: ['reservas'],
            body: createReservaBody,
            response: { 201: { type: 'object', properties: { data: { type: 'object', additionalProperties: true } }, required: ['data'] }, 400: badRequestError }
        }
    }, async (req, reply) => {
        const b = req.body;
        const input = {
            eventId: b.eventId,
            cliente: b.cliente,
            ...(b.parrilladas !== undefined ? { parrilladas: b.parrilladas } : {}),
            ...(b.picarones !== undefined ? { picarones: b.picarones } : {}),
            ...(b.metodoPagoId ? { metodoPagoId: b.metodoPagoId } : {}),
            ...(b.receptorId ? { receptorId: b.receptorId } : {}),
            ...(b.tipoConsumoId ? { tipoConsumoId: b.tipoConsumoId } : {}),
            ...(b.comercialId ? { comercialId: b.comercialId } : {}),
            totalPedido: b.totalPedido,
            pagado: b.pagado,
            comprobado: b.comprobado,
            locked: b.locked,
            ...(b.puntoRecogidaId !== undefined ? { puntoRecogidaId: b.puntoRecogidaId } : {}),
            isActive: b.isActive,
            ...(b.createdAt ? { createdAt: new Date(b.createdAt) } : {}),
            ...(b.updatedAt ? { updatedAt: new Date(b.updatedAt) } : {})
        };
        const row = await createReserva(input);
        return reply.code(201).send({ data: row });
    });

    app.put<{ Params: IdParams; Body: UpdateReservaBody }>('/:id', {
        schema: {
            summary: 'Update reserva',
            tags: ['reservas'],
            body: updateReservaBody,
            response: { 204: { type: 'null' }, 400: badRequestError }
        }
    }, async (req, reply) => {
        const b = req.body;
        const patch = {
            ...('cliente' in b ? { cliente: b.cliente } : {}),
            ...('parrilladas' in b ? { parrilladas: b.parrilladas } : {}),
            ...('picarones' in b ? { picarones: b.picarones } : {}),
            ...('metodoPagoId' in b ? { metodoPagoId: b.metodoPagoId } : {}),
            ...('receptorId' in b ? { receptorId: b.receptorId } : {}),
            ...('tipoConsumoId' in b ? { tipoConsumoId: b.tipoConsumoId } : {}),
            ...('comercialId' in b ? { comercialId: b.comercialId } : {}),
            ...('totalPedido' in b ? { totalPedido: b.totalPedido } : {}),
            ...('pagado' in b ? { pagado: b.pagado } : {}),
            ...('comprobado' in b ? { comprobado: b.comprobado } : {}),
            ...('locked' in b ? { locked: b.locked } : {}),
            ...('puntoRecogidaId' in b ? { puntoRecogidaId: b.puntoRecogidaId } : {}),
            ...('isActive' in b ? { isActive: b.isActive } : {}),
            ...(b.updatedAt ? { updatedAt: new Date(b.updatedAt) } : {})
        };
        await updateReserva(req.params.id, patch);
        return reply.code(204).send();
    });

    app.delete<{ Params: IdParams }>('/:id', {
        schema: {
            summary: 'Delete reserva',
            tags: ['reservas'],
            response: { 204: { type: 'null' } }
        }
    }, async (req, reply) => {
        await deleteReserva(req.params.id);
        return noContent(reply);
    });
};

export default reservasRoutes;
