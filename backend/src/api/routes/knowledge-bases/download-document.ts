import { FastifyInstance } from "fastify";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function downloadDocumentRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/documents/:docId/download",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string; docId: string };

            // Verify knowledge base ownership
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

            // Verify document belongs to this knowledge base
            if (document.knowledge_base_id !== params.id) {
                return reply.status(404).send({
                    success: false,
                    error: "Document not found in this knowledge base"
                });
            }

            // Only support file downloads (not URLs)
            if (document.source_type !== "file") {
                return reply.status(400).send({
                    success: false,
                    error: "Cannot download URL-based documents"
                });
            }

            if (!document.file_path) {
                return reply.status(400).send({
                    success: false,
                    error: "Document has no file path"
                });
            }

            // Generate signed URL (default 1 hour expiration)
            const gcsService = getGCSStorageService();
            const expiresIn = 3600;

            try {
                const signedUrl = await gcsService.getSignedDownloadUrl(
                    document.file_path,
                    expiresIn
                );

                const expiresAt = new Date(Date.now() + expiresIn * 1000);

                return reply.send({
                    success: true,
                    data: {
                        url: signedUrl,
                        expiresAt: expiresAt.toISOString(),
                        expiresIn: expiresIn,
                        filename: document.name
                    }
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(`Error generating signed URL: ${errorMsg}`);
                return reply.status(500).send({
                    success: false,
                    error: "Failed to generate download URL"
                });
            }
        }
    );
}
