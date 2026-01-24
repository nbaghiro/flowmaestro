import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { BadRequestError, NotFoundError } from "../../middleware";
import type { PersonaConnectionRequirement } from "../../../storage/models/PersonaInstanceConnection";

const paramsSchema = z.object({
    slug: z.string().min(1)
});

interface MatchedConnection {
    id: string;
    name: string;
    provider: string;
    connection_method: string;
    status: string;
    requirement: PersonaConnectionRequirement | null;
    is_required: boolean;
    suggested_scopes: string[];
}

interface AvailableConnectionsResponse {
    persona_slug: string;
    persona_name: string;
    requirements: PersonaConnectionRequirement[];
    available_connections: MatchedConnection[];
    missing_required: PersonaConnectionRequirement[];
}

/**
 * GET /api/personas/:slug/available-connections
 * Get connections available for launching a persona instance
 *
 * Returns:
 * - The persona's connection requirements
 * - Available workspace connections that match requirements
 * - Missing required connections (if any)
 */
export async function getAvailableConnectionsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    const { slug } = paramsResult.data;

    // Get persona definition
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findBySlug(slug);

    if (!persona) {
        throw new NotFoundError("Persona not found");
    }

    const requirements = persona.connection_requirements || [];

    // Get all workspace connections
    const connRepo = new ConnectionRepository();
    const { connections: workspaceConnections } = await connRepo.findByWorkspaceId(workspaceId, {
        limit: 100,
        status: "active"
    });

    // Create a map of provider -> connections
    type ConnectionSummaryItem = (typeof workspaceConnections)[0];
    const connectionsByProvider = new Map<string, ConnectionSummaryItem[]>();
    for (const conn of workspaceConnections) {
        const existing = connectionsByProvider.get(conn.provider) || [];
        existing.push(conn);
        connectionsByProvider.set(conn.provider, existing);
    }

    // Match connections with requirements
    const availableConnections: MatchedConnection[] = [];
    const matchedProviders = new Set<string>();

    // First, add connections that match requirements
    for (const requirement of requirements) {
        const providerConnections = connectionsByProvider.get(requirement.provider) || [];

        for (const conn of providerConnections) {
            availableConnections.push({
                id: conn.id,
                name: conn.name,
                provider: conn.provider,
                connection_method: conn.connection_method,
                status: conn.status,
                requirement,
                is_required: requirement.required,
                suggested_scopes: requirement.suggested_scopes || []
            });
            matchedProviders.add(conn.provider);
        }
    }

    // Then, add other connections that don't match any requirement
    // (in case the persona can use them without explicit requirement)
    for (const conn of workspaceConnections) {
        if (!matchedProviders.has(conn.provider)) {
            availableConnections.push({
                id: conn.id,
                name: conn.name,
                provider: conn.provider,
                connection_method: conn.connection_method,
                status: conn.status,
                requirement: null,
                is_required: false,
                suggested_scopes: []
            });
        }
    }

    // Find missing required connections
    const missingRequired: PersonaConnectionRequirement[] = [];
    for (const requirement of requirements) {
        if (requirement.required) {
            const hasConnection = connectionsByProvider.has(requirement.provider);
            if (!hasConnection) {
                missingRequired.push(requirement);
            }
        }
    }

    const response: AvailableConnectionsResponse = {
        persona_slug: persona.slug,
        persona_name: persona.name,
        requirements,
        available_connections: availableConnections,
        missing_required: missingRequired
    };

    reply.send({
        success: true,
        data: response
    });
}
