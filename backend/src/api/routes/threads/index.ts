import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { archiveThreadHandler, unarchiveThreadHandler } from "./archive";
import { createThreadHandler } from "./create";
import { deleteThreadHandler } from "./delete";
import { getThreadHandler } from "./get";
import { listThreadsHandler } from "./list";
import { getThreadMessagesHandler } from "./messages";
import { streamThreadHandler } from "./stream";
import { updateThreadHandler } from "./update";

export async function threadRoutes(fastify: FastifyInstance) {
    // All thread routes require authentication
    fastify.addHook("preHandler", authMiddleware);

    // CRUD operations
    fastify.post("/", createThreadHandler);
    fastify.get("/", listThreadsHandler);
    fastify.get("/:id", getThreadHandler);
    fastify.get("/:id/messages", getThreadMessagesHandler);
    fastify.put("/:id", updateThreadHandler);
    fastify.delete("/:id", deleteThreadHandler);

    // Archive operations
    fastify.post("/:id/archive", archiveThreadHandler);
    fastify.post("/:id/unarchive", unarchiveThreadHandler);

    // Streaming (SSE)
    fastify.get("/:id/stream", streamThreadHandler);
}
