import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Tool } from "../../../storage/models/Agent";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";

const toolSchema = z.object({
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

const addToolsBatchSchema = z.object({
    tools: z.array(toolSchema).min(1).max(50)
});

interface AddToolsBatchParams {
    id: string;
}

/**
 * Batch add multiple tools to an agent in a single atomic operation.
 * This avoids race conditions when adding multiple tools simultaneously.
 */
export async function addToolsBatchHandler(
    request: FastifyRequest<{
        Params: AddToolsBatchParams;
        Body: z.infer<typeof addToolsBatchSchema>;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { id: agentId } = request.params;
    const userId = (request.user as { id: string }).id;

    // Validate request body
    const { tools: toolsData } = addToolsBatchSchema.parse(request.body);

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

    // Track results
    const results = {
        added: [] as Tool[],
        skipped: [] as { name: string; reason: string }[]
    };

    // Get existing tool names for duplicate checking
    const existingToolNames = new Set(agent.available_tools.map((t) => t.name));

    // Process all tools
    const newTools: Tool[] = [];
    for (const toolData of toolsData) {
        // Check if tool with same name already exists
        if (existingToolNames.has(toolData.name)) {
            results.skipped.push({
                name: toolData.name,
                reason: "Tool with this name already exists"
            });
            continue;
        }

        // Check if we're adding a duplicate in this batch
        if (newTools.some((t) => t.name === toolData.name)) {
            results.skipped.push({
                name: toolData.name,
                reason: "Duplicate tool in batch"
            });
            continue;
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

        newTools.push(newTool);
        results.added.push(newTool);
    }

    // If no tools to add, return early
    if (newTools.length === 0) {
        reply.code(200).send({
            success: true,
            data: {
                added: [],
                skipped: results.skipped,
                agent
            }
        });
        return;
    }

    // Add all new tools to the agent's available_tools array in a single update
    const updatedTools = [...agent.available_tools, ...newTools];

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
            added: results.added,
            skipped: results.skipped,
            agent: updatedAgent
        }
    });
}
