import { errorSchema } from '../../core/http/schemas';

//
// Types para tipar el body y la respuesta
//
export type SelectorItem = {
    id?: string;
    nombre: string;
    notas?: string;
    requiereReceptor?: boolean; // solo relevante para MetodoPago ("bizum" => true)
    isActive?: boolean;
};

export type Selectores = {
    comercial?: SelectorItem[];
    metodoPago?: SelectorItem[];
    receptor?: SelectorItem[];
    tipoConsumo?: SelectorItem[];
    puntoRecogida?: SelectorItem[];
    [k: string]: SelectorItem[] | undefined;
};

export type Presets = Record<string, unknown>;

export type UpsertEventConfigBody = {
    selectores?: Selectores;
    presets?: Presets;
};

export type EventConfigResponse = {
    data: {
        eventId: string;
        selectores?: Selectores;
        presets?: Presets;
    };
};

//
// Schemas JSON (OpenAPI)
//
export const eventIdParams = {
    type: 'object',
    properties: { eventId: { type: 'string' } },
    required: ['eventId']
} as const;

export const upsertEventConfigBody = {
    type: 'object',
    properties: {
        selectores: {
            type: 'object',
            additionalProperties: true,
            properties: {
                comercial: { type: 'array', items: { type: 'object', additionalProperties: true } },
                metodoPago: { type: 'array', items: { type: 'object', additionalProperties: true } },
                receptor: { type: 'array', items: { type: 'object', additionalProperties: true } },
                tipoConsumo: { type: 'array', items: { type: 'object', additionalProperties: true } },
                puntoRecogida: { type: 'array', items: { type: 'object', additionalProperties: true } }
            }
        },
        presets: { type: 'object', additionalProperties: true }
    },
    additionalProperties: true
} as const;

export const getEventConfigResponse = {
    type: 'object',
    properties: {
        data: { type: 'object', additionalProperties: true }
    },
    required: ['data']
} as const;

//
// Ejemplos
//
export const eventConfigExample: EventConfigResponse = {
    data: {
        eventId: 'evento123',
        selectores: {
            comercial: [
                { id: 'c1', nombre: 'Laura', isActive: true },
                { id: 'c2', nombre: 'Miguel', isActive: true }
            ],
            metodoPago: [
                { id: 'mp1', nombre: 'efectivo', isActive: true },
                { id: 'mp2', nombre: 'tarjeta', isActive: true },
                { id: 'mp3', nombre: 'bizum', isActive: true, requiereReceptor: true } // ← regla
            ],
            receptor: [
                { id: 'r1', nombre: 'Caja Principal', isActive: true },
                { id: 'r2', nombre: 'Puesto 2', isActive: true }
            ],
            tipoConsumo: [
                { id: 'tc1', nombre: 'para_llevar', isActive: true },
                { id: 'tc2', nombre: 'en_local', isActive: true }
            ],
            puntoRecogida: [
                { id: 'p1', nombre: 'Mostrador A', isActive: true },
                { id: 'p2', nombre: 'Mostrador B', isActive: true }
            ]
        },
        presets: {
            columnasVisibles: ['cliente', 'totalPedido', 'pagado'],
            moneda: 'EUR'
        }
    }
};

export const getEventConfigResponseWithExample = {
    ...getEventConfigResponse,
    examples: [eventConfigExample]
} as const;

export const badRequestBizumRule = {
    ...errorSchema,
    examples: [
        {
            ok: false,
            code: 'VALIDATION_BIZUM_REQUIERE_RECEPTOR',
            message: 'Para "bizum", el campo requiereReceptor debe ser true.'
        }
    ]
} as const;
