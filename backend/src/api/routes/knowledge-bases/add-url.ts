import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import {
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository
} from "../../../storage/repositories";
import { documentProcessor } from "../../../trigger/tasks";
import { authMiddleware } from "../../middleware";
import { serializeDocument } from "./utils";

const logger = createServiceLogger("KnowledgeBaseUrl");

interface AddUrlBody {
    url: string;
    name?: string;
}

export async function addUrlRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: { id: string }; Body: AddUrlBody }>(
        "/:id/documents/url",
        {
            preHandler: [authMiddleware],
            schema: {
                body: {
                    type: "object",
                    required: ["url"],
                    properties: {
                        url: {
                            type: "string"
                        },
                        name: {
                            type: ["string", "null"]
                        }
                    }
                }
            },
            attachValidation: true
        },
        async (request, reply) => {
            // Handle validation errors
            if (request.validationError) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: request.validationError.message
                });
            }

            const kbRepository = new KnowledgeBaseRepository();
            const docRepository = new KnowledgeDocumentRepository();
            const params = request.params;
            const body = request.body || {};

            // Validate body exists and has required fields
            if (!body || typeof body !== "object" || !body.url) {
                return reply.status(400).send({
                    success: false,
                    error: "Request body must contain a 'url' field"
                });
            }

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

            // Validate URL
            if (!body.url || typeof body.url !== "string") {
                return reply.status(400).send({
                    success: false,
                    error: "URL is required and must be a string"
                });
            }

            // Validate URL format
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(body.url);
                // Only allow http and https protocols
                if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                    return reply.status(400).send({
                        success: false,
                        error: "URL must use http or https protocol"
                    });
                }
            } catch (_error) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid URL format"
                });
            }

            // Create document record
            const documentName = body.name?.trim() || parsedUrl.hostname;

            const document = await docRepository.create({
                knowledge_base_id: params.id,
                name: documentName,
                source_type: "url",
                source_url: body.url,
                file_type: "html"
            });

            // Trigger document processing via Trigger.dev (non-blocking)
            let taskId: string | undefined;
            try {
                const run = await documentProcessor.trigger({
                    documentId: document.id,
                    knowledgeBaseId: params.id,
                    filePath: "",
                    fileType: "html",
                    userId: request.user!.id,
                    sourceUrl: body.url
                });
                taskId = run.id;
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(`Failed to trigger document processor: ${errorMsg}`);
                logger.error(
                    { documentId: document.id, url: body.url, error },
                    "Document processing trigger failed"
                );
            }

            return reply.status(201).send({
                success: true,
                data: {
                    document: serializeDocument(document),
                    taskId
                },
                message: "URL added successfully and processing started"
            });
        }
    );
}
