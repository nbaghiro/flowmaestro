import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getArtifactsStorageService } from "../../../services/GCSStorageService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { formInterfaceFileUploadRateLimiter } from "../../middleware/formInterfaceRateLimiter";

const logger = createServiceLogger("PublicFormInterfaceFiles");

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Sanitize filename for safe GCS storage
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^\w\s.-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_{2,}/g, "_")
        .trim();
}

export async function publicFormInterfaceFilesRoutes(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();

    /**
     * POST /api/public/form-interfaces/:slug/upload
     * Upload a file for a form interface submission
     * Rate limited: 20 uploads/min/IP
     * Max file size: 25MB
     */
    fastify.post(
        "/:slug/upload",
        {
            preHandler: [formInterfaceFileUploadRateLimiter]
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };

            try {
                // Find the form interface
                const formInterface = await formInterfaceRepo.findBySlug(slug);

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Check if file upload is allowed
                if (!formInterface.allowFileUpload) {
                    return reply.status(400).send({
                        success: false,
                        error: "File upload is not allowed for this form"
                    });
                }

                // Get the uploaded file using fastify-multipart
                const data = await request.file();

                if (!data) {
                    return reply.status(400).send({
                        success: false,
                        error: "No file provided"
                    });
                }

                // Validate file size
                const fileBuffer = await data.toBuffer();
                const maxSizeBytes = (formInterface.maxFileSizeMb || 25) * 1024 * 1024;

                if (fileBuffer.length > maxSizeBytes) {
                    return reply.status(400).send({
                        success: false,
                        error: `File size exceeds maximum of ${formInterface.maxFileSizeMb || 25}MB`
                    });
                }

                if (fileBuffer.length > MAX_FILE_SIZE) {
                    return reply.status(400).send({
                        success: false,
                        error: "File size exceeds maximum of 25MB"
                    });
                }

                // Validate file type if restrictions are set
                const allowedTypes = formInterface.allowedFileTypes || [];
                if (allowedTypes.length > 0) {
                    const mimeType = data.mimetype;
                    const isAllowed = allowedTypes.some((allowed) => {
                        if (allowed.endsWith("/*")) {
                            // Wildcard match (e.g., "image/*")
                            const prefix = allowed.slice(0, -2);
                            return mimeType.startsWith(prefix);
                        }
                        return mimeType === allowed;
                    });

                    if (!isAllowed) {
                        return reply.status(400).send({
                            success: false,
                            error: `File type ${mimeType} is not allowed`
                        });
                    }
                }

                // Generate a session ID for grouping files (use timestamp + random)
                const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const sanitizedFilename = sanitizeFilename(data.filename);
                const fileName = `form-submissions/${formInterface.id}/${sessionId}/${Date.now()}_${sanitizedFilename}`;

                // Upload to GCS artifacts bucket (PRIVATE)
                const gcsService = getArtifactsStorageService();
                const gcsUri = await gcsService.uploadBuffer(fileBuffer, {
                    fileName,
                    contentType: data.mimetype
                });

                // Generate signed URL valid for 24 hours (for workflow/agent access)
                const downloadUrl = await gcsService.getSignedDownloadUrl(gcsUri, 86400);

                logger.info(
                    {
                        formInterfaceId: formInterface.id,
                        filename: data.filename,
                        size: fileBuffer.length,
                        mimeType: data.mimetype
                    },
                    "File uploaded for form interface"
                );

                return reply.send({
                    success: true,
                    data: {
                        gcsUri,
                        downloadUrl,
                        fileName: data.filename,
                        fileSize: fileBuffer.length,
                        mimeType: data.mimetype
                    }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                logger.error(
                    {
                        slug,
                        error: errorMessage,
                        stack: errorStack
                    },
                    "Error uploading file for form interface"
                );
                return reply.status(500).send({
                    success: false,
                    error: "Failed to upload file"
                });
            }
        }
    );
}
