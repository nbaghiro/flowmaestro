/**
 * Integration Sources Routes
 *
 * CRUD operations for knowledge base integration sources
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { integrationDocumentService } from "../../../../services/integration-documents";
import { KnowledgeBaseRepository } from "../../../../storage/repositories";
import { ConnectionRepository } from "../../../../storage/repositories/ConnectionRepository";
import { KnowledgeBaseSourceRepository } from "../../../../storage/repositories/KnowledgeBaseSourceRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { authMiddleware } from "../../../middleware";
import type { KBSourceType, SourceConfig } from "../../../../services/integration-documents/types";

const logger = createServiceLogger("IntegrationSources");

interface CreateSourceBody {
    connectionId: string;
    sourceType: KBSourceType;
    sourceConfig: SourceConfig;
    syncEnabled: boolean;
    syncIntervalMinutes?: number;
}

interface UpdateSourceBody {
    syncEnabled?: boolean;
    syncIntervalMinutes?: number;
}

export async function integrationSourcesRoutes(fastify: FastifyInstance) {
    const kbRepository = new KnowledgeBaseRepository();
    const sourceRepository = new KnowledgeBaseSourceRepository();
    const connectionRepository = new ConnectionRepository();

    // GET /:id/integration/sources - List sources for a knowledge base
    fastify.get<{ Params: { id: string } }>(
        "/:id/integration/sources",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
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
                const sources = await sourceRepository.findByKnowledgeBaseId(id);

                return reply.send({
                    success: true,
                    data: sources
                });
            } catch (error) {
                logger.error({ kbId: id, err: error }, "Failed to list sources");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to list integration sources"
                });
            }
        }
    );

    // POST /:id/integration/sources - Create a new source
    fastify.post<{ Params: { id: string }; Body: CreateSourceBody }>(
        "/:id/integration/sources",
        {
            preHandler: [authMiddleware],
            schema: {
                body: {
                    type: "object",
                    required: ["connectionId", "sourceType", "sourceConfig", "syncEnabled"],
                    properties: {
                        connectionId: { type: "string" },
                        sourceType: { type: "string", enum: ["folder", "file", "search"] },
                        sourceConfig: {
                            type: "object",
                            properties: {
                                folderId: { type: "string" },
                                folderPath: { type: "string" },
                                fileIds: { type: "array", items: { type: "string" } },
                                searchQuery: { type: "string" },
                                recursive: { type: "boolean" },
                                mimeTypes: { type: "array", items: { type: "string" } }
                            }
                        },
                        syncEnabled: { type: "boolean" },
                        syncIntervalMinutes: { type: "number", minimum: 5 }
                    }
                }
            }
        },
        async (request, reply) => {
            const { id } = request.params;
            const body = request.body;

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

            // Verify connection belongs to workspace
            const connection = await connectionRepository.findByIdAndWorkspaceId(
                body.connectionId,
                kb.workspace_id
            );
            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            // Validate connection has document capabilities
            const validation = await integrationDocumentService.validateConnection(
                body.connectionId
            );
            if (!validation.valid) {
                return reply.status(400).send({
                    success: false,
                    error: validation.error
                });
            }

            try {
                // Check for existing source with same configuration
                const existing = await sourceRepository.findExisting(
                    id,
                    body.connectionId,
                    body.sourceType,
                    body.sourceConfig
                );

                if (existing) {
                    return reply.status(409).send({
                        success: false,
                        error: "A source with this configuration already exists",
                        data: { sourceId: existing.id }
                    });
                }

                // Create the source
                const source = await sourceRepository.create({
                    knowledgeBaseId: id,
                    connectionId: body.connectionId,
                    provider: connection.provider,
                    sourceType: body.sourceType,
                    sourceConfig: body.sourceConfig,
                    syncEnabled: body.syncEnabled,
                    syncIntervalMinutes: body.syncIntervalMinutes
                });

                // Start initial import workflow
                let workflowId: string | undefined;
                try {
                    const client = await getTemporalClient();
                    workflowId = `integration-import-${source.id}-initial`;

                    await client.workflow.start("integrationImportWorkflow", {
                        taskQueue: "flowmaestro-orchestrator",
                        workflowId,
                        args: [
                            {
                                sourceId: source.id,
                                knowledgeBaseId: id,
                                connectionId: body.connectionId,
                                provider: connection.provider,
                                sourceConfig: body.sourceConfig,
                                isInitialImport: true
                            }
                        ]
                    });

                    // Update source status to syncing
                    await sourceRepository.updateSyncStatus(source.id, "syncing");
                } catch (error) {
                    logger.error(
                        { sourceId: source.id, err: error },
                        "Failed to start import workflow"
                    );
                    // Don't fail the request, source is created
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        sourceId: source.id,
                        jobId: workflowId
                    }
                });
            } catch (error) {
                logger.error({ kbId: id, err: error }, "Failed to create source");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to create source"
                });
            }
        }
    );

    // PUT /:id/integration/sources/:sourceId - Update a source
    fastify.put<{
        Params: { id: string; sourceId: string };
        Body: UpdateSourceBody;
    }>(
        "/:id/integration/sources/:sourceId",
        {
            preHandler: [authMiddleware],
            schema: {
                body: {
                    type: "object",
                    properties: {
                        syncEnabled: { type: "boolean" },
                        syncIntervalMinutes: { type: "number", minimum: 5 }
                    }
                }
            }
        },
        async (request, reply) => {
            const { id, sourceId } = request.params;
            const body = request.body;

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

            try {
                const updated = await sourceRepository.update(sourceId, {
                    syncEnabled: body.syncEnabled,
                    syncIntervalMinutes: body.syncIntervalMinutes
                });

                return reply.send({
                    success: true,
                    data: updated
                });
            } catch (error) {
                logger.error({ sourceId, err: error }, "Failed to update source");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to update source"
                });
            }
        }
    );

    // DELETE /:id/integration/sources/:sourceId - Delete a source
    fastify.delete<{ Params: { id: string; sourceId: string } }>(
        "/:id/integration/sources/:sourceId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
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

            try {
                // Delete the source (documents will have source_id set to NULL via FK)
                await sourceRepository.delete(sourceId);

                return reply.send({
                    success: true,
                    message: "Source deleted successfully"
                });
            } catch (error) {
                logger.error({ sourceId, err: error }, "Failed to delete source");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to delete source"
                });
            }
        }
    );
}
