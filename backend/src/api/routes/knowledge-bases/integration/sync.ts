/**
 * Integration Sync Route
 *
 * POST /knowledge-bases/:id/integration/sources/:sourceId/sync
 * Manually trigger a sync for an integration source
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { KnowledgeBaseRepository } from "../../../../storage/repositories";
import { KnowledgeBaseSourceRepository } from "../../../../storage/repositories/KnowledgeBaseSourceRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("IntegrationSync");

export async function integrationSyncRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: { id: string; sourceId: string } }>(
        "/:id/integration/sources/:sourceId/sync",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const sourceRepository = new KnowledgeBaseSourceRepository();
            const { id, sourceId } = request.params;

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

            // Verify source belongs to this knowledge base
            const source = await sourceRepository.findById(sourceId);
            if (!source || source.knowledgeBaseId !== id) {
                return reply.status(404).send({
                    success: false,
                    error: "Source not found"
                });
            }

            // Check if already syncing
            if (source.syncStatus === "syncing") {
                return reply.status(409).send({
                    success: false,
                    error: "Sync already in progress"
                });
            }

            try {
                const client = await getTemporalClient();
                const workflowId = `integration-import-${sourceId}-${Date.now()}`;

                await client.workflow.start("integrationImportWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId,
                    args: [
                        {
                            sourceId: source.id,
                            knowledgeBaseId: id,
                            connectionId: source.connectionId,
                            provider: source.provider,
                            sourceConfig: source.sourceConfig,
                            isInitialImport: false
                        }
                    ]
                });

                // Update source status to syncing
                await sourceRepository.updateSyncStatus(sourceId, "syncing");

                return reply.send({
                    success: true,
                    data: {
                        jobId: workflowId
                    }
                });
            } catch (error) {
                logger.error({ sourceId, err: error }, "Failed to start sync");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to start sync"
                });
            }
        }
    );
}
