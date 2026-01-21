import { FastifyInstance } from "fastify";
import { optionalAuthMiddleware } from "../../middleware/auth";
import { getPersonasByCategoryHandler } from "./categories";
import { getPersonaHandler } from "./get";
import { listPersonasHandler } from "./list";

export async function personaRoutes(fastify: FastifyInstance) {
    // Persona definition routes - public (no auth required for browsing)
    // Use optional auth to track usage if user is logged in
    fastify.addHook("preHandler", optionalAuthMiddleware);

    // List all personas
    fastify.get("/", listPersonasHandler);

    // Get personas grouped by category (for gallery view)
    fastify.get("/categories", getPersonasByCategoryHandler);

    // Get single persona by slug
    fastify.get("/:slug", getPersonaHandler);
}
