import {Db, ObjectId, Filter, FindOptions} from "mongodb";
import {toDecimal128, fromDecimal128, MoneyString} from "../../utils/currency";
import {PrecioDb, PrecioDTO} from "./precios.types";

export class PreciosRepo {
    private readonly db: Db;

    constructor(db: Db) {
        this.db = db;
    }

    private toDTO(doc: PrecioDb): PrecioDTO {
        return {
            id: (doc._id as ObjectId).toHexString(),
            eventId: doc.eventId,
            productoId: doc.productoId,
            precio: fromDecimal128(doc.precio),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
        };
    }

    async insertOne(params: { eventId: string; productoId: string; precio: MoneyString }): Promise<PrecioDTO> {
        if (!params.productoId || params.productoId.trim() === "") {
            throw new Error("productoId requerido");
        }
        const now = new Date();
        const doc: PrecioDb = {
            eventId: params.eventId,
            productoId: params.productoId,
            precio: toDecimal128(params.precio),
            createdAt: now,
            updatedAt: now,
        };
        const result = await this.db.collection<PrecioDb>("precios").insertOne(doc);
        const inserted = {...doc, _id: result.insertedId};
        return this.toDTO(inserted);
    }

    async list(params: {
        eventId: string;
        productoId?: string;
        sort: Record<string, 1 | -1>;
        page: number;
        pageSize: number;
    }): Promise<{ items: PrecioDTO[]; totalItems: number }> {
        const filter: Filter<PrecioDb> = {eventId: params.eventId};
        if (params.productoId) filter.productoId = params.productoId;

        const options: FindOptions<PrecioDb> = {
            sort: params.sort,
            skip: params.page * params.pageSize,
            limit: params.pageSize,
        };

        const collection = this.db.collection<PrecioDb>("precios");
        const [docs, totalItems] = await Promise.all([
            collection.find(filter, options).toArray(),
            collection.countDocuments(filter),
        ]);

        return {items: docs.map(d => this.toDTO(d)), totalItems};
    }

    async updateById(
        id: string,
        patch: { productoId?: string; precio?: MoneyString }
    ): Promise<PrecioDTO | null> {
        const _id = new ObjectId(id);
        const $set: Partial<PrecioDb> = {updatedAt: new Date()};
        if (typeof patch.precio === "string") $set.precio = toDecimal128(patch.precio);
        if (typeof patch.productoId === "string") {
            const trimmed = patch.productoId.trim();
            if (!trimmed) throw new Error("productoId no puede ser vacío");
            $set.productoId = trimmed;
        }

        const res = await this.db
            .collection<PrecioDb>("precios")
            .findOneAndUpdate({_id}, {$set}, {returnDocument: "after"});

        return res.value ? this.toDTO(res.value) : null;
    }

    async deleteById(id: string): Promise<boolean> {
        const oid = new ObjectId(id);
        const res = await this.db.collection<PrecioDb>("precios").deleteOne({_id: oid});
        return res.deletedCount === 1;
    }
}
