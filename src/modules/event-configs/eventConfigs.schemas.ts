export const getEventConfigResponseSchema = {
  type: 'object',
  properties: {
    data: { type: 'object', additionalProperties: true },
    meta: { type: 'object', additionalProperties: true }
  },
  required: ['data']
} as const;

export const putEventConfigBodySchema = {
  type: 'object',
  additionalProperties: true
} as const;
