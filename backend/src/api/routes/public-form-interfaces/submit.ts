import { PassThrough } from "stream";
import type { InterfaceFileAttachment, InterfaceUrlAttachment } from "@flowmaestro/shared";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { InterfaceSubmissionRepository } from "../../../storage/repositories/InterfaceSubmissionRepository";
import { NotFoundError } from "../../middleware";
import { createInterfaceRateLimiter } from "../../middleware/interfaceRateLimiter";
import type { FastifyInstance } from "fastify";

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^\w\s.-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_{2,}/g, "_")
        .trim();
}

function parseUrls(values: string[]): InterfaceUrlAttachment[] {
    const urls: string[] = [];

    values.forEach((value) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    parsed.forEach((item) => {
                        if (typeof item === "string") urls.push(item);
                    });
                    return;
                }
            } catch {
                // fall back to raw string handling
            }
        }

        trimmed
            .split(/[\n,]/)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .forEach((entry) => urls.push(entry));
    });

    return urls.map((url) => ({ url }));
}

async function uploadSubmissionFile(params: {
    userId: string;
    interfaceId: string;
    filename: string;
    mimetype: string;
    stream: NodeJS.ReadableStream;
    submissionPrefix: string;
}) {
    const gcsService = getGCSStorageService();
    const safeName = sanitizeFilename(params.filename) || "upload";
    const gcsPath = `users/${params.userId}/interfaces/${params.interfaceId}/submissions/${params.submissionPrefix}/${safeName}`;
    const passThrough = new PassThrough();
    let fileSize = 0;

    passThrough.on("data", (chunk) => {
        fileSize += chunk.length;
    });

    const uploadPromise = gcsService.uploadToPath(passThrough, {
        path: gcsPath,
        contentType: params.mimetype,
        metadata: {
            uploadedBy: params.userId,
            interfaceId: params.interfaceId,
            submissionPrefix: params.submissionPrefix,
            originalFilename: safeName,
            uploadedAt: new Date().toISOString()
        }
    });

    params.stream.pipe(passThrough);

    const gcsUri = await uploadPromise;

    return {
        gcsUri,
        fileSize
    };
}

export async function submitPublicFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:slug/submit",
        {
            preHandler: [createInterfaceRateLimiter()]
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };
            const repo = new FormInterfaceRepository();
            const iface = await repo.findBySlug(slug);

            if (!iface) {
                throw new NotFoundError("Form interface not found");
            }

            let message: string | null = null;
            const urlFields: string[] = [];
            const files: InterfaceFileAttachment[] = [];
            const submissionPrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            if (request.isMultipart()) {
                const parts = request.parts();
                for await (const part of parts) {
                    if (part.type === "file") {
                        if (!iface.allowFileUpload) {
                            return reply.status(400).send({
                                success: false,
                                error: "File uploads are not allowed for this interface."
                            });
                        }
                        if (files.length >= iface.maxFiles) {
                            return reply.status(400).send({
                                success: false,
                                error: `Maximum ${iface.maxFiles} files allowed.`
                            });
                        }
                        const uploaded = await uploadSubmissionFile({
                            userId: iface.userId,
                            interfaceId: iface.id,
                            filename: part.filename,
                            mimetype: part.mimetype,
                            stream: part.file,
                            submissionPrefix
                        });

                        files.push({
                            fileName: part.filename,
                            fileSize: uploaded.fileSize,
                            mimeType: part.mimetype,
                            gcsUri: uploaded.gcsUri
                        });
                        continue;
                    }

                    if (part.fieldname === "message") {
                        message = String(part.value);
                    }

                    if (part.fieldname === "urls" || part.fieldname === "urls[]") {
                        urlFields.push(String(part.value));
                    }
                }
            } else if (request.body && typeof request.body === "object") {
                const body = request.body as { message?: string; urls?: string[] };
                message = body.message ?? null;
                if (Array.isArray(body.urls)) {
                    urlFields.push(...body.urls);
                }
            }

            if (!iface.allowUrlInput && urlFields.length > 0) {
                return reply.status(400).send({
                    success: false,
                    error: "URL inputs are not allowed for this interface."
                });
            }

            const urls: InterfaceUrlAttachment[] = iface.allowUrlInput ? parseUrls(urlFields) : [];

            const submissionRepo = new InterfaceSubmissionRepository();
            const submission = await submissionRepo.create({
                interfaceId: iface.id,
                message,
                files,
                urls,
                ipAddress: request.ip ?? null,
                userAgent: request.headers["user-agent"] ?? null
            });

            return reply.status(201).send({
                success: true,
                data: submission
            });
        }
    );
}
