import { errorSchema } from '../../core/http/schemas';

/** Query & List (V1) */
export const listQueryV1 = {
    type: 'object',
    properties: {
        eventId: { type: 'string' },
        page: { type: 'string' },
        pageSize: { type: 'string' },
        filters: { type: 'string' },
        sort: { type: 'string' },
        q: { type: 'string' },
        expand: { type: 'string', description: 'none | selectores | fmt | selectores,fmt' }
    },
    required: ['eventId'],
    additionalProperties: false
} as const;

/** Row (respuesta) — modelo actual */
export const gastoRow = {
    type: 'object',
    additionalProperties: false,
    required: [
        'id','eventId','producto','cantidad','tipoPrecio','precioBase','precioNeto',
        'comprobado','locked','isActive','createdAt','updatedAt'
    ],
    properties: {
        id: { type: 'string' },
        eventId: { type: 'string' },
        // núcleo de costo
        producto: { type: 'string' },
        unidadId: { type: 'string' },
        cantidad: { type: 'number', minimum: 0 },
        tipoPrecio: { type: 'string', enum: ['con IVA','sin IVA'] },
        tipoIVA: { type: 'number', minimum: 0 },
        precioBase: { type: 'number' },
        precioNeto: { type: 'number' },
        isPack: { type: 'boolean' },
        unidadesPack: { type: 'number', minimum: 1 },
        precioUnidad: { type: 'number', minimum: 0 },
        // relaciones/metadata
        pagadorId: { type: 'string' },
        tiendaId: { type: 'string' },
        notas: { type: 'string' },
        // flags
        comprobado: { type: 'boolean' },
        locked: { type: 'boolean' },
        isActive: { type: 'boolean' },
        // timestamps
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
    }
} as const;

/** List response */
export const listResponseV1 = {
    type: 'object',
    additionalProperties: false,
    properties: {
        data: { type: 'array', items: gastoRow },
        meta: {
            type: 'object',
            additionalProperties: false,
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

/** Create (body) — campos mínimos + opcionales */
export const createGastoBody = {
    type: 'object',
    additionalProperties: false,
    required: [
        'eventId','producto','cantidad','tipoPrecio','precioBase','precioNeto',
        'comprobado','locked','isActive'
    ],
    properties: {
        eventId: { type: 'string' },
        producto: { type: 'string' },
        unidadId: { type: 'string' },
        cantidad: { type: 'number', minimum: 0 },
        tipoPrecio: { type: 'string', enum: ['con IVA','sin IVA'] },
        tipoIVA: { type: 'number', minimum: 0 },
        precioBase: { type: 'number' },
        precioNeto: { type: 'number' },
        isPack: { type: 'boolean' },
        unidadesPack: { type: 'number', minimum: 1 },
        precioUnidad: { type: 'number', minimum: 0 },
        pagadorId: { type: 'string' },
        tiendaId: { type: 'string' },
        notas: { type: 'string' },
        comprobado: { type: 'boolean' },
        locked: { type: 'boolean' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
    }
} as const;

/** Update (body) — PATCH/PUT parcial, sin eventId */
export const updateGastoBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        producto: { type: 'string' },
        unidadId: { type: 'string' },
        cantidad: { type: 'number', minimum: 0 },
        tipoPrecio: { type: 'string', enum: ['con IVA','sin IVA'] },
        tipoIVA: { type: 'number', minimum: 0 },
        precioBase: { type: 'number' },
        precioNeto: { type: 'number' },
        isPack: { type: 'boolean' },
        unidadesPack: { type: 'number', minimum: 1 },
        precioUnidad: { type: 'number', minimum: 0 },
        pagadorId: { type: 'string' },
        tiendaId: { type: 'string' },
        notas: { type: 'string' },
        comprobado: { type: 'boolean' },
        locked: { type: 'boolean' },
        isActive: { type: 'boolean' },
        updatedAt: { type: 'string' }
    }
} as const;

export const gastoExample = {
    id: 'g-01',
    eventId: 'evento123',
    producto: 'Carbón vegetal 5kg',
    cantidad: 2,
    tipoPrecio: 'con IVA',
    tipoIVA: 21,
    precioBase: 10.0,
    precioNeto: 12.1,
    isPack: false,
    unidadesPack: 1,
    precioUnidad: 12.1,
    pagadorId: 'u-77',
    tiendaId: 't-mercadona',
    notas: 'Compra sábado',
    comprobado: true,
    locked: false,
    isActive: true,
    createdAt: '2025-10-03T18:02:11.000Z',
    updatedAt: '2025-10-03T18:02:11.000Z'
};

export const createGastoResponse = {
    type: 'object',
    additionalProperties: false,
    properties: { data: gastoRow },
    required: ['data'],
    examples: [{ data: gastoExample }]
} as const;

export const listResponseV1WithExample = {
    ...listResponseV1,
    examples: [{ data: [gastoExample], meta: { total: 1, page: 0, pageSize: 20 } }]
} as const;

/** Errores */
export const badRequestError = {
    ...errorSchema,
    examples: [{ ok: false, code: 'EVENT_ID_REQUIRED', message: 'eventId es obligatorio' }]
} as const;

/** Tipos (opcional) */
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
    unidadesPack?: number;
    precioUnidad?: number;
    pagadorId?: string;
    tiendaId?: string;
    notas?: string;
    comprobado: boolean;
    locked: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UpdateGastoBody = Partial<Omit<CreateGastoBody, 'eventId'|'createdAt'>> & {
    updatedAt?: string;
};
