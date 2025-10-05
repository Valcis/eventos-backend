import { getDb } from '../../infra/mongo/client';
import { ObjectId } from 'mongodb';
import { toISO, ensureDate } from '../../utils/dates';

export type PrecioDoc = {
    _id?: ObjectId;
    eventId: string;
    concepto: string;
    importe: number;
    moneda: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
} & Record<string, unknown>;

export type PrecioRow = Omit<PrecioDoc, '_id' | 'createdAt' | 'updatedAt'> & {
    id: string;
    createdAt?: string;
    updatedAt?: string;
};

export type CreatePrecioInput = {
    eventId: string;
    concepto: string;
    importe: number;
    moneda: string;
    isActive: boolean;
    createdAt?: Date; // si se omite, lo rellenamos a now
    updatedAt?: Date; // si se omite, lo rellenamos a now
};

export type UpdatePrecioPatch = Partial<Pick<PrecioDoc,
    'concepto' | 'importe' | 'moneda' | 'isActive' | 'updatedAt'
>>;

function serializeRow(doc: PrecioDoc): PrecioRow {
    return {
        id: doc._id ? String(doc._id) : '',
        eventId: String(doc.eventId),
        concepto: String(doc.concepto),
        importe: Number(doc.importe),
        moneda: String(doc.moneda),
        isActive: Boolean(doc.isActive),
        ...(doc.createdAt ? { createdAt: toISO(doc.createdAt) ?? undefined } : {}),
        ...(doc.updatedAt ? { updatedAt: toISO(doc.updatedAt) ?? undefined } : {})
    };
}

export async function listPrecios(opts: {
    eventId: string; page: number; pageSize: number; q?: string;
}): Promise<{ rows: PrecioRow[]; total: number }> {
    const db = await getDb();
    const col = db.collection<PrecioDoc>('precios');
    const filter: Record<string, unknown> = { eventId: opts.eventId };
    const total = await col.countDocuments(filter);
    const docs = await col.find(filter).skip(opts.page * opts.pageSize).limit(opts.pageSize).toArray();
    return { rows: docs.map(serializeRow), total };
}

export async function createPrecio(doc: CreatePrecioInput): Promise<PrecioRow> {
    const now = new Date();
    const toInsert: PrecioDoc = {
        ...doc,
        eventId: String(doc.eventId),
        createdAt: ensureDate(doc.createdAt) ?? now,
        updatedAt: ensureDate(doc.updatedAt) ?? now
    };
    const db = await getDb();
    const col = db.collection<PrecioDoc>('precios');
    const res = await col.insertOne(toInsert);
    return serializeRow({ ...toInsert, _id: res.insertedId });
}

export async function updatePrecio(id: string, patch: UpdatePrecioPatch): Promise<void> {
    const db = await getDb();
    const col = db.collection<PrecioDoc>('precios');
    const objectId = new ObjectId(id);
    const toSet: UpdatePrecioPatch = {
        ...('concepto' in patch ? { concepto: patch.concepto } : {}),
        ...('importe' in patch ? { importe: patch.importe } : {}),
        ...('moneda' in patch ? { moneda: patch.moneda } : {}),
        ...('isActive' in patch ? { isActive: patch.isActive } : {}),
        ...(patch.updatedAt ? { updatedAt: ensureDate(patch.updatedAt) ?? new Date() } : { updatedAt: new Date() })
    };
    await col.updateOne({ _id: objectId }, { $set: toSet });
}

export async function deletePrecio(id: string): Promise<void> {
    const db = await getDb();
    const col = db.collection<PrecioDoc>('precios');
    await col.deleteOne({ _id: new ObjectId(id) });
}
