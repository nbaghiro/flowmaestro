/**
 * Integration Import Status Route
 *
 * GET /knowledge-bases/:id/integration/import/:jobId
 * Get the status of an integration import job
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { KnowledgeBaseRepository } from "../../../../storage/repositories";
import { getTemporalClient } from "../../../../temporal/client";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("IntegrationImportStatus");

export async function integrationImportStatusRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string; jobId: string } }>(
        "/:id/integration/import/:jobId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const { id, jobId } = request.params;

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
                const client = await getTemporalClient();

                // Try to get workflow handle
                const handle = client.workflow.getHandle(jobId);

                // Get workflow status
                const description = await handle.describe();

                // Get result if completed
                let result = null;
                if (description.status.name === "COMPLETED") {
                    try {
                        result = await handle.result();
                    } catch {
                        // Workflow may not return a result
                    }
                }

                // Map workflow status to import job status
                let status: string;
                const statusName = description.status.name as string;
                switch (statusName) {
                    case "RUNNING":
                        status = "running";
                        break;
                    case "COMPLETED":
                        status = "completed";
                        break;
                    case "FAILED":
                    case "TERMINATED":
                    case "CANCELED":
                    case "CANCELLED":
                        status = "failed";
                        break;
                    default:
                        status = "pending";
                }

                // Build response
                const importJob = {
                    jobId,
                    sourceId: result?.sourceId || "",
                    knowledgeBaseId: id,
                    status,
                    total: result?.total || 0,
                    completed: result?.completed || 0,
                    failed: result?.failed || 0,
                    skipped: result?.skipped || 0,
                    newFiles: result?.newFiles || 0,
                    updatedFiles: result?.updatedFiles || 0,
                    results: result?.results || [],
                    startedAt: description.startTime?.toISOString() || new Date().toISOString(),
                    completedAt: description.closeTime?.toISOString(),
                    error: result?.error
                };

                return reply.send({
                    success: true,
                    data: importJob
                });
            } catch (error) {
                logger.error({ jobId, err: error }, "Failed to get import status");

                // Check if it's a not found error
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes("not found") || errorMessage.includes("NotFoundError")) {
                    return reply.status(404).send({
                        success: false,
                        error: "Import job not found"
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: "Failed to get import status"
                });
            }
        }
    );
}
