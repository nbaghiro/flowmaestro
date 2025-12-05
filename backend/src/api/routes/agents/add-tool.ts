import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Tool } from "../../../storage/models/Agent";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";

const addToolSchema = z.object({
    type: z.enum(["workflow", "function", "knowledge_base", "mcp", "agent"]),
    name: z.string().min(1).max(100),
    description: z.string(),
    schema: z.record(z.any()),
    config: z.object({
        workflowId: z.string().optional(),
        functionName: z.string().optional(),
        knowledgeBaseId: z.string().optional(),
        agentId: z.string().optional(),
        agentName: z.string().optional(),
        connectionId: z.string().optional(),
        provider: z.string().optional()
    })
});

interface AddToolParams {
    id: string;
}

export async function addToolHandler(
    request: FastifyRequest<{
        Params: AddToolParams;
        Body: z.infer<typeof addToolSchema>;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { id: agentId } = request.params;
    const userId = (request.user as { id: string }).id;

    // Validate request body
    const toolData = addToolSchema.parse(request.body);

    const agentRepo = new AgentRepository();

    // Get the agent
    const agent = await agentRepo.findByIdAndUserId(agentId, userId);

    if (!agent) {
        reply.code(404).send({
            success: false,
            error: "Agent not found"
        });
        return;
    }

    // Generate a unique ID for the new tool
    const newTool: Tool = {
        id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: toolData.name,
        description: toolData.description,
        type: toolData.type,
        schema: toolData.schema,
        config: toolData.config
    };

    // Check if tool with same name already exists
    const existingTool = agent.available_tools.find((t) => t.name === newTool.name);
    if (existingTool) {
        reply.code(400).send({
            success: false,
            error: `Tool with name "${newTool.name}" already exists`
        });
        return;
    }

    // Add the tool to the agent's available_tools array
    const updatedTools = [...agent.available_tools, newTool];

    // Update the agent
    const updatedAgent = await agentRepo.update(agentId, {
        available_tools: updatedTools
    });

    if (!updatedAgent) {
        reply.code(500).send({
            success: false,
            error: "Failed to update agent"
        });
        return;
    }

    reply.code(200).send({
        success: true,
        data: {
            tool: newTool,
            agent: updatedAgent
        }
    });
}
