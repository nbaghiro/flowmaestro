import { FastifyInstance } from "fastify";
import { createConnectionRoute } from "./create";
import { deleteConnectionRoute } from "./delete";
import { getConnectionRoute } from "./get";
import { listConnectionsRoute } from "./list";
import { mcpToolsRoute } from "./mcp-tools";
import { updateConnectionRoute } from "./update";

export async function connectionRoutes(fastify: FastifyInstance) {
    // Standard CRUD routes
    await createConnectionRoute(fastify);
    await listConnectionsRoute(fastify);
    await getConnectionRoute(fastify);
    await updateConnectionRoute(fastify);
    await deleteConnectionRoute(fastify);

    // MCP tools route
    await mcpToolsRoute(fastify);
}
