/**
 * Sandbox Routes
 *
 * API endpoints for exploring sandbox/test fixture data.
 * These routes allow the frontend to visualize and test mock data
 * for test connections.
 */

import { authMiddleware } from "../../middleware/auth";
import { getFixtureHandler } from "./get-fixture";
import { listFixturesHandler } from "./list-fixtures";
import { testOperationHandler } from "./test-operation";
import type { FastifyInstance } from "fastify";

export async function sandboxRoutes(fastify: FastifyInstance) {
    // List all fixtures for a provider
    fastify.get<{
        Params: { provider: string };
    }>("/:provider/fixtures", { preHandler: [authMiddleware] }, listFixturesHandler);

    // Get fixture details for a specific operation
    fastify.get<{
        Params: { provider: string; operationId: string };
    }>("/:provider/fixtures/:operationId", { preHandler: [authMiddleware] }, getFixtureHandler);

    // Test an operation with custom params
    fastify.post<{
        Params: { provider: string };
        Body: { operationId: string; params: Record<string, unknown> };
    }>("/:provider/test", { preHandler: [authMiddleware] }, testOperationHandler);
}
