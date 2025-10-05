// Request/response schemas (loose for now)
export const getEventConfigResponseSchema = {
  type: 'object',
  properties: {
    data: { type: 'object', additionalProperties: true }
  },
  required: ['data']
} as const;

export const upsertEventConfigParams = {
  type: 'object',
  properties: { eventId: { type: 'string' } },
  required: ['eventId']
} as const;

export const upsertEventConfigBody = {
  type: 'object',
  additionalProperties: true
} as const;
