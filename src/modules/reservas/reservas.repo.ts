import { getDb } from '../../infra/mongo/client';
import { ObjectId } from 'mongodb';
import { toISO, ensureDate } from '../../utils/dates';

export type ReservaDoc = {
    _id?: ObjectId;
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
    createdAt?: Date;
    updatedAt?: Date;
} & Record<string, unknown>;

export type ReservaRow = Omit<ReservaDoc, '_id' | 'createdAt' | 'updatedAt'> & {
    id: string;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateReservaInput = Omit<ReservaDoc, '_id' | 'createdAt' | 'updatedAt'> & {
    createdAt?: Date;
    updatedAt?: Date;
};

export type UpdateReservaPatch = Partial<Pick<ReservaDoc,
    'cliente' | 'parrilladas' | 'picarones' | 'metodoPagoId' | 'receptorId' |
    'tipoConsumoId' | 'comercialId' | 'totalPedido' | 'pagado' | 'comprobado' |
    'locked' | 'puntoRecogidaId' | 'isActive' | 'updatedAt'
>>;

function serializeRow(doc: ReservaDoc): ReservaRow {
    return {
        id: doc._id ? String(doc._id) : '',
        eventId: doc.eventId,
        cliente: doc.cliente,
        ...(doc.parrilladas !== undefined ? { parrilladas: doc.parrilladas } : {}),
        ...(doc.picarones !== undefined ? { picarones: doc.picarones } : {}),
        ...(doc.metodoPagoId ? { metodoPagoId: doc.metodoPagoId } : {}),
        ...(doc.receptorId ? { receptorId: doc.receptorId } : {}),
        ...(doc.tipoConsumoId ? { tipoConsumoId: doc.tipoConsumoId } : {}),
        ...(doc.comercialId ? { comercialId: doc.comercialId } : {}),
        totalPedido: doc.totalPedido,
        pagado: doc.pagado,
        comprobado: doc.comprobado,
        locked: doc.locked,
        ...(doc.puntoRecogidaId !== undefined ? { puntoRecogidaId: doc.puntoRecogidaId } : {}),
        isActive: doc.isActive,
        ...(doc.createdAt ? { createdAt: toISO(doc.createdAt) ?? undefined } : {}),
        ...(doc.updatedAt ? { updatedAt: toISO(doc.updatedAt) ?? undefined } : {})
    };
}

export async function listReservas(opts: {
    eventId: string; page: number; pageSize: number; filters?: string; sort?: string;
}): Promise<{ rows: ReservaRow[]; total: number }> {
    const db = await getDb();
    const col = db.collection<ReservaDoc>('reservas');
    const filter: Record<string, unknown> = { eventId: opts.eventId };
    const total = await col.countDocuments(filter);
    const docs = await col.find(filter).skip(opts.page * opts.pageSize).limit(opts.pageSize).toArray();
    return { rows: docs.map(serializeRow), total };
}

export async function createReserva(doc: CreateReservaInput): Promise<ReservaRow> {
    const now = new Date();
    const toInsert: ReservaDoc = {
        ...doc,
        eventId: String(doc.eventId),
        createdAt: ensureDate(doc.createdAt) ?? now,
        updatedAt: ensureDate(doc.updatedAt) ?? now
    };
    const db = await getDb();
    const col = db.collection<ReservaDoc>('reservas');
    const res = await col.insertOne(toInsert);
    return serializeRow({ ...toInsert, _id: res.insertedId });
}

export async function updateReserva(id: string, patch: UpdateReservaPatch): Promise<void> {
    const db = await getDb();
    const col = db.collection<ReservaDoc>('reservas');
    const objectId = new ObjectId(id);
    const toSet: UpdateReservaPatch = {
        ...('cliente' in patch ? { cliente: patch.cliente } : {}),
        ...('parrilladas' in patch ? { parrilladas: patch.parrilladas } : {}),
        ...('picarones' in patch ? { picarones: patch.picarones } : {}),
        ...('metodoPagoId' in patch ? { metodoPagoId: patch.metodoPagoId } : {}),
        ...('receptorId' in patch ? { receptorId: patch.receptorId } : {}),
        ...('tipoConsumoId' in patch ? { tipoConsumoId: patch.tipoConsumoId } : {}),
        ...('comercialId' in patch ? { comercialId: patch.comercialId } : {}),
        ...('totalPedido' in patch ? { totalPedido: patch.totalPedido } : {}),
        ...('pagado' in patch ? { pagado: patch.pagado } : {}),
        ...('comprobado' in patch ? { comprobado: patch.comprobado } : {}),
        ...('locked' in patch ? { locked: patch.locked } : {}),
        ...('puntoRecogidaId' in patch ? { puntoRecogidaId: patch.puntoRecogidaId } : {}),
        ...('isActive' in patch ? { isActive: patch.isActive } : {}),
        ...(patch.updatedAt ? { updatedAt: ensureDate(patch.updatedAt) ?? new Date() } : { updatedAt: new Date() })
    };
    await col.updateOne({ _id: objectId }, { $set: toSet });
}

export async function deleteReserva(id: string): Promise<void> {
    const db = await getDb();
    const col = db.collection<ReservaDoc>('reservas');
    await col.deleteOne({ _id: new ObjectId(id) });
}
