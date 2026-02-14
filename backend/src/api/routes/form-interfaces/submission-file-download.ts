import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getArtifactsStorageService } from "../../../services/GCSStorageService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceSubmissionFileDownload");

/**
 * Route for form owners to regenerate signed URLs for submitted files
 * This allows viewing files after the original 24h signed URLs expire
 */
export async function submissionFileDownloadRoute(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();
    const submissionRepo = new FormInterfaceSubmissionRepository();

    /**
     * GET /:id/submissions/:submissionId/files/:fileIndex/download
     * Regenerate a signed URL for a submitted file
     *
     * Returns a new signed URL valid for 1 hour (default) or custom duration
     */
    fastify.get(
        "/:id/submissions/:submissionId/files/:fileIndex/download",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const { id, submissionId, fileIndex } = request.params as {
                id: string;
                submissionId: string;
                fileIndex: string;
            };
            const query = request.query as { expiresIn?: string };
            const workspaceId = request.workspace!.id;

            try {
                // Check if form interface exists and belongs to workspace
                const formInterface = await formInterfaceRepo.findByIdAndWorkspaceId(
                    id,
                    workspaceId
                );

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Find the submission
                const submission = await submissionRepo.findById(submissionId);

                if (!submission) {
                    return reply.status(404).send({
                        success: false,
                        error: "Submission not found"
                    });
                }

                // Verify submission belongs to this form interface
                if (submission.interfaceId !== id) {
                    return reply.status(403).send({
                        success: false,
                        error: "Submission does not belong to this form interface"
                    });
                }

                // Parse file index
                const index = parseInt(fileIndex, 10);
                if (isNaN(index) || index < 0) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid file index"
                    });
                }

                // Check if file exists at index
                if (!submission.files || index >= submission.files.length) {
                    return reply.status(404).send({
                        success: false,
                        error: "File not found at specified index"
                    });
                }

                const file = submission.files[index];

                // Validate file has GCS URI
                if (!file.gcsUri) {
                    return reply.status(400).send({
                        success: false,
                        error: "File does not have a valid storage reference"
                    });
                }

                // Parse expiration time (default 1 hour, max 7 days)
                let expiresIn = 3600; // 1 hour default
                if (query.expiresIn) {
                    const parsedExpires = parseInt(query.expiresIn, 10);
                    if (!isNaN(parsedExpires) && parsedExpires > 0) {
                        // Max 7 days (GCS limit)
                        expiresIn = Math.min(parsedExpires, 7 * 24 * 60 * 60);
                    }
                }

                // Generate new signed URL
                const gcsService = getArtifactsStorageService();
                const downloadUrl = await gcsService.getSignedDownloadUrl(file.gcsUri, expiresIn);

                logger.info(
                    {
                        formInterfaceId: id,
                        submissionId,
                        fileIndex: index,
                        fileName: file.fileName,
                        expiresIn
                    },
                    "Generated signed URL for submission file"
                );

                return reply.send({
                    success: true,
                    data: {
                        downloadUrl,
                        fileName: file.fileName,
                        fileSize: file.fileSize,
                        mimeType: file.mimeType,
                        expiresIn
                    }
                });
            } catch (error) {
                logger.error(
                    { id, submissionId, fileIndex, workspaceId, error },
                    "Error generating signed URL for submission file"
                );
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
