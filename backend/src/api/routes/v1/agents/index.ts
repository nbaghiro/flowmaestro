import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AgentRepository } from "../../../../storage/repositories/AgentRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import {
    sendSuccess,
    sendPaginated,
    sendNotFound,
    parsePaginationQuery
} from "../response-helpers";

/**
 * Public API v1 - Agents routes.
 */
export async function agentsV1Routes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/agents - List agents
    fastify.get(
        "/",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const agentRepo = new AgentRepository();
            const { agents, total } = await agentRepo.findByUserId(userId, {
                limit: per_page,
                offset
            });

            const publicAgents = agents.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                model: a.model,
                provider: a.provider,
                created_at: a.created_at.toISOString(),
                updated_at: a.updated_at.toISOString()
            }));

            return sendPaginated(reply, publicAgents, {
                page,
                per_page,
                total_count: total
            });
        }
    );

    // GET /api/v1/agents/:id - Get agent by ID
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const agentId = request.params.id;

            const agentRepo = new AgentRepository();
            const agent = await agentRepo.findById(agentId);

            if (!agent || agent.user_id !== userId) {
                return sendNotFound(reply, "Agent", agentId);
            }

            const publicAgent = {
                id: agent.id,
                name: agent.name,
                description: agent.description,
                model: agent.model,
                provider: agent.provider,
                system_prompt: agent.system_prompt,
                temperature: agent.temperature,
                max_tokens: agent.max_tokens,
                available_tools: agent.available_tools.map((t) => ({
                    id: t.id,
                    name: t.name,
                    description: t.description,
                    type: t.type
                })),
                created_at: agent.created_at.toISOString(),
                updated_at: agent.updated_at.toISOString()
            };

            return sendSuccess(reply, publicAgent);
        }
    );

    // POST /api/v1/agents/:id/threads - Create thread for agent
    fastify.post<{ Params: { id: string } }>(
        "/:id/threads",
        {
            preHandler: [requireScopes("agents:read", "threads:write")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const agentId = request.params.id;

            const agentRepo = new AgentRepository();
            const agent = await agentRepo.findById(agentId);

            if (!agent || agent.user_id !== userId) {
                return sendNotFound(reply, "Agent", agentId);
            }

            // Import ThreadRepository dynamically to avoid circular dependency
            const { ThreadRepository } = await import(
                "../../../../storage/repositories/ThreadRepository"
            );
            const threadRepo = new ThreadRepository();

            const thread = await threadRepo.create({
                user_id: userId,
                agent_id: agentId
            });

            return sendSuccess(
                reply,
                {
                    id: thread.id,
                    agent_id: thread.agent_id,
                    status: thread.status,
                    created_at: thread.created_at.toISOString()
                },
                201
            );
        }
    );
}
