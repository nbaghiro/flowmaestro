import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { NotFoundError } from "../../middleware";

export async function getPublicFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.get("/:slug", async (request, reply) => {
        const { slug } = request.params as { slug: string };
        const repo = new FormInterfaceRepository();
        const iface = await repo.findBySlug(slug);

        if (!iface) {
            throw new NotFoundError("Form interface not found");
        }

        return reply.send({
            success: true,
            data: {
                id: iface.id,
                slug: iface.slug,
                coverType: iface.coverType,
                coverValue: iface.coverValue,
                iconUrl: iface.iconUrl,
                title: iface.title,
                description: iface.description,
                inputPlaceholder: iface.inputPlaceholder,
                inputLabel: iface.inputLabel,
                allowFileUpload: iface.allowFileUpload,
                allowUrlInput: iface.allowUrlInput,
                maxFiles: iface.maxFiles,
                maxFileSizeMb: iface.maxFileSizeMb,
                allowedFileTypes: iface.allowedFileTypes,
                submitButtonText: iface.submitButtonText,
                submitLoadingText: iface.submitLoadingText,
                outputLabel: iface.outputLabel,
                showCopyButton: iface.showCopyButton,
                showDownloadButton: iface.showDownloadButton,
                allowOutputEdit: iface.allowOutputEdit
            }
        });
    });
}
