import type { FastifyPluginAsync } from 'fastify';
import { parsePage, parsePageSize } from '../../utils/pagination';
import { listQueryV1, listResponseV1 } from './reservas.schemas';
import { listReservas, createReserva, updateReserva, deleteReserva } from './reservas.repo';
import { ok, noContent } from '../../core/http/reply';

const reservasRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { schema: { summary: 'List reservas (V1 paginación)', querystring: listQueryV1, response: { 200: listResponseV1 } } }, async (req, reply) => {
    const { eventId, page, pageSize, filters, sort } = req.query as Record<string, string>;
    const p = parsePage(page); const ps = parsePageSize(pageSize);
    const { rows, total } = await listReservas({ eventId, page: p, pageSize: ps, filters, sort });
    return ok(reply, rows, { total, page: p, pageSize: ps });
  });

  app.post('/', { schema: { summary: 'Create reserva' } }, async (req, reply) => {
    const id = await createReserva(req.body as any);
    return reply.code(201).send(id);
  });

  app.put('/:id', { schema: { summary: 'Update reserva' } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await updateReserva(id, req.body as any);
    return reply.code(204).send();
  });

  app.delete('/:id', { schema: { summary: 'Delete reserva' } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteReserva(id);
    return noContent(reply);
  });
};

export default reservasRoutes;
