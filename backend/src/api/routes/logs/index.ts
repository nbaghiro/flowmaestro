/**
 * Log Routes
 * Endpoints for log ingestion from clients
 */

import { FastifyInstance } from "fastify";
import { ingestLogsRoute } from "./ingest";

export async function logRoutes(fastify: FastifyInstance): Promise<void> {
    // Register log ingestion route
    await ingestLogsRoute(fastify);
}
