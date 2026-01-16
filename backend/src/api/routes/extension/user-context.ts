import { FastifyInstance } from "fastify";
import type {
    ExtensionUserContext,
    ExtensionWorkflowSummary,
    ExtensionAgentSummary,
    ExtensionKnowledgeBaseSummary
} from "@flowmaestro/shared";
import {
    WorkflowRepository,
    AgentRepository,
    KnowledgeBaseRepository
} from "../../../storage/repositories";
import { authMiddleware, workspaceContextMiddleware } from "../../middleware";

export async function userContextRoute(fastify: FastifyInstance) {
    fastify.get(
        "/user-context",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const workspaceId = request.workspace?.id;

            if (!workspaceId) {
                return reply.status(400).send({
                    success: false,
                    error: "Workspace context required"
                });
            }

            const workflowRepo = new WorkflowRepository();
            const agentRepo = new AgentRepository();
            const kbRepo = new KnowledgeBaseRepository();

            // Fetch all user data in parallel
            const [workflowsResult, agentsResult, knowledgeBasesResult] = await Promise.all([
                workflowRepo.findByWorkspaceId(workspaceId),
                agentRepo.findByWorkspaceId(workspaceId),
                kbRepo.findByWorkspaceId(workspaceId)
            ]);

            const workflows = workflowsResult.workflows;
            const agents = agentsResult.agents;
            const knowledgeBases = knowledgeBasesResult.knowledgeBases;

            // Transform workflows to extension format
            const workflowSummaries: ExtensionWorkflowSummary[] = workflows.map((w) => {
                // Extract input nodes from definition
                const definition = w.definition as {
                    nodes?: Record<
                        string,
                        { type: string; name: string; config?: { inputType?: string } }
                    >;
                };
                const inputNodes = Object.entries(definition.nodes || {})
                    .filter(
                        ([_, node]) =>
                            node.type === "input" ||
                            node.type === "files" ||
                            node.type === "url" ||
                            node.type === "vision"
                    )
                    .map(([id, node]) => ({
                        id,
                        name: node.name,
                        type: node.type,
                        inputType: node.config?.inputType
                    }));

                return {
                    id: w.id,
                    name: w.name,
                    description: w.description || undefined,
                    inputNodes,
                    lastUsedAt: w.updated_at?.toISOString()
                };
            });

            // Transform agents to extension format
            const agentSummaries: ExtensionAgentSummary[] = agents.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description || undefined,
                lastUsedAt: a.updated_at?.toISOString()
            }));

            // Transform knowledge bases to extension format
            const kbSummaries: ExtensionKnowledgeBaseSummary[] = knowledgeBases.map((kb) => ({
                id: kb.id,
                name: kb.name,
                description: kb.description || undefined,
                documentCount: 0 // TODO: Add document count query if needed
            }));

            // Get pinned and recent items (could be stored in user preferences)
            // For now, return empty arrays and use frontend to manage
            const userContext: ExtensionUserContext = {
                workflows: workflowSummaries,
                agents: agentSummaries,
                knowledgeBases: kbSummaries,
                pinnedWorkflowIds: [],
                pinnedAgentIds: [],
                recentWorkflowIds: workflows.slice(0, 5).map((w) => w.id),
                recentAgentIds: agents.slice(0, 5).map((a) => a.id)
            };

            return reply.send({
                success: true,
                data: userContext
            });
        }
    );
}
