import type { FastifyPluginAsync } from 'fastify';
import { getEventConfig, upsertEventConfig } from './eventConfigs.repo';
import { getEventConfigResponseSchema, upsertEventConfigParams, upsertEventConfigBody } from './eventConfigs.schemas';

type Json = Record<string, unknown>;

function isObject(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null && !Array.isArray(x); }
function isArray(x: unknown): x is unknown[] { return Array.isArray(x); }

function validateMetodoPagoBizum(patch: Json): void {
  const selectores = isObject((patch as any).selectores) ? (patch as any).selectores as Record<string, unknown> : null;
  const metodoPago = selectores && isArray((selectores as any).metodoPago) ? (selectores as any).metodoPago as unknown[] : null;
  if (!metodoPago) return;
  for (const raw of metodoPago) {
    if (!isObject(raw)) continue;
    const nombre = String((raw as any).nombre ?? '').trim().toLowerCase();
    const requiere = (raw as any).requiereReceptor;
    if (nombre === 'bizum' && requiere !== true) {
      const err = new Error('Para "bizum", el campo requiereReceptor debe ser true.');
      (err as any).statusCode = 400;
      (err as any).code = 'VALIDATION_BIZUM_REQUIERE_RECEPTOR';
      throw err;
    }
  }
}

const eventConfigsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:eventId', {
    schema: {
      summary: 'Get event config',
      params: upsertEventConfigParams,
      response: { 200: getEventConfigResponseSchema }
    }
  }, async (req, reply) => {
    const { eventId } = req.params as { eventId: string };
    const data = await getEventConfig(eventId);
    return reply.code(200).send({ data });
  });

  app.put('/:eventId', {
    schema: {
      summary: 'Upsert event config',
      params: upsertEventConfigParams,
      body: upsertEventConfigBody,
      response: { 204: { type: 'null' } }
    }
  }, async (req, reply) => {
    const { eventId } = req.params as { eventId: string };
    const patch = req.body as Json;
    validateMetodoPagoBizum(patch);
    await upsertEventConfig(eventId, patch);
    return reply.code(204).send();
  });
};

export default eventConfigsRoutes;
