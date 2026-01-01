import { FastifyInstance } from "fastify";
import { getPublicFormInterfaceRoute } from "./get";
import { submitPublicFormInterfaceRoute } from "./submit";

export async function publicFormInterfacesRoutes(fastify: FastifyInstance) {
    await getPublicFormInterfaceRoute(fastify);
    await submitPublicFormInterfaceRoute(fastify);
}
