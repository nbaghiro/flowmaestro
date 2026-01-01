import * as path from "path";
import { PassThrough } from "stream";
import { FastifyInstance } from "fastify";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

function normalizeAssetType(value?: string): "cover" | "icon" | null {
    if (!value) return null;
    if (value === "cover" || value === "icon") return value;
    return null;
}

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^\w\s.-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_{2,}/g, "_")
        .trim();
}

async function uploadInterfaceAsset(params: {
    userId: string;
    interfaceId: string;
    assetType: "cover" | "icon";
    file: {
        filename: string;
        mimetype: string;
        stream: NodeJS.ReadableStream;
    };
}) {
    const gcsService = getGCSStorageService();
    const ext = path.extname(params.file.filename).toLowerCase();
    const assetFilename = `${params.assetType}${ext}`;
    const gcsPath = `users/${params.userId}/interfaces/${params.interfaceId}/${assetFilename}`;
    const passThrough = new PassThrough();

    const uploadPromise = gcsService.uploadToPath(passThrough, {
        path: gcsPath,
        contentType: params.file.mimetype,
        metadata: {
            uploadedBy: params.userId,
            interfaceId: params.interfaceId,
            assetType: params.assetType,
            originalFilename: sanitizeFilename(params.file.filename),
            uploadedAt: new Date().toISOString()
        }
    });

    params.file.stream.pipe(passThrough);
    const gcsUri = await uploadPromise;

    return gcsUri;
}

export async function uploadFormInterfaceAssetRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/assets",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const query = request.query as { type?: string };

            const repo = new FormInterfaceRepository();
            const iface = await repo.findById(id, userId);

            if (!iface) {
                throw new NotFoundError("Form interface not found");
            }

            if (!request.isMultipart()) {
                return reply.status(400).send({
                    success: false,
                    error: "Multipart form data is required."
                });
            }

            const parts = request.parts();
            let assetType = normalizeAssetType(query.type);
            let file: { filename: string; mimetype: string; stream: NodeJS.ReadableStream } | null =
                null;

            for await (const part of parts) {
                if (part.type === "file" && !file) {
                    file = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                        stream: part.file
                    };
                    continue;
                }

                if (
                    part.type === "field" &&
                    !assetType &&
                    (part.fieldname === "type" || part.fieldname === "assetType")
                ) {
                    assetType = normalizeAssetType(String(part.value));
                }
            }

            if (!assetType) {
                return reply.status(400).send({
                    success: false,
                    error: "Asset type is required ('cover' or 'icon')."
                });
            }

            if (!file) {
                return reply.status(400).send({
                    success: false,
                    error: "No file provided."
                });
            }

            if (!file.mimetype.startsWith("image/")) {
                return reply.status(400).send({
                    success: false,
                    error: "Only image uploads are supported for interface assets."
                });
            }

            const gcsUri = await uploadInterfaceAsset({
                userId,
                interfaceId: id,
                assetType,
                file
            });

            const updated = await repo.update(id, userId, {
                ...(assetType === "cover"
                    ? { coverType: "image", coverValue: gcsUri }
                    : { iconUrl: gcsUri })
            });

            return reply.send({
                success: true,
                data: {
                    interface: updated,
                    asset: {
                        type: assetType,
                        gcsUri
                    }
                }
            });
        }
    );
}
