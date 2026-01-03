import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadFormInterfaceAssetRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/assets",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                // Check if form interface exists
                const existing = await formInterfaceRepo.findById(id, userId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
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

                // Get asset type from field name or query param
                const assetType = (data.fieldname as string) || "cover"; // 'cover' or 'icon'

                if (assetType !== "cover" && assetType !== "icon") {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid asset type. Must be 'cover' or 'icon'"
                    });
                }

                // Validate MIME type
                if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
                    return reply.status(400).send({
                        success: false,
                        error: `Unsupported file type: ${data.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`
                    });
                }

                // Upload to GCS using the existing upload method
                // We use "form-interfaces/{id}/{assetType}" as the folder path
                const gcsService = getGCSStorageService();
                const gcsUri = await gcsService.upload(data.file, {
                    userId,
                    knowledgeBaseId: `form-interfaces/${id}/${assetType}`,
                    filename: data.filename
                });

                // Get signed URL for the uploaded file (1 year expiry)
                const signedUrl = await gcsService.getSignedDownloadUrl(gcsUri, 60 * 60 * 24 * 365);

                // Update form interface with new asset URL
                let updateData = {};
                if (assetType === "cover") {
                    updateData = { coverType: "image", coverValue: signedUrl };
                } else {
                    updateData = { iconUrl: signedUrl };
                }

                const formInterface = await formInterfaceRepo.update(id, userId, updateData);

                logger.info(
                    { formInterfaceId: id, assetType, userId },
                    "Form interface asset uploaded"
                );

                return reply.send({
                    success: true,
                    data: {
                        url: signedUrl,
                        assetType,
                        formInterface
                    }
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error uploading form interface asset");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
