import { FastifyInstance } from "fastify";
import { AgentTemplateRepository, AgentRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, validateRequest } from "../../middleware";
import { NotFoundError } from "../../middleware/error-handler";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import {
    agentTemplateIdParamSchema,
    copyAgentTemplateBodySchema,
    AgentTemplateIdParam,
    CopyAgentTemplateBody
} from "../../schemas/agent-template-schemas";

export async function copyAgentTemplateRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/copy",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(agentTemplateIdParamSchema),
                validateRequest(copyAgentTemplateBodySchema)
            ]
        },
        async (request, reply) => {
            const agentTemplateRepository = new AgentTemplateRepository();
            const agentRepository = new AgentRepository();
            const { id } = request.params as AgentTemplateIdParam;
            const body = (request.body || {}) as CopyAgentTemplateBody;

            // Get the agent template
            const template = await agentTemplateRepository.findById(id);

            if (!template) {
                throw new NotFoundError("Agent template not found");
            }

            // Create a new agent from the template
            const agentName = body.name || template.name;

            // Note: available_tools is intentionally empty - users must connect their own integrations
            // The template's available_tools shows what tools are recommended but requires user-specific connections
            const agent = await agentRepository.create({
                user_id: request.user!.id,
                workspace_id: request.workspace!.id,
                name: agentName,
                description: template.description || undefined,
                system_prompt: template.system_prompt,
                model: template.model,
                provider: template.provider,
                temperature: template.temperature,
                max_tokens: template.max_tokens,
                available_tools: [], // Empty - user must connect their own tools
                memory_config: { type: "buffer", max_messages: 20 }
            });

            // Increment use count in background
            agentTemplateRepository.incrementUseCount(id).catch(() => {
                // Silently ignore use count increment failures
            });

            return reply.status(201).send({
                success: true,
                data: {
                    agentId: agent.id,
                    agent
                }
            });
        }
    );
}
