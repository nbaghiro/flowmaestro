import { FastifyInstance } from "fastify";
import { createFormInterfaceRoute } from "./create";
import { deleteFormInterfaceRoute } from "./delete";
import { duplicateFormInterfaceRoute } from "./duplicate";
import { getFormInterfaceRoute } from "./get";
import { listFormInterfacesRoute } from "./list";
import { publishFormInterfaceRoute } from "./publish";
import { submissionFileDownloadRoute } from "./submission-file-download";
import { listFormInterfaceSubmissionsRoute } from "./submissions";
import { unpublishFormInterfaceRoute } from "./unpublish";
import { updateFormInterfaceRoute } from "./update";
import { uploadFormInterfaceAssetRoute } from "./upload-assets";

export async function formInterfaceRoutes(fastify: FastifyInstance) {
    // Form interface management routes (requires auth)
    fastify.register(
        async (instance) => {
            instance.register(createFormInterfaceRoute);
            instance.register(listFormInterfacesRoute);
            instance.register(getFormInterfaceRoute);
            instance.register(updateFormInterfaceRoute);
            instance.register(deleteFormInterfaceRoute);
            instance.register(publishFormInterfaceRoute);
            instance.register(unpublishFormInterfaceRoute);
            instance.register(duplicateFormInterfaceRoute);
            instance.register(uploadFormInterfaceAssetRoute);
            instance.register(listFormInterfaceSubmissionsRoute);
            instance.register(submissionFileDownloadRoute);
        },
        { prefix: "/form-interfaces" }
    );
}
