import type {FastifyReply} from "fastify";
import {getDb} from "../../infra/mongo/client";
import {makeCrud} from "../../infra/mongo/crud";
import type {WithId, Document} from "mongodb";
import type {Reservation, ReservationCreate, ReservationUpdate, ReservationQuery,} from "./types";
import type {
    ListRequest, GetRequest, CreateRequest, UpdateRequest, PatchRequest, RemoveRequest,
} from "../../shared/types/fastify";

/** Documento tal como vive en Mongo */
type ReservationDb = WithId<
    Document & {
    userId: string;
    eventId: string;
    seats: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
>;

/** Mapeo a DB (sin any) */
function toDbReservation(
    input: ReservationCreate | ReservationUpdate
): Document {
    const out: Record<string, unknown> = {};
    if ("userId" in input && typeof input.userId === "string") out.userId = input.userId;
    if ("eventId" in input && typeof input.eventId === "string") out.eventId = input.eventId;
    if ("seats" in input && typeof input.seats === "number") out.seats = input.seats;
    return out;
}

/** Mapeo a dominio (sin any) */
function fromDbReservation(d: ReservationDb): Reservation {
    return {
        id: String(d._id),
        userId: d.userId,
        eventId: d.eventId,
        seats: d.seats,
        isActive: d.isActive,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
    };
}

export function makeController() {
    const repo = makeCrud<Reservation, ReservationCreate, ReservationUpdate, ReservationQuery>({
        collection: "reservations",
        toDb: toDbReservation,
        fromDb: (doc) => fromDbReservation(doc as ReservationDb),
        softDelete: true,
    });

    return {
        // GET /reservations?userId=&eventId=&isActive=&limit=&after=
        list: async (request: ListRequest<ReservationQuery>, reply: FastifyReply) => {
            const db = getDb();
            const {limit = 50, after, ...query} = request.query; // ✅ after existe
            const page = await repo.list(db, query, {limit, after});
            reply.send(page);
        },

        // GET /reservations/:id
        get: async (request: GetRequest, reply: FastifyReply) => {
            const db = getDb();
            const item = await repo.getById(db, request.params.id);
            if (!item) return reply.code(404).send();
            reply.send(item);
        },

        // POST /reservations
        create: async (request: CreateRequest<ReservationCreate>, reply: FastifyReply) => {
            const db = getDb();
            const created = await repo.create(db, request.body);
            reply.code(201).send(created);
        },

        // PUT /reservations/:id
        update: async (request: UpdateRequest<ReservationUpdate>, reply: FastifyReply) => {
            const db = getDb();
            const updated = await repo.update(db, request.params.id, request.body);
            if (!updated) return reply.code(404).send();
            reply.send(updated);
        },

        // PATCH /reservations/:id
        patch: async (request: PatchRequest<ReservationUpdate>, reply: FastifyReply) => {
            const db = getDb();
            const updated = await repo.patch(db, request.params.id, request.body);
            if (!updated) return reply.code(404).send();
            reply.send(updated);
        },

        // DELETE /reservations/:id   (soft delete)
        remove: async (request: RemoveRequest, reply: FastifyReply) => {
            const db = getDb();
            await repo.softDelete(db, request.params.id);
            reply.code(204).send();
        },
    };
}
