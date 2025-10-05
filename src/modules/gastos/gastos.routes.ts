import type { FastifyPluginAsync } from 'fastify';
import { parsePage, parsePageSize } from '../../utils/pagination';
import { listQueryV1, listResponseV1 } from './gastos.schemas';
import { listGastos, createGasto, updateGasto, deleteGasto } from './gastos.repo';
import { ok, noContent } from '../../core/http/reply';

const gastosRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { schema: { summary: 'List gastos (V1 paginación)', querystring: listQueryV1, response: { 200: listResponseV1 } } }, async (req, reply) => {
    const { eventId, page, pageSize, filters, sort } = req.query as Record<string, string>;
    const p = parsePage(page); const ps = parsePageSize(pageSize);
    const { rows, total } = await listGastos({ eventId, page: p, pageSize: ps, filters, sort });
    return ok(reply, rows, { total, page: p, pageSize: ps });
  });

  app.post('/', { schema: { summary: 'Create gasto' } }, async (req, reply) => {
    const id = await createGasto(req.body as any);
    return reply.code(201).send(id);
  });

  app.put('/:id', { schema: { summary: 'Update gasto' } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await updateGasto(id, req.body as any);
    return reply.code(204).send();
  });

  app.delete('/:id', { schema: { summary: 'Delete gasto' } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteGasto(id);
    return noContent(reply);
  });
};

export default gastosRoutes;
