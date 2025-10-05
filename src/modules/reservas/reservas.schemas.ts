import {errorSchema} from '../../core/http/schemas';

export const listQueryV1 = {
    type: 'object',
    properties: {
        eventId: {type: 'string'},
        page: {type: 'string'},
        pageSize: {type: 'string'},
        filters: {type: 'string'},
        sort: {type: 'string'}
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

export const createReservaBody = {
    type: 'object',
    required: ['eventId', 'cliente', 'totalPedido', 'pagado', 'comprobado', 'locked', 'isActive'],
    properties: {
        eventId: {type: 'string'},
        cliente: {type: 'string'},
        parrilladas: {type: 'integer', minimum: 0},
        picarones: {type: 'integer', minimum: 0},
        metodoPagoId: {type: 'string'},
        receptorId: {type: 'string'},
        tipoConsumoId: {type: 'string'},
        comercialId: {type: 'string'},
        totalPedido: {type: 'number', minimum: 0},
        pagado: {type: 'boolean'},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        puntoRecogidaId: {type: ['string', 'null']},
        isActive: {type: 'boolean'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
    },
    additionalProperties: true
} as const;

export const updateReservaBody = {
    type: 'object',
    properties: {
        cliente: {type: 'string'},
        parrilladas: {type: 'integer', minimum: 0},
        picarones: {type: 'integer', minimum: 0},
        metodoPagoId: {type: 'string'},
        receptorId: {type: 'string'},
        tipoConsumoId: {type: 'string'},
        comercialId: {type: 'string'},
        totalPedido: {type: 'number', minimum: 0},
        pagado: {type: 'boolean'},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        puntoRecogidaId: {type: ['string', 'null']},
        isActive: {type: 'boolean'},
        updatedAt: {type: 'string'}
    },
    additionalProperties: true
} as const;

// -------- Types de request bodies
export type CreateReservaBody = {
    eventId: string;
    cliente: string;
    parrilladas?: number;
    picarones?: number;
    metodoPagoId?: string;
    receptorId?: string;
    tipoConsumoId?: string;
    comercialId?: string;
    totalPedido: number;
    pagado: boolean;
    comprobado: boolean;
    locked: boolean;
    puntoRecogidaId?: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UpdateReservaBody = Partial<Omit<CreateReservaBody, 'eventId' | 'createdAt'>> & {
    updatedAt?: string;
};

// -------- OpenAPI: ejemplos y errores
export const reservaExample = {
    id: '675f1c2a9e5d2b3a1c0fabcd',
    eventId: 'evento123',
    cliente: 'Juan Pérez',
    parrilladas: 1,
    picarones: 0,
    metodoPagoId: 'bizum',
    receptorId: 'receptor-01',
    tipoConsumoId: 'para_llevar',
    comercialId: 'comercial-02',
    totalPedido: 24.0,
    pagado: true,
    comprobado: false,
    locked: false,
    puntoRecogidaId: 'p1',
    isActive: true,
    createdAt: '2025-10-03T18:02:11.000Z',
    updatedAt: '2025-10-03T18:02:11.000Z'
};

export const createReservaResponse = {
    type: 'object',
    properties: {data: {type: 'object', additionalProperties: true}},
    required: ['data'],
    examples: [{data: reservaExample}]
} as const;

export const listResponseV1WithExample = {
    ...listResponseV1,
    examples: [{data: [reservaExample], meta: {total: 1, page: 0, pageSize: 20}}]
} as const;

export const badRequestError = {
    ...errorSchema,
    examples: [{ok: false, code: 'EVENT_ID_REQUIRED', message: 'eventId es obligatorio'}]
} as const;
