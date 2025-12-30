import { FastifyInstance } from "fastify";
import { createFormInterfaceRoute } from "./create";
import { deleteFormInterfaceRoute } from "./delete";
import { getFormInterfacesRoute } from "./get";
import { listFormInterfacesRoute } from "./list";
import { publishFormInterfaceRoute } from "./publish";
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
}
