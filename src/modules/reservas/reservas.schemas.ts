import {errorSchema} from '../../core/http/schemas';

/** Query & List (V1) */
export const listQueryV1 = {
    type: 'object',
    properties: {
        eventId: {type: 'string'},
        page: {type: 'string'},
        pageSize: {type: 'string'},
        filters: {type: 'string'},
        sort: {type: 'string'},
        q: {type: 'string'},
        expand: {type: 'string', description: 'none | selectores | fmt | selectores,fmt'}
    },
    required: ['eventId'],
    additionalProperties: false
} as const;

/** Row (respuesta) — modelo actual */
export const reservaRow = {
    type: 'object',
    additionalProperties: false,
    required: [
        'id', 'eventId', 'cliente', 'totalPedido', 'pagado', 'comprobado', 'locked',
        'isActive', 'createdAt', 'updatedAt'
    ],
    properties: {
        id: {type: 'string'},
        eventId: {type: 'string'},
        cliente: {type: 'string'},
        parrilladas: {type: 'number', minimum: 0},
        picarones: {type: 'number', minimum: 0},
        metodoPagoId: {type: 'string'},
        receptorId: {type: 'string'},
        tipoConsumoId: {type: 'string'},
        comercialId: {type: 'string'},
        puntoRecogidaId: {type: 'string'},
        totalPedido: {type: 'number', minimum: 0},
        pagado: {type: 'boolean'},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        isActive: {type: 'boolean'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
    }
} as const;

/** List response */
export const listResponseV1 = {
    type: 'object',
    additionalProperties: false,
    properties: {
        data: {type: 'array', items: reservaRow},
        meta: {
            type: 'object',
            additionalProperties: false,
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

/** Create (body) */
export const createReservaBody = {
    type: 'object',
    additionalProperties: false,
    required: [
        'eventId', 'cliente', 'totalPedido', 'pagado', 'comprobado', 'locked', 'isActive'
    ],
    properties: {
        eventId: {type: 'string'},
        cliente: {type: 'string'},
        parrilladas: {type: 'number', minimum: 0},
        picarones: {type: 'number', minimum: 0},
        metodoPagoId: {type: 'string'},
        receptorId: {type: 'string'},
        tipoConsumoId: {type: 'string'},
        comercialId: {type: 'string'},
        puntoRecogidaId: {type: 'string'},
        totalPedido: {type: 'number', minimum: 0},
        pagado: {type: 'boolean'},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        isActive: {type: 'boolean'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
    }
} as const;

/** Update (body) — parcial, sin eventId */
export const updateReservaBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        cliente: {type: 'string'},
        parrilladas: {type: 'number', minimum: 0},
        picarones: {type: 'number', minimum: 0},
        metodoPagoId: {type: 'string'},
        receptorId: {type: 'string'},
        tipoConsumoId: {type: 'string'},
        comercialId: {type: 'string'},
        puntoRecogidaId: {type: 'string'},
        totalPedido: {type: 'number', minimum: 0},
        pagado: {type: 'boolean'},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        isActive: {type: 'boolean'},
        updatedAt: {type: 'string'}
    }
} as const;

/** Example */
export const reservaExample = {
    id: 'r-01',
    eventId: 'evento123',
    cliente: 'Ana Gómez',
    parrilladas: 3,
    picarones: 2,
    metodoPagoId: 'mp-bizum',
    receptorId: 'u-99',
    tipoConsumoId: 'takeaway',
    comercialId: 'c-001',
    puntoRecogidaId: 'p-01',
    totalPedido: 65.5,
    pagado: true,
    comprobado: true,
    locked: false,
    isActive: true,
    createdAt: '2025-10-03T18:02:11.000Z',
    updatedAt: '2025-10-03T18:02:11.000Z'
};

export const createReservaResponse = {
    type: 'object',
    additionalProperties: false,
    properties: {data: reservaRow},
    required: ['data'],
    examples: [{data: reservaExample}]
} as const;

export const listResponseV1WithExample = {
    ...listResponseV1,
    examples: [{data: [reservaExample], meta: {total: 1, page: 0, pageSize: 20}}]
} as const;

/** Errores */
export const badRequestError = {
    ...errorSchema,
    examples: [{ok: false, code: 'EVENT_ID_REQUIRED', message: 'eventId es obligatorio'}]
} as const;

/** Tipos (opcional) */
export type CreateReservaBody = {
    eventId: string;
    cliente: string;
    parrilladas?: number;
    picarones?: number;
    metodoPagoId?: string;
    receptorId?: string;
    tipoConsumoId?: string;
    comercialId?: string;
    puntoRecogidaId?: string;
    totalPedido: number;
    pagado: boolean;
    comprobado: boolean;
    locked: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UpdateReservaBody = Partial<Omit<CreateReservaBody, 'eventId' | 'createdAt'>> & {
    updatedAt?: string;
};
