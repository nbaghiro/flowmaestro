import { FastifyInstance } from "fastify";
import { executeWorkflowHandler } from "./execute";
import { getWorkflowHandler } from "./get";
import { listWorkflowsHandler } from "./list";

/**
 * Public API v1 - Workflows routes.
 */
export async function workflowsV1Routes(fastify: FastifyInstance): Promise<void> {
    // List workflows
    await fastify.register(listWorkflowsHandler);

    // Get workflow by ID
    await fastify.register(getWorkflowHandler);

    // Execute workflow
    await fastify.register(executeWorkflowHandler);
}
