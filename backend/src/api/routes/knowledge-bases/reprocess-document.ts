import { FastifyInstance } from "fastify";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository,
    KnowledgeChunkRepository
} from "../../../storage/repositories";
import { documentProcessor } from "../../../trigger/tasks";
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

            // Trigger document reprocessing via Trigger.dev
            const run = await documentProcessor.trigger({
                documentId: document.id,
                knowledgeBaseId: params.id,
                filePath: document.file_path || "",
                fileType: document.file_type,
                userId: request.user!.id,
                sourceUrl: document.source_url || undefined
            });

            return reply.send({
                success: true,
                data: {
                    documentId: document.id,
                    taskId: run.id
                },
                message: "Document reprocessing started"
            });
        }
    );
}
