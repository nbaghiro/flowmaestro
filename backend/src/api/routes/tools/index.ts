import { authMiddleware } from "../../middleware/auth";
import { listBuiltInToolsHandler } from "./list-builtin";
import type { ToolCategory } from "../../../tools";
import type { FastifyInstance } from "fastify";

/**
 * Tools routes - built-in tool discovery
 */
export async function toolRoutes(fastify: FastifyInstance) {
    // List available built-in tools
    fastify.get<{
        Querystring: { category?: ToolCategory };
    }>("/builtin", { preHandler: [authMiddleware] }, listBuiltInToolsHandler);
}
