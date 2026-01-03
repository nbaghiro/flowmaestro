import { FastifyInstance } from "fastify";
import type { PublicFormInterface } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import { formInterfaceRateLimiter } from "../../middleware/formInterfaceRateLimiter";

const logger = createServiceLogger("PublicFormInterfaceRoutes");

/**
 * Maps a FormInterface to PublicFormInterface (strips sensitive fields)
 */
function toPublicFormInterface(formInterface: {
    id: string;
    slug: string;
    coverType: string;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;
    inputPlaceholder: string;
    inputLabel: string;
    fileUploadLabel: string;
    urlInputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    submitButtonText: string;
    submitLoadingText: string;
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;
}): PublicFormInterface {
    return {
        id: formInterface.id,
        slug: formInterface.slug,
        coverType: formInterface.coverType as PublicFormInterface["coverType"],
        coverValue: formInterface.coverValue,
        iconUrl: formInterface.iconUrl,
        title: formInterface.title,
        description: formInterface.description,
        inputPlaceholder: formInterface.inputPlaceholder,
        inputLabel: formInterface.inputLabel,
        fileUploadLabel: formInterface.fileUploadLabel,
        urlInputLabel: formInterface.urlInputLabel,
        allowFileUpload: formInterface.allowFileUpload,
        allowUrlInput: formInterface.allowUrlInput,
        maxFiles: formInterface.maxFiles,
        maxFileSizeMb: formInterface.maxFileSizeMb,
        allowedFileTypes: formInterface.allowedFileTypes,
        submitButtonText: formInterface.submitButtonText,
        submitLoadingText: formInterface.submitLoadingText,
        outputLabel: formInterface.outputLabel,
        showCopyButton: formInterface.showCopyButton,
        showDownloadButton: formInterface.showDownloadButton,
        allowOutputEdit: formInterface.allowOutputEdit
    };
}

export async function publicFormInterfaceRoutes(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();
    const submissionRepo = new FormInterfaceSubmissionRepository();

    /**
     * GET /api/public/form-interfaces/:slug
     * Get a published form interface for rendering (no auth required)
     */
    fastify.get("/:slug", async (request, reply) => {
        const { slug } = request.params as { slug: string };

        try {
            const formInterface = await formInterfaceRepo.findBySlug(slug);

            if (!formInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Form interface not found"
                });
            }

            return reply.send({
                success: true,
                data: toPublicFormInterface(formInterface)
            });
        } catch (error) {
            logger.error({ slug, error }, "Error fetching public form interface");
            return reply.status(500).send({
                success: false,
                error: "Failed to load form interface"
            });
        }
    });

    /**
     * POST /api/public/form-interfaces/:slug/submit
     * Submit to a form interface (rate limited, no auth required)
     */
    fastify.post(
        "/:slug/submit",
        {
            preHandler: [formInterfaceRateLimiter]
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };
            const body = request.body as {
                message?: string;
                files?: Array<{
                    fileName: string;
                    fileSize: number;
                    mimeType: string;
                    gcsUri: string;
                }>;
                urls?: string[];
            };

            try {
                // Find the form interface
                const formInterface = await formInterfaceRepo.findBySlug(slug);

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Validate message is provided
                if (!body.message || body.message.trim() === "") {
                    return reply.status(400).send({
                        success: false,
                        error: "Message is required"
                    });
                }

                // Validate file count if files provided
                if (body.files && body.files.length > formInterface.maxFiles) {
                    return reply.status(400).send({
                        success: false,
                        error: `Maximum ${formInterface.maxFiles} files allowed`
                    });
                }

                // Create submission
                const submission = await submissionRepo.create({
                    interfaceId: formInterface.id,
                    message: body.message,
                    files: body.files || [],
                    urls: (body.urls || []).map((url) => ({ url })),
                    ipAddress: request.ip,
                    userAgent: request.headers["user-agent"] || null
                });

                logger.info(
                    { submissionId: submission.id, formInterfaceId: formInterface.id },
                    "Form interface submission received"
                );

                // Phase 1: Just return submission confirmation
                // Phase 2 will add workflow/agent execution
                return reply.status(201).send({
                    success: true,
                    data: {
                        submissionId: submission.id,
                        message: "Submission received successfully"
                    }
                });
            } catch (error) {
                logger.error({ slug, error }, "Error processing form interface submission");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to process submission"
                });
            }
        }
    );
}
