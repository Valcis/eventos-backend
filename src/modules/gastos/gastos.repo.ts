import {getDb} from '../../infra/mongo/client';
import {ObjectId} from 'mongodb';
import {toISO, ensureDate} from '../../utils/dates';

export type GastoDoc = {
    _id?: ObjectId;
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
    createdAt?: Date;
    updatedAt?: Date;
} & Record<string, unknown>;

export type GastoRow = Omit<GastoDoc, '_id' | 'createdAt' | 'updatedAt'> & {
    id: string;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateGastoInput = Omit<GastoDoc, '_id' | 'createdAt' | 'updatedAt'> & {
    createdAt?: Date;
    updatedAt?: Date;
};

export type UpdateGastoPatch = Partial<Pick<GastoDoc,
    'producto' | 'unidadId' | 'cantidad' | 'tipoPrecio' | 'tipoIVA' |
    'precioBase' | 'precioNeto' | 'isPack' | 'unidadesPack' | 'precioUnidad' |
    'pagadorId' | 'tiendaId' | 'notas' | 'comprobado' | 'locked' | 'isActive' | 'updatedAt'
>>;

function serializeRow(doc: GastoDoc): GastoRow {
    return {
        id: doc._id ? String(doc._id) : '',
        eventId: doc.eventId,
        producto: doc.producto,
        ...(doc.unidadId ? {unidadId: doc.unidadId} : {}),
        cantidad: doc.cantidad,
        tipoPrecio: doc.tipoPrecio,
        ...(typeof doc.tipoIVA === 'number' ? {tipoIVA: doc.tipoIVA} : {}),
        precioBase: doc.precioBase,
        precioNeto: doc.precioNeto,
        ...(typeof doc.isPack === 'boolean' ? {isPack: doc.isPack} : {}),
        ...(doc.unidadesPack !== undefined ? {unidadesPack: doc.unidadesPack} : {}),
        ...(doc.precioUnidad !== undefined ? {precioUnidad: doc.precioUnidad} : {}),
        ...(doc.pagadorId !== undefined ? {pagadorId: doc.pagadorId} : {}),
        ...(doc.tiendaId !== undefined ? {tiendaId: doc.tiendaId} : {}),
        ...(doc.notas !== undefined ? {notas: doc.notas} : {}),
        comprobado: doc.comprobado,
        locked: doc.locked,
        isActive: doc.isActive,
        ...(doc.createdAt ? {createdAt: toISO(doc.createdAt) ?? undefined} : {}),
        ...(doc.updatedAt ? {updatedAt: toISO(doc.updatedAt) ?? undefined} : {})
    };
}

export async function listGastos(opts: {
    eventId: string; page: number; pageSize: number; filters?: string; sort?: string;
}): Promise<{ rows: GastoRow[]; total: number }> {
    const db = await getDb();
    const col = db.collection<GastoDoc>('gastos');
    const filter: Record<string, unknown> = {eventId: opts.eventId};
    const total = await col.countDocuments(filter);
    const docs = await col.find(filter).skip(opts.page * opts.pageSize).limit(opts.pageSize).toArray();
    return {rows: docs.map(serializeRow), total};
}

export async function createGasto(doc: CreateGastoInput): Promise<GastoRow> {
    const now = new Date();
    const toInsert: GastoDoc = {
        ...doc,
        eventId: String(doc.eventId),
        createdAt: ensureDate(doc.createdAt) ?? now,
        updatedAt: ensureDate(doc.updatedAt) ?? now
    };
    const db = await getDb();
    const col = db.collection<GastoDoc>('gastos');
    const res = await col.insertOne(toInsert);
    return serializeRow({...toInsert, _id: res.insertedId});
}

export async function updateGasto(id: string, patch: UpdateGastoPatch): Promise<void> {
    const db = await getDb();
    const col = db.collection<GastoDoc>('gastos');
    const objectId = new ObjectId(id);
    const toSet: UpdateGastoPatch = {
        ...('producto' in patch ? {producto: patch.producto} : {}),
        ...('unidadId' in patch ? {unidadId: patch.unidadId} : {}),
        ...('cantidad' in patch ? {cantidad: patch.cantidad} : {}),
        ...('tipoPrecio' in patch ? {tipoPrecio: patch.tipoPrecio} : {}),
        ...('tipoIVA' in patch ? {tipoIVA: patch.tipoIVA} : {}),
        ...('precioBase' in patch ? {precioBase: patch.precioBase} : {}),
        ...('precioNeto' in patch ? {precioNeto: patch.precioNeto} : {}),
        ...('isPack' in patch ? {isPack: patch.isPack} : {}),
        ...('unidadesPack' in patch ? {unidadesPack: patch.unidadesPack} : {}),
        ...('precioUnidad' in patch ? {precioUnidad: patch.precioUnidad} : {}),
        ...('pagadorId' in patch ? {pagadorId: patch.pagadorId} : {}),
        ...('tiendaId' in patch ? {tiendaId: patch.tiendaId} : {}),
        ...('notas' in patch ? {notas: patch.notas} : {}),
        ...('comprobado' in patch ? {comprobado: patch.comprobado} : {}),
        ...('locked' in patch ? {locked: patch.locked} : {}),
        ...('isActive' in patch ? {isActive: patch.isActive} : {}),
        ...(patch.updatedAt ? {updatedAt: ensureDate(patch.updatedAt) ?? new Date()} : {updatedAt: new Date()})
    };
    await col.updateOne({_id: objectId}, {$set: toSet});
}

export async function deleteGasto(id: string): Promise<void> {
    const db = await getDb();
    const col = db.collection<GastoDoc>('gastos');
    await col.deleteOne({_id: new ObjectId(id)});
}
