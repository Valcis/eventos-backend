import { Db, ObjectId, Filter, FindOptions } from "mongodb";
import { toDecimal128, fromDecimal128, MoneyString } from "../../utils/currency";
import { GastoDb, GastoDTO } from "./gastos.types";

export class GastosRepo {
    private readonly db: Db;
    constructor(db: Db) {
        this.db = db;
    }

    private toDTO(doc: GastoDb): GastoDTO {
        return {
            id: (doc._id as ObjectId).toHexString(),
            eventId: doc.eventId,
            importe: fromDecimal128(doc.importe),
            descripcion: doc.descripcion ?? null,
            proveedor: doc.proveedor ?? null,
            comprobado: doc.comprobado,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
        };
    }

    async insertOne(params: {
        eventId: string;
        importe: MoneyString;
        descripcion?: string | null;
        proveedor?: string | null;
        comprobado?: boolean;
    }): Promise<GastoDTO> {
        const now = new Date();
        const doc: GastoDb = {
            eventId: params.eventId,
            importe: toDecimal128(params.importe),
            descripcion: params.descripcion ?? null,
            proveedor: params.proveedor ?? null,
            comprobado: params.comprobado ?? false,
            createdAt: now,
            updatedAt: now,
        };
        const result = await this.db.collection<GastoDb>("gastos").insertOne(doc);
        const inserted = { ...doc, _id: result.insertedId };
        return this.toDTO(inserted);
    }

    async list(params: {
        eventId: string;
        filterComprobado?: boolean;
        q?: string;
        sort: Record<string, 1 | -1>;
        page: number;
        pageSize: number;
    }): Promise<{ items: GastoDTO[]; totalItems: number }> {
        const filter: Filter<GastoDb> = { eventId: params.eventId };
        if (typeof params.filterComprobado === "boolean") filter.comprobado = params.filterComprobado;
        if (params.q?.trim()) filter.$text = { $search: params.q.trim() };

        const options: FindOptions<GastoDb> = {
            sort: params.sort,
            skip: params.page * params.pageSize,
            limit: params.pageSize,
        };
        const collection = this.db.collection<GastoDb>("gastos");
        const [docs, totalItems] = await Promise.all([
            collection.find(filter, options).toArray(),
            collection.countDocuments(filter),
        ]);
        return { items: docs.map(d => this.toDTO(d)), totalItems };
    }

    async updateById(
        id: string,
        patch: {
            importe?: MoneyString;
            descripcion?: string | null;
            proveedor?: string | null;
            comprobado?: boolean;
        }
    ): Promise<GastoDTO | null> {
        const _id = new ObjectId(id);
        const $set: Partial<GastoDb> = { updatedAt: new Date() };
        if (typeof patch.importe === "string") $set.importe = toDecimal128(patch.importe);
        if (patch.descripcion !== undefined) $set.descripcion = patch.descripcion;
        if (patch.proveedor !== undefined) $set.proveedor = patch.proveedor;
        if (typeof patch.comprobado === "boolean") $set.comprobado = patch.comprobado;

        const res = await this.db
            .collection<GastoDb>("gastos")
            .findOneAndUpdate({ _id }, { $set }, { returnDocument: "after" });

        return res.value ? this.toDTO(res.value) : null;
    }

    async deleteById(id: string): Promise<boolean> {
        const oid = new ObjectId(id);
        const res = await this.db.collection<GastoDb>("gastos").deleteOne({ _id: oid });
        return res.deletedCount === 1;
    }
}
