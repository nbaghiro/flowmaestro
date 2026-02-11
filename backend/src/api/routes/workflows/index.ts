import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { chatRoute } from "./chat";
import { chatStreamHandler } from "./chat-stream";
import { createWorkflowRoute } from "./create";
import { deleteWorkflowRoute } from "./delete";
import { executeWorkflowRoute } from "./execute";
import { generateWorkflowRoute } from "./generate";
import { generationChatRoute } from "./generation-chat";
import { generationChatStreamHandler } from "./generation-chat-stream";
import { getWorkflowRoute } from "./get";
import { getWorkflowBySystemKeyRoute } from "./get-by-system-key";
import { listWorkflowsRoute } from "./list";
import { updateWorkflowRoute } from "./update";
import { uploadWorkflowFilesRoute } from "./upload-files";

export async function workflowRoutes(fastify: FastifyInstance) {
    // Register all workflow routes
    await listWorkflowsRoute(fastify);
    await createWorkflowRoute(fastify);
    await getWorkflowBySystemKeyRoute(fastify); // Must be before getWorkflowRoute to avoid matching :id
    await getWorkflowRoute(fastify);
    await updateWorkflowRoute(fastify);
    await deleteWorkflowRoute(fastify);
    await executeWorkflowRoute(fastify);
    await generateWorkflowRoute(fastify);
    await chatRoute(fastify);
    await generationChatRoute(fastify);
    await uploadWorkflowFilesRoute(fastify);

    // Register SSE streaming endpoint for chat
    // Note: authMiddleware supports token from query param for EventSource compatibility
    fastify.get<{ Params: { executionId: string }; Querystring: { token?: string } }>(
        "/chat-stream/:executionId",
        { preHandler: [authMiddleware] },
        chatStreamHandler
    );

    // Register SSE streaming endpoint for generation chat (with thinking support)
    fastify.get<{ Params: { executionId: string }; Querystring: { token?: string } }>(
        "/generation/chat-stream/:executionId",
        { preHandler: [authMiddleware] },
        generationChatStreamHandler
    );
}
