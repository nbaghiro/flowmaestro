import { FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../core/logging";
import { WorkspaceMemberRepository } from "../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../storage/repositories/WorkspaceRepository";

const logger = createServiceLogger("WorkspaceLimitsMiddleware");

type ResourceType = "workflows" | "agents" | "knowledge_bases" | "connections" | "members";

// Map resource types to limit field names
const limitFieldMap: Record<ResourceType, string> = {
    workflows: "maxWorkflows",
    agents: "maxAgents",
    knowledge_bases: "maxKnowledgeBases",
    connections: "maxConnections",
    members: "maxMembers"
};

// Map resource types to display names
const resourceDisplayNames: Record<ResourceType, string> = {
    workflows: "workflows",
    agents: "agents",
    knowledge_bases: "knowledge bases",
    connections: "connections",
    members: "team members"
};

/**
 * Middleware factory to check workspace resource limits.
 *
 * Returns 403 if the workspace has reached its limit for the specified resource.
 * Requires workspaceContextMiddleware to have run first.
 *
 * @param resource - The type of resource to check limits for
 */
export function requireLimit(resource: ResourceType) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const workspaceContext = request.workspace;

        if (!workspaceContext) {
            logger.error("requireLimit called without workspace context");
            return reply.status(500).send({
                success: false,
                error: "Internal server error: workspace context not found"
            });
        }

        const workspaceId = workspaceContext.id;
        const limit = workspaceContext.limits[
            limitFieldMap[resource] as keyof typeof workspaceContext.limits
        ] as number;

        // -1 means unlimited
        if (limit === -1) {
            return;
        }

        const workspaceRepo = new WorkspaceRepository();
        let currentCount: number;

        if (resource === "members") {
            // For members, we need to count from workspace_members table
            const memberRepo = new WorkspaceMemberRepository();
            currentCount = await memberRepo.getMemberCount(workspaceId);
        } else {
            const counts = await workspaceRepo.getResourceCounts(workspaceId);
            currentCount = counts[resource as keyof typeof counts] as number;
        }

        if (currentCount >= limit) {
            logger.info(
                {
                    workspaceId,
                    resource,
                    currentCount,
                    limit
                },
                "Workspace resource limit reached"
            );

            return reply.status(403).send({
                success: false,
                error: "LIMIT_EXCEEDED",
                message: `You've reached the limit of ${limit} ${resourceDisplayNames[resource]} for your plan. Upgrade to create more.`,
                details: {
                    resource,
                    current: currentCount,
                    limit,
                    planType: workspaceContext.type
                }
            });
        }
    };
}
