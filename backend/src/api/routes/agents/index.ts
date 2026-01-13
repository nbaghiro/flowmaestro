import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { addToolHandler } from "./add-tool";
import { addToolsBatchHandler } from "./add-tools-batch";
import { createAgentHandler } from "./create";
import { deleteAgentHandler } from "./delete";
import { executeAgentHandler } from "./execute";
import { getAgentHandler } from "./get";
import { getExecutionHandler } from "./get-execution";
import { listAgentsHandler } from "./list";
import { listExecutionsHandler } from "./list-executions";
import { removeToolHandler } from "./remove-tool";
import { sendMessageHandler } from "./send-message";
import { streamAgentHandler } from "./stream";
import { updateAgentHandler } from "./update";

export async function agentRoutes(fastify: FastifyInstance) {
    // All agent routes require authentication and workspace context
    fastify.addHook("preHandler", authMiddleware);
    fastify.addHook("preHandler", workspaceContextMiddleware);

    // CRUD operations
    fastify.post("/", createAgentHandler);
    fastify.get("/", listAgentsHandler);
    fastify.get("/:id", getAgentHandler);
    fastify.put("/:id", updateAgentHandler);
    fastify.delete("/:id", deleteAgentHandler);

    // Tool management
    fastify.post("/:id/tools", addToolHandler);
    fastify.post("/:id/tools/batch", addToolsBatchHandler);
    fastify.delete("/:id/tools/:toolId", removeToolHandler);

    // Agent execution
    fastify.post("/:id/execute", executeAgentHandler);
    fastify.get("/:id/executions", listExecutionsHandler);
    fastify.get("/:id/executions/:executionId", getExecutionHandler);
    fastify.get("/:id/executions/:executionId/stream", streamAgentHandler);
    fastify.post("/:id/executions/:executionId/message", sendMessageHandler);
}
