import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { getUploadsStorageService } from "../../../services/GCSStorageService";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function uploadChatInterfaceAssetRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/assets",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                // Check if chat interface exists
                const existing = await chatInterfaceRepo.findById(id, userId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
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

                // Upload to GCS uploads bucket
                // We use "chat-interfaces/{id}/{assetType}" as the folder path
                const gcsService = getUploadsStorageService();
                const gcsUri = await gcsService.upload(data.file, {
                    userId,
                    knowledgeBaseId: `chat-interfaces/${id}/${assetType}`,
                    filename: data.filename
                });

                // Get public URL (uploads bucket is publicly readable)
                const publicUrl = gcsService.getPublicUrl(gcsUri);

                // Update chat interface with new asset URL
                let updateData = {};
                if (assetType === "cover") {
                    updateData = { coverType: "image", coverValue: publicUrl };
                } else {
                    updateData = { iconUrl: publicUrl };
                }

                const chatInterface = await chatInterfaceRepo.update(id, userId, updateData);

                logger.info(
                    { chatInterfaceId: id, assetType, userId },
                    "Chat interface asset uploaded"
                );

                return reply.send({
                    success: true,
                    data: {
                        url: publicUrl,
                        assetType,
                        chatInterface
                    }
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error uploading chat interface asset");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
