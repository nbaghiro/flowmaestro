/**
 * Integration Browse Route
 *
 * GET /knowledge-bases/:id/integration/:connectionId/browse
 * Browse files/folders in an integration provider
 */

import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { integrationDocumentService } from "../../../../services/integration-documents";
import { KnowledgeBaseRepository } from "../../../../storage/repositories";
import { ConnectionRepository } from "../../../../storage/repositories/ConnectionRepository";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("IntegrationBrowse");

interface BrowseQuery {
    folderId?: string;
    pageToken?: string;
    query?: string;
    pageSize?: string;
}

export async function integrationBrowseRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { id: string; connectionId: string };
        Querystring: BrowseQuery;
    }>(
        "/:id/integration/:connectionId/browse",
        {
            preHandler: [authMiddleware],
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        folderId: { type: "string" },
                        pageToken: { type: "string" },
                        query: { type: "string" },
                        pageSize: { type: "string" }
                    }
                }
            }
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const connectionRepository = new ConnectionRepository();
            const { id, connectionId } = request.params;
            const { folderId, pageToken, query, pageSize } = request.query;

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

            // Verify connection belongs to the workspace
            const connection = await connectionRepository.findByIdAndWorkspaceId(
                connectionId,
                kb.workspace_id
            );
            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            try {
                let result;

                if (query) {
                    // Search mode
                    result = await integrationDocumentService.searchConnection(
                        connectionId,
                        query,
                        {
                            pageToken,
                            pageSize: pageSize ? parseInt(pageSize, 10) : undefined
                        }
                    );
                } else {
                    // Browse mode
                    result = await integrationDocumentService.browseConnection(connectionId, {
                        folderId,
                        pageToken,
                        pageSize: pageSize ? parseInt(pageSize, 10) : undefined
                    });
                }

                return reply.send({
                    success: true,
                    data: result
                });
            } catch (error) {
                logger.error(
                    { kbId: id, connectionId, folderId, err: error },
                    "Failed to browse integration"
                );

                // Handle specific error types
                const errorMessage = error instanceof Error ? error.message : "Failed to browse";

                if (errorMessage.includes("authentication") || errorMessage.includes("401")) {
                    return reply.status(401).send({
                        success: false,
                        error: "Connection authentication failed. Please reconnect."
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: errorMessage
                });
            }
        }
    );
}
