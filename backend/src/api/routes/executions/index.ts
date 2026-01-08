import { FastifyInstance } from "fastify";
import { cancelExecutionRoute } from "./cancel";
import { getExecutionRoute } from "./get";
import { getExecutionLogsRoute } from "./getLogs";
import { listExecutionsRoute } from "./list";
import { streamExecutionRoute } from "./stream";
import { submitResponseRoute } from "./submit-response";

export async function executionRoutes(fastify: FastifyInstance) {
    // Register all execution routes
    await listExecutionsRoute(fastify);
    await getExecutionRoute(fastify);
    await cancelExecutionRoute(fastify);
    await getExecutionLogsRoute(fastify);
    await streamExecutionRoute(fastify);
    await submitResponseRoute(fastify);
}
