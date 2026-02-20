/**
 * Integration Routes Index
 *
 * Routes for knowledge base integration with external providers
 */

import { FastifyInstance } from "fastify";
import { integrationBrowseRoute } from "./browse";
import { integrationImportStatusRoute } from "./import-status";
import { integrationProvidersRoute } from "./providers";
import { integrationSourcesRoutes } from "./sources";
import { integrationSyncRoute } from "./sync";

export async function integrationRoutes(fastify: FastifyInstance) {
    // List providers with document import capabilities
    await integrationProvidersRoute(fastify);

    // Browse files in a provider
    await integrationBrowseRoute(fastify);

    // CRUD for integration sources
    await integrationSourcesRoutes(fastify);

    // Manual sync trigger
    await integrationSyncRoute(fastify);

    // Import job status
    await integrationImportStatusRoute(fastify);
}
