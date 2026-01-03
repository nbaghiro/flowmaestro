/**
 * Workflow Files Upload Endpoint
 *
 * Allows files to be uploaded before workflow execution.
 * Returns GCS URIs that can be passed as workflow inputs.
 */

import * as path from "path";
import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { SupportedFileTypes } from "../../../temporal/core/schemas";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("WorkflowFilesUpload");

export interface WorkflowFileUpload {
    fileName: string;
    fileType: string;
    gcsUri: string;
    fileSize: number;
}

export async function uploadWorkflowFilesRoute(fastify: FastifyInstance) {
    fastify.post(
        "/files/upload",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const uploadedFiles: WorkflowFileUpload[] = [];
            const gcsService = getGCSStorageService();

            // Generate a unique folder for this upload batch
            const uploadBatchId = `workflow-files-${Date.now()}`;

            // Handle multiple file uploads
            const files = request.files();

            for await (const file of files) {
                const fileExtension = path.extname(file.filename).toLowerCase().substring(1);

                // Validate file type
                if (
                    !SupportedFileTypes.includes(
                        fileExtension as (typeof SupportedFileTypes)[number]
                    )
                ) {
                    return reply.status(400).send({
                        success: false,
                        error: `Unsupported file type: ${fileExtension}. Supported types: ${SupportedFileTypes.join(", ")}`
                    });
                }

                // Upload to GCS
                const gcsUri = await gcsService.upload(file.file, {
                    userId,
                    knowledgeBaseId: uploadBatchId,
                    filename: file.filename
                });

                // Get metadata for file size
                const metadata = await gcsService.getMetadata(gcsUri);

                uploadedFiles.push({
                    fileName: file.filename,
                    fileType: fileExtension,
                    gcsUri,
                    fileSize: metadata.size
                });

                logger.info(
                    {
                        userId,
                        fileName: file.filename,
                        fileType: fileExtension,
                        fileSize: metadata.size
                    },
                    "Workflow file uploaded"
                );
            }

            if (uploadedFiles.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: "No files provided"
                });
            }

            logger.info(
                {
                    userId,
                    fileCount: uploadedFiles.length,
                    uploadBatchId
                },
                "Workflow files upload complete"
            );

            return reply.status(200).send({
                success: true,
                data: {
                    files: uploadedFiles,
                    uploadBatchId
                }
            });
        }
    );
}
