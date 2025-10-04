export const listGastosQuerySchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    page: { type: 'string' },
    pageSize: { type: 'string' },
    filters: { type: 'string' },
    sort: { type: 'string' }
  },
  required: ['eventId']
} as const;

export const listGastosResponseSchema = {
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
