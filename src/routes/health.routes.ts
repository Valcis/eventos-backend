import type { FastifyInstance } from "fastify";
import { getDb } from "../infra/mongo/client";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
    app.get("/", {
        schema: {
            response: {
                200: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"]
                }
            }
        }
    }, async () => ({ ok: true }));

    app.get("/db", {
        schema: {
            response: {
                200: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"]
                }
            }
        }
    }, async (req, reply) => {
        try {
            const db = await getDb();
            const ping = await db.admin().ping();
            return { ok: ping?.ok === 1 };
        } catch (e) {
            const err = e as Error;
            req.log.error({ err }, "db health failed");
            // @ts-ignore
            return reply.code(500).send({ ok: false });
        }
    });
}
