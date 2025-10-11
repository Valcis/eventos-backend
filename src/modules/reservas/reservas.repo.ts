import {Db, ObjectId, Filter, FindOptions} from "mongodb";
import {ReservaDb, ReservaDTO, ReservaEstado} from "./reservas.types";

export class ReservasRepo {
    private readonly db: Db;

    constructor(db: Db) {
        this.db = db;
    }

    private toDTO(doc: ReservaDb): ReservaDTO {
        return {
            id: (doc._id as ObjectId).toHexString(),
            eventId: doc.eventId,
            estado: doc.estado,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
        };
    }

    async insertOne(params: { eventId: string; estado?: ReservaEstado }): Promise<ReservaDTO> {
        const now = new Date();
        const doc: ReservaDb = {
            eventId: params.eventId,
            estado: params.estado ?? "pendiente",
            createdAt: now,
            updatedAt: now,
        };
        const result = await this.db.collection<ReservaDb>("reservas").insertOne(doc);
        const inserted = {...doc, _id: result.insertedId};
        return this.toDTO(inserted);
    }

    async list(params: {
        eventId: string;
        estado?: ReservaEstado;
        sort: Record<string, 1 | -1>;
        page: number;
        pageSize: number;
    }): Promise<{ items: ReservaDTO[]; totalItems: number }> {
        const filter: Filter<ReservaDb> = {eventId: params.eventId};
        if (params.estado) filter.estado = params.estado;

        const options: FindOptions<ReservaDb> = {
            sort: params.sort,
            skip: params.page * params.pageSize,
            limit: params.pageSize,
        };
        const collection = this.db.collection<ReservaDb>("reservas");
        const [docs, totalItems] = await Promise.all([
            collection.find(filter, options).toArray(),
            collection.countDocuments(filter),
        ]);
        return {items: docs.map(d => this.toDTO(d)), totalItems};
    }

    async updateById(id: string, patch: { estado?: ReservaEstado }): Promise<ReservaDTO | null> {
        const _id = new ObjectId(id);
        const $set: Partial<ReservaDb> = {updatedAt: new Date()};
        if (patch.estado) $set.estado = patch.estado;

        const res = await this.db
            .collection<ReservaDb>("reservas")
            .findOneAndUpdate({_id}, {$set}, {returnDocument: "after"});

        return res.value ? this.toDTO(res.value) : null;
    }

    async deleteById(id: string): Promise<boolean> {
        const oid = new ObjectId(id);
        const res = await this.db.collection<ReservaDb>("reservas").deleteOne({_id: oid});
        return res.deletedCount === 1;
    }
}
