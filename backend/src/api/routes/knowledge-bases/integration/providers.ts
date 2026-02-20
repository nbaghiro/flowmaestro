/**
 * Integration Providers Route
 *
 * GET /knowledge-bases/:id/integration/providers
 * Returns all user connections with document import capabilities
 *
 * GET /knowledge-bases/:id/integration/capable-providers
 * Returns all provider IDs that support document import (for showing all options in UI)
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { integrationDocumentService } from "../../../../services/integration-documents";
import { KnowledgeBaseRepository } from "../../../../storage/repositories";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("IntegrationProviders");

export async function integrationProvidersRoute(fastify: FastifyInstance) {
    // Get connections with document capabilities (existing connections only)
    fastify.get<{ Params: { id: string } }>(
        "/:id/integration/providers",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const { id } = request.params;

            // Verify knowledge base exists and user has access
            const kb = await kbRepository.findById(id);
            if (!kb) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            if (kb.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            try {
                // Get all connections with document capabilities for the workspace
                const capableConnections = await integrationDocumentService.getCapableConnections(
                    kb.workspace_id
                );

                // Transform to API response format
                const providers = capableConnections.map((conn) => ({
                    provider: conn.provider,
                    displayName: conn.displayName,
                    connectionId: conn.connectionId,
                    connectionName: conn.connectionName,
                    supportsBrowsing: conn.capability.supportsBrowsing,
                    supportsSearch: conn.capability.supportsSearch,
                    contentType: conn.capability.contentType
                }));

                return reply.send({
                    success: true,
                    data: providers
                });
            } catch (error) {
                logger.error({ kbId: id, err: error }, "Failed to get integration providers");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to get providers"
                });
            }
        }
    );

    // Get all capable provider IDs (regardless of whether user has connections)
    fastify.get<{ Params: { id: string } }>(
        "/:id/integration/capable-providers",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const { id } = request.params;

            // Verify knowledge base exists and user has access
            const kb = await kbRepository.findById(id);
            if (!kb) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            if (kb.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            try {
                // Get all provider IDs that support document import
                const providerIds = await integrationDocumentService.getCapableProviderIds();

                return reply.send({
                    success: true,
                    data: providerIds
                });
            } catch (error) {
                logger.error({ kbId: id, err: error }, "Failed to get capable providers");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to get providers"
                });
            }
        }
    );
}
