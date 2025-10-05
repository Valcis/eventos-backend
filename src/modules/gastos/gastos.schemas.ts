import {errorSchema} from '../../core/http/schemas';

export const listQueryV1 = {
    type: 'object',
    properties: {
        eventId: {type: 'string'},
        page: {type: 'string'},
        pageSize: {type: 'string'},
        filters: {type: 'string'},
        sort: {type: 'string'},
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
    additionalProperties: false,
    required: ['data', 'meta']
} as const;

export const createGastoBody = {
    type: 'object',
    required: [
        'eventId', 'producto', 'cantidad', 'tipoPrecio', 'precioBase', 'precioNeto',
        'comprobado', 'locked', 'isActive'
    ],
    properties: {
        eventId: {type: 'string'},
        producto: {type: 'string'},
        unidadId: {type: 'string'},
        cantidad: {type: 'number', minimum: 0},
        tipoPrecio: {type: 'string', enum: ['con IVA', 'sin IVA']},
        tipoIVA: {type: 'number', minimum: 0},
        precioBase: {type: 'number', minimum: 0},
        precioNeto: {type: 'number', minimum: 0},
        isPack: {type: 'boolean'},
        unidadesPack: {type: ['integer', 'null'], minimum: 1},
        precioUnidad: {type: ['number', 'null'], minimum: 0},
        pagadorId: {type: ['string', 'null']},
        tiendaId: {type: ['string', 'null']},
        notas: {type: ['string', 'null']},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        isActive: {type: 'boolean'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
    },
    additionalProperties: true
} as const;

export const updateGastoBody = {
    type: 'object',
    properties: {
        producto: {type: 'string'},
        unidadId: {type: 'string'},
        cantidad: {type: 'number', minimum: 0},
        tipoPrecio: {type: 'string', enum: ['con IVA', 'sin IVA']},
        tipoIVA: {type: 'number', minimum: 0},
        precioBase: {type: 'number', minimum: 0},
        precioNeto: {type: 'number', minimum: 0},
        isPack: {type: 'boolean'},
        unidadesPack: {type: ['integer', 'null'], minimum: 1},
        precioUnidad: {type: ['number', 'null'], minimum: 0},
        pagadorId: {type: ['string', 'null']},
        tiendaId: {type: ['string', 'null']},
        notas: {type: ['string', 'null']},
        comprobado: {type: 'boolean'},
        locked: {type: 'boolean'},
        isActive: {type: 'boolean'},
        updatedAt: {type: 'string'}
    },
    additionalProperties: true
} as const;

// -------- Types de request bodies
export type CreateGastoBody = {
    eventId: string;
    producto: string;
    unidadId?: string;
    cantidad: number;
    tipoPrecio: 'con IVA' | 'sin IVA';
    tipoIVA?: number;
    precioBase: number;
    precioNeto: number;
    isPack?: boolean;
    unidadesPack?: number | null;
    precioUnidad?: number | null;
    pagadorId?: string | null;
    tiendaId?: string | null;
    notas?: string | null;
    comprobado: boolean;
    locked: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UpdateGastoBody = Partial<Omit<CreateGastoBody, 'eventId' | 'createdAt'>> & {
    updatedAt?: string;
};

// -------- OpenAPI: ejemplos y errores
export const gastoExample = {
    id: '675f1c2a9e5d2b3a1c0f99aa',
    eventId: 'evento123',
    producto: 'Carbón',
    cantidad: 2,
    tipoPrecio: 'con IVA',
    tipoIVA: 21,
    precioBase: 10,
    precioNeto: 12.1,
    comprobado: false,
    locked: false,
    isActive: true,
    createdAt: '2025-10-03T18:02:11.000Z',
    updatedAt: '2025-10-03T18:02:11.000Z'
};

export const gastoRow = {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'eventId', 'concepto', 'importe', 'categoria'],
    properties: {
        id: {type: 'string'},
        eventId: {type: 'string'},
        concepto: {type: 'string'},
        importe: {type: 'number', minimum: 0},
        categoria: {type: 'string'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
    }
} as const;

export const createGastoResponse = {
    type: 'object',
    required: ['data'],
    additionalProperties: false,
    properties: {data: gastoRow},
    examples: [{data: gastoExample}]
} as const;

export const listResponseV1WithExample = {
    ...listResponseV1,
    examples: [{data: [gastoExample], meta: {total: 1, page: 0, pageSize: 20}}]
} as const;

export const badRequestError = {
    ...errorSchema,
    examples: [{ok: false, code: 'EVENT_ID_REQUIRED', message: 'eventId es obligatorio'}]
} as const;
