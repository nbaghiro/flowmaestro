/**
 * Public Status Routes
 *
 * Public endpoint for the status page (no authentication required).
 * Provides aggregated health status for all FlowMaestro services.
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getAggregatedStatus, getStatusCode } from "../../../services/status";

const logger = createServiceLogger("PublicStatusRoutes");

export async function publicStatusRoutes(fastify: FastifyInstance) {
    /**
     * GET /public/status
     * Get aggregated status of all FlowMaestro services
     */
    fastify.get("/", async (_request, reply) => {
        try {
            const status = await getAggregatedStatus();

            // Set cache headers for CDN (15 seconds)
            reply.header("Cache-Control", "public, max-age=15, stale-while-revalidate=30");

            // Return with appropriate status code
            const httpStatus = getStatusCode(status.status);

            return reply.status(httpStatus).send({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error({ error }, "Error fetching status");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch status"
            });
        }
    });
}
