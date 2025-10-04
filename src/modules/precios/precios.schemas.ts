export const listPreciosQuerySchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    page: { type: 'string' },
    pageSize: { type: 'string' },
    q: { type: 'string' }
  },
  required: ['eventId']
} as const;

export const listPreciosResponseSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: { type: 'object', additionalProperties: true } },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' }
      },
      required: ['total','page','pageSize']
    }
  },
  required: ['data','meta']
} as const;
