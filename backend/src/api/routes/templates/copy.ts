import { FastifyInstance } from "fastify";
import { TemplateRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, validateRequest } from "../../middleware";
import { NotFoundError } from "../../middleware/error-handler";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import {
    templateIdParamSchema,
    copyTemplateBodySchema,
    TemplateIdParam,
    CopyTemplateBody
} from "../../schemas/template-schemas";

export async function copyTemplateRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/copy",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(templateIdParamSchema),
                validateRequest(copyTemplateBodySchema)
            ]
        },
        async (request, reply) => {
            const templateRepository = new TemplateRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as TemplateIdParam;
            const body = (request.body || {}) as CopyTemplateBody;

            // Get the template
            const template = await templateRepository.findById(id);

            if (!template) {
                throw new NotFoundError("Template not found");
            }

            // Create a new workflow from the template
            const workflowName = body.name || `${template.name}`;

            // Deep clone the definition to avoid any reference issues
            const definition = JSON.parse(JSON.stringify(template.definition));

            // Update the definition name to match the new workflow name
            definition.name = workflowName;

            // Convert nodes from template format to workflow format
            // Template format: nodes: [{ id, type, position, data: { label, provider, ... } }]
            // Workflow format: nodes: { "id": { type, position, name, config: { provider, ... } } }
            if (Array.isArray(definition.nodes)) {
                const nodesObj: Record<string, unknown> = {};
                for (const node of definition.nodes) {
                    const { id, data, ...rest } = node;
                    const { label, ...config } = data || {};
                    nodesObj[id] = {
                        ...rest,
                        name: label,
                        config
                    };
                }
                definition.nodes = nodesObj;
            }

            const workflow = await workflowRepository.create({
                name: workflowName,
                description: template.description || undefined,
                definition,
                user_id: request.user!.id,
                workspace_id: request.workspace!.id,
                ai_generated: false
            });

            // Increment use count in background
            templateRepository.incrementUseCount(id).catch(() => {
                // Silently ignore use count increment failures
            });

            return reply.status(201).send({
                success: true,
                data: {
                    workflowId: workflow.id,
                    workflow
                }
            });
        }
    );
}
