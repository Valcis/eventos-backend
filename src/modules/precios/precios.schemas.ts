import {errorSchema} from "../../core/http/schemas";

export const listQueryV1 = {
    type: 'object',
    properties: {
        eventId: {type: 'string'},
        page: {type: 'string'},
        pageSize: {type: 'string'},
        q: {type: 'string'},
        expand: {type: 'string', description: 'none | selectores | fmt | selectores,fmt'}
    },
    required: ['eventId']
} as const;

export const listResponseV1 = {
    type: 'object',
    properties: {
        data: {type: 'array', items: {type: 'object', additionalProperties: true}},
        meta: {
            type: 'object',
            properties: {
                total: {type: 'number'},
                page: {type: 'number'},
                pageSize: {type: 'number'}
            },
            required: ['total', 'page', 'pageSize']
        }
    },
    required: ['data', 'meta']
} as const;

export const createPrecioBody = {
    type: 'object',
    required: ['eventId', 'concepto', 'importe', 'moneda', 'isActive'],
    properties: {
        eventId: {type: 'string'},
        concepto: {type: 'string'},
        importe: {type: 'number', minimum: 0},
        moneda: {type: 'string'},
        isActive: {type: 'boolean'},
        createdAt: {type: 'string'}, // ISO opcional
        updatedAt: {type: 'string'}  // ISO opcional
    },
    additionalProperties: true
} as const;

export const updatePrecioBody = {
    type: 'object',
    properties: {
        concepto: {type: 'string'},
        importe: {type: 'number', minimum: 0},
        moneda: {type: 'string'},
        isActive: {type: 'boolean'},
        updatedAt: {type: 'string'}
    },
    additionalProperties: true
} as const;

export type CreatePrecioBody = {
    eventId: string;
    concepto: string;
    importe: number;
    moneda: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UpdatePrecioBody = Partial<{
    concepto: string;
    importe: number;
    moneda: string;
    isActive: boolean;
    updatedAt: string;
}>;

export const precioExample = {
    id: '675f1c2a9e5d2b3a1c0f1234',
    eventId: 'evento123',
    concepto: 'Parrillada',
    importe: 12.5,
    moneda: 'EUR',
    isActive: true,
    createdAt: '2025-10-03T18:02:11.000Z',
    updatedAt: '2025-10-03T18:02:11.000Z'
};

export const createPrecioResponse = {
    type: 'object',
    properties: {data: {type: 'object', additionalProperties: true}},
    required: ['data'],
    examples: [{data: precioExample}]
} as const;

export const listResponseV1WithExample = {
    ...listResponseV1,
    examples: [{
        data: [precioExample],
        meta: {total: 1, page: 0, pageSize: 20}
    }]
} as const;

export const badRequestError = {
    ...errorSchema,
    examples: [{ok: false, code: 'EVENT_ID_REQUIRED', message: 'eventId es obligatorio'}]
} as const;

