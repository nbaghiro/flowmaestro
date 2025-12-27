import * as path from "path";
import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { DocumentFileType } from "../../../storage/models/KnowledgeDocument";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { documentProcessor } from "../../../trigger/tasks";
import { authMiddleware } from "../../middleware";
import { serializeDocument } from "./utils";

const logger = createServiceLogger("KnowledgeBaseUpload");

export async function uploadDocumentRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/documents/upload",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params as { id: string };

            // Verify ownership
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

            // Handle multipart file upload
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({
                    success: false,
                    error: "No file provided"
                });
            }

            // Validate file type
            const fileExtension = path.extname(data.filename).toLowerCase().substring(1);
            const validExtensions = ["pdf", "docx", "doc", "txt", "md", "html", "json", "csv"];

            if (!validExtensions.includes(fileExtension)) {
                return reply.status(400).send({
                    success: false,
                    error: `Unsupported file type: ${fileExtension}. Supported types: ${validExtensions.join(", ")}`
                });
            }

            // Upload file to GCS
            const gcsService = getGCSStorageService();
            const gcsUri = await gcsService.upload(data.file, {
                userId: request.user!.id,
                knowledgeBaseId: params.id,
                filename: data.filename
            });

            // Get file metadata from GCS
            const metadata = await gcsService.getMetadata(gcsUri);

            // Create document record with GCS URI
            const document = await docRepository.create({
                knowledge_base_id: params.id,
                name: data.filename,
                source_type: "file",
                file_path: gcsUri,
                file_type: fileExtension as DocumentFileType,
                file_size: BigInt(metadata.size)
            });

            // Trigger document processing via Trigger.dev (non-blocking)
            let taskId: string | undefined;
            try {
                const run = await documentProcessor.trigger({
                    documentId: document.id,
                    knowledgeBaseId: params.id,
                    filePath: gcsUri,
                    fileType: fileExtension,
                    userId: request.user!.id
                });
                taskId = run.id;
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(`Failed to trigger document processor: ${errorMsg}`);
                logger.error({ documentId: document.id, error }, "Document processing trigger failed");
            }

            return reply.status(201).send({
                success: true,
                data: {
                    document: serializeDocument(document),
                    taskId
                },
                message: "Document uploaded successfully and processing started"
            });
        }
    );
}
