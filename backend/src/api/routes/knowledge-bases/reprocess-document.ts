import { FastifyInstance } from "fastify";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository,
    KnowledgeChunkRepository
} from "../../../storage/repositories";
import { getTemporalClient } from "../../../temporal/client";
import { TASK_QUEUES } from "../../../temporal/core/constants";
import { authMiddleware } from "../../middleware";

export async function reprocessDocumentRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/documents/:docId/reprocess",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const chunkRepository = new KnowledgeChunkRepository();
            const params = request.params as { id: string; docId: string };

            // Verify KB ownership
            const kb = await kbRepository.findById(params.id);
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

            // Get document
            const document = await docRepository.findById(params.docId);
            if (!document) {
                return reply.status(404).send({
                    success: false,
                    error: "Document not found"
                });
            }

            // Verify document belongs to this KB
            if (document.knowledge_base_id !== params.id) {
                return reply.status(400).send({
                    success: false,
                    error: "Document does not belong to this knowledge base"
                });
            }

            // Delete existing chunks for this document
            await chunkRepository.deleteByDocumentId(params.docId);

            // Reset document status to pending
            await docRepository.updateStatus(params.docId, "pending");

            // Clear error message and processing timestamps
            await docRepository.update(params.docId, {
                error_message: undefined,
                content: undefined // Will be re-extracted
            });

            // Start Temporal workflow to reprocess the document
            const client = await getTemporalClient();
            const workflowId = `process-document-${document.id}-${Date.now()}`; // Unique ID for retry

            await client.workflow.start("processDocumentWorkflow", {
                taskQueue: TASK_QUEUES.ORCHESTRATOR,
                workflowId,
                args: [
                    {
                        documentId: document.id,
                        knowledgeBaseId: params.id,
                        filePath: document.file_path || undefined,
                        sourceUrl: document.source_url || undefined,
                        fileType: document.file_type,
                        userId: request.user!.id
                    }
                ]
            });

            return reply.send({
                success: true,
                data: {
                    documentId: document.id,
                    workflowId
                },
                message: "Document reprocessing started"
            });
        }
    );
}
