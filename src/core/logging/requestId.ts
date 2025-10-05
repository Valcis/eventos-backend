import {FastifyPluginCallback} from "fastify";
import {randomUUID} from "node:crypto";

const requestIdPlugin: FastifyPluginCallback = (app, _opts, done) => {
    app.addHook("onRequest", (req, _reply, next) => {
        const incoming = req.headers["x-request-id"];
        const rid = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
        // Anclar en request y logger hijo
        (req as any).requestId = rid;
        req.log = req.log.child({requestId: rid});
        next();
    });
    done();
};

export default requestIdPlugin;
