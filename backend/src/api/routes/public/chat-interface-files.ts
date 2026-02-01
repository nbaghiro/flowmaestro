import { Readable } from "stream";
import { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { ChatMessageAttachment } from "@flowmaestro/shared";
import { getUploadsStorageService } from "../../../services/GCSStorageService";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";
import { checkChatRateLimit } from "../../middleware/chatInterfaceRateLimiter";

const chatInterfaceSessionRepo = new ChatInterfaceSessionRepository();
const chatInterfaceRepo = new ChatInterfaceRepository();
const storageService = getUploadsStorageService();

export const publicChatInterfaceFileRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{
        Params: { slug: string; token: string };
    }>("/:slug/sessions/:token/files", async (request, reply) => {
        const { slug, token } = request.params;

        // 1. Validate session
        const session = await chatInterfaceSessionRepo.findBySlugAndToken(slug, token);
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        // 2. Check rate limit (20 uploads per minute per session)
        const rateLimit = await checkChatRateLimit(
            `file-upload:${session.interfaceId}`,
            token,
            20, // 20 uploads
            60 // per 60 seconds
        );
        if (!rateLimit.allowed) {
            return reply.status(429).send({
                error: "Too many file uploads. Please wait before uploading more files.",
                remaining: rateLimit.remaining,
                resetAt: rateLimit.resetAt
            });
        }

        // 3. Get chat interface config for validation rules
        const chatInterface = await chatInterfaceRepo.findBySlug(slug);
        if (!chatInterface) {
            return reply.status(404).send({ error: "Chat interface not found" });
        }

        // 4. Check if file uploads are enabled
        if (!chatInterface.allowFileUpload) {
            return reply.status(403).send({ error: "File uploads are not allowed for this chat" });
        }

        // 5. Get file
        let data;
        try {
            data = await request.file();
        } catch (parseError) {
            request.log.error({ err: parseError }, "Failed to parse multipart file");
            return reply.status(400).send({
                error: "Failed to parse file upload",
                details: parseError instanceof Error ? parseError.message : "Unknown parse error"
            });
        }

        if (!data) {
            return reply.status(400).send({ error: "No file uploaded" });
        }

        // 6. Validate file type
        const allowedTypes = chatInterface.allowedFileTypes;
        if (allowedTypes && allowedTypes.length > 0) {
            const mimeType = data.mimetype;
            const fileExt = data.filename.split(".").pop()?.toLowerCase() || "";

            // Check if the mime type or extension matches allowed types
            // allowedFileTypes can be like ["image/*", "application/pdf", ".txt"]
            const isAllowed = allowedTypes.some((allowed) => {
                // Handle wildcard mime types like "image/*"
                if (allowed.includes("/*")) {
                    const prefix = allowed.replace("/*", "/");
                    return mimeType.startsWith(prefix);
                }
                // Handle exact mime type match
                if (allowed.includes("/")) {
                    return mimeType === allowed;
                }
                // Handle extension match like ".txt" or "txt"
                const ext = allowed.startsWith(".") ? allowed.slice(1) : allowed;
                return fileExt === ext.toLowerCase();
            });

            if (!isAllowed) {
                return reply.status(400).send({
                    error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`
                });
            }
        }

        // 7. Buffer the file to check size
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        const fileSizeBytes = fileBuffer.length;
        const fileSizeMb = fileSizeBytes / (1024 * 1024);

        // 8. Validate file size
        if (chatInterface.maxFileSizeMb && fileSizeMb > chatInterface.maxFileSizeMb) {
            return reply.status(400).send({
                error: `File too large. Maximum size is ${chatInterface.maxFileSizeMb}MB`
            });
        }

        try {
            // 9. Upload to GCS using the buffered file
            const filename = data.filename;
            const attachmentId = nanoid();

            // Convert buffer to readable stream for upload
            const fileStream = Readable.from(fileBuffer);

            const gcsUri = await storageService.upload(fileStream, {
                userId: session.id,
                knowledgeBaseId: "attachments",
                filename: filename
            });

            // 10. Generate signed URL for access
            const signedUrl = await storageService.getSignedDownloadUrl(gcsUri, 24 * 60 * 60); // 24 hours

            // 11. Create attachment object with known size
            const attachment: ChatMessageAttachment = {
                id: attachmentId,
                type: "file",
                url: signedUrl,
                downloadUrl: signedUrl,
                fileName: filename,
                fileSize: fileSizeBytes,
                mimeType: data.mimetype,
                gcsUri: gcsUri
            };

            return reply.send({ success: true, data: attachment });
        } catch (error) {
            request.log.error(error, "File upload failed");
            return reply.status(500).send({ error: "File upload failed" });
        }
    });
};
