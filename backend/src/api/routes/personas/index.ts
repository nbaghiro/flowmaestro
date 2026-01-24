import { FastifyInstance } from "fastify";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { getAvailableConnectionsHandler } from "./available-connections";
import { getPersonasByCategoryHandler } from "./categories";
import { getPersonaHandler } from "./get";
import { listPersonasHandler } from "./list";
import { listTemplatesHandler, generateFromTemplateHandler } from "./templates";

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

    // Template routes
    fastify.get("/:slug/templates", listTemplatesHandler);
    fastify.post("/:slug/templates/:templateId/generate", generateFromTemplateHandler);

    // Available connections (requires auth + workspace context)
    fastify.get(
        "/:slug/available-connections",
        { preHandler: [authMiddleware, workspaceContextMiddleware] },
        getAvailableConnectionsHandler
    );
}
