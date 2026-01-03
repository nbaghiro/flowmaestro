import { FastifyInstance } from "fastify";
import { uploadFormInterfaceAssetRoute } from "./assets";
import { createFormInterfaceRoute } from "./create";
import { deleteFormInterfaceRoute } from "./delete";
import { duplicateFormInterfaceRoute } from "./duplicate";
import { getFormInterfacesRoute } from "./get";
import { listFormInterfacesRoute } from "./list";
import { publishFormInterfaceRoute } from "./publish";
import { slugAvailabilityRoute } from "./slug-availability";
import { listFormInterfaceSubmissionsRoute } from "./submissions";
import { unpublishFormInterfaceRoute } from "./unpublish";
import { updateFormInterfaceRoute } from "./update";

export async function formInterfacesRoutes(fastify: FastifyInstance) {
    await createFormInterfaceRoute(fastify);
    await listFormInterfacesRoute(fastify);
    await getFormInterfacesRoute(fastify);
    await updateFormInterfaceRoute(fastify);
    await deleteFormInterfaceRoute(fastify);
    await publishFormInterfaceRoute(fastify);
    await unpublishFormInterfaceRoute(fastify);
    await duplicateFormInterfaceRoute(fastify);
    await slugAvailabilityRoute(fastify);
    await uploadFormInterfaceAssetRoute(fastify);
    await listFormInterfaceSubmissionsRoute(fastify);
}
