export const errorSchema = {
    type: 'object',
    properties: {
        ok: { type: 'boolean', const: false },
        code: { type: 'string' },
        message: { type: 'string' }
    },
    required: ['ok', 'message'],
    additionalProperties: true
} as const;
