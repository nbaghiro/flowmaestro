import { FastifyInstance } from "fastify";
import { agentChatRoute } from "./agent-chat";
import { extensionAuthRoutes } from "./auth";
import { executeWorkflowRoute } from "./execute-workflow";
import { userContextRoute } from "./user-context";

export async function extensionRoutes(fastify: FastifyInstance) {
    // Auth routes (no auth middleware required)
    await fastify.register(extensionAuthRoutes);

    // Protected routes
    await fastify.register(userContextRoute);
    await fastify.register(executeWorkflowRoute);
    await fastify.register(agentChatRoute);
}
