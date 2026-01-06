import { FastifyInstance } from "fastify";
import { cancelExecutionHandler } from "./cancel";
import { getExecutionHandler } from "./get";
import { listExecutionsHandler } from "./list";
import { streamExecutionHandler } from "./stream";

/**
 * Public API v1 - Executions routes.
 */
export async function executionsV1Routes(fastify: FastifyInstance): Promise<void> {
    // List executions
    await fastify.register(listExecutionsHandler);

    // Get execution by ID
    await fastify.register(getExecutionHandler);

    // Cancel execution
    await fastify.register(cancelExecutionHandler);

    // Stream execution events (SSE)
    await fastify.register(streamExecutionHandler);
}
