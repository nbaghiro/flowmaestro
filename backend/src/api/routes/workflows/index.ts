import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { chatRoute } from "./chat";
import { chatStreamHandler } from "./chat-stream";
import { createWorkflowRoute } from "./create";
import { deleteWorkflowRoute } from "./delete";
import { executeWorkflowRoute } from "./execute";
import { generateWorkflowRoute } from "./generate";
import { getWorkflowRoute } from "./get";
import { listWorkflowsRoute } from "./list";
import { updateWorkflowRoute } from "./update";

export async function workflowRoutes(fastify: FastifyInstance) {
    // Register all workflow routes
    await listWorkflowsRoute(fastify);
    await createWorkflowRoute(fastify);
    await getWorkflowRoute(fastify);
    await updateWorkflowRoute(fastify);
    await deleteWorkflowRoute(fastify);
    await executeWorkflowRoute(fastify);
    await generateWorkflowRoute(fastify);
    await chatRoute(fastify);

    // Register SSE streaming endpoint for chat
    // Note: authMiddleware supports token from query param for EventSource compatibility
    fastify.get<{ Params: { executionId: string }; Querystring: { token?: string } }>(
        "/chat-stream/:executionId",
        { preHandler: [authMiddleware] },
        chatStreamHandler
    );
}
