/**
 * Persona Instance Files Upload Endpoint
 *
 * POST /persona-instances/files
 *
 * Allows files to be uploaded before launching a persona task.
 * Returns file references that can be included in additional_context.file_uploads.
 */

import * as path from "path";
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createRequestLogger } from "../../../core/logging";
import { getUploadsStorageService } from "../../../services/GCSStorageService";
import { BadRequestError } from "../../middleware";

// Max file size: 50MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Default allowed extensions (can be overridden by field validation)
const DEFAULT_ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "md",
    "csv",
    "json",
    "html",
    "xml",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg"
];

export interface PersonaFileUploadResult {
    gcs_uri: string;
    filename: string;
    file_type: string;
    file_size_bytes: number;
    field_name: string;
    signed_url: string;
}

const uploadQuerySchema = z.object({
    // Field name from the persona input_fields (e.g., "design_files")
    field_name: z.string().optional().default("files"),
    // Optional: override allowed extensions (comma-separated)
    allowed_extensions: z.string().optional(),
    // Optional: override max file size
    max_file_size_bytes: z.coerce.number().optional()
});

export async function uploadPersonaFilesHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const user = request.user;
    const workspaceId = request.headers["x-workspace-id"] as string;

    if (!user || !workspaceId) {
        throw new BadRequestError("User and workspace context required");
    }

    const query = uploadQuerySchema.parse(request.query);
    const fieldName = query.field_name;

    // Parse allowed extensions from query or use defaults
    const allowedExtensions = query.allowed_extensions
        ? query.allowed_extensions.split(",").map((e) => e.trim().toLowerCase())
        : DEFAULT_ALLOWED_EXTENSIONS;

    const maxFileSize = query.max_file_size_bytes || MAX_FILE_SIZE_BYTES;

    logger.info(
        {
            userId: user.id,
            workspaceId,
            fieldName,
            allowedExtensions
        },
        "Processing persona file upload"
    );

    const uploadedFiles: PersonaFileUploadResult[] = [];
    const gcsService = getUploadsStorageService();

    // Generate a unique folder for this upload batch
    const uploadBatchId = `persona-files-${Date.now()}`;

    // Handle multiple file uploads
    const files = request.files();

    for await (const file of files) {
        const fileExtension = path.extname(file.filename).toLowerCase().substring(1);

        // Validate file extension
        if (!allowedExtensions.includes(fileExtension)) {
            throw new BadRequestError(
                `Unsupported file type: ${fileExtension}. Allowed types: ${allowedExtensions.join(", ")}`
            );
        }

        // Upload to GCS
        const gcsUri = await gcsService.upload(file.file, {
            userId: user.id,
            knowledgeBaseId: uploadBatchId,
            filename: file.filename
        });

        // Get metadata for file size
        const metadata = await gcsService.getMetadata(gcsUri);

        // Validate file size
        if (metadata.size > maxFileSize) {
            // Delete the uploaded file since it's too large
            await gcsService.delete(gcsUri);
            throw new BadRequestError(
                `File "${file.filename}" exceeds maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`
            );
        }

        // Generate signed URL for preview (1 hour expiry)
        const signedUrl = await gcsService.getSignedDownloadUrl(gcsUri, 3600);

        uploadedFiles.push({
            gcs_uri: gcsUri,
            filename: file.filename,
            file_type: fileExtension,
            file_size_bytes: metadata.size,
            field_name: fieldName,
            signed_url: signedUrl
        });

        logger.info(
            {
                userId: user.id,
                fileName: file.filename,
                fileType: fileExtension,
                fileSize: metadata.size,
                fieldName
            },
            "Persona file uploaded"
        );
    }

    if (uploadedFiles.length === 0) {
        throw new BadRequestError("No files provided");
    }

    logger.info(
        {
            userId: user.id,
            fileCount: uploadedFiles.length,
            uploadBatchId
        },
        "Persona files upload complete"
    );

    reply.code(200).send({
        success: true,
        data: {
            files: uploadedFiles,
            upload_batch_id: uploadBatchId
        }
    });
}
