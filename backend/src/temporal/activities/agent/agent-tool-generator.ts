/**
 * Agent Tool Auto-Generation
 *
 * Automatically generates tool definitions for agents so they can be called
 * by other agents, enabling multi-agent orchestration.
 */

import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import type { AgentModel, Tool } from "../../../storage/models/Agent";

const agentRepo = new AgentRepository();

/**
 * Generate a tool definition from an agent
 *
 * This allows agents to call other agents as tools, enabling multi-agent orchestration.
 */
export function generateAgentTool(agent: AgentModel): Tool {
    // Extract input/output information from agent's description or use defaults
    const schema = {
        type: "object",
        properties: {
            input: {
                type: "string",
                description: "The input/query to send to the agent"
            },
            context: {
                type: "object",
                description: "Optional context to provide to the agent",
                properties: {},
                additionalProperties: true
            }
        },
        required: ["input"],
        additionalProperties: false
    };

    return {
        id: `agent-tool-${agent.id}`,
        type: "agent",
        name: generateAgentToolName(agent.name),
        description: `Call the "${agent.name}" agent. ${agent.description || ""}`,
        schema,
        config: {
            agentId: agent.id,
            agentName: agent.name
        }
    };
}

/**
 * Generate a valid tool name from an agent name
 *
 * Tool names must be valid function names (alphanumeric + underscores, start with letter)
 */
export function generateAgentToolName(agentName: string): string {
    // Convert to lowercase, replace spaces and special chars with underscores
    let toolName = agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(toolName)) {
        toolName = `agent_${toolName}`;
    }

    // Add prefix to avoid name collisions
    return `call_${toolName}`;
}

/**
 * Generate agent tools for all agents owned by a user
 *
 * This allows creating a "team" of agents that can call each other.
 */
export async function generateAgentToolsForUser(
    userId: string,
    options?: {
        excludeAgentId?: string; // Exclude specific agent (e.g., the calling agent)
        includeAgentIds?: string[]; // Only include specific agents
    }
): Promise<Tool[]> {
    const { excludeAgentId, includeAgentIds } = options || {};

    // Get all agents for user
    const result = await agentRepo.findByUserId(userId);
    let filteredAgents = result.agents;

    // Filter agents
    if (excludeAgentId) {
        filteredAgents = filteredAgents.filter((agent) => agent.id !== excludeAgentId);
    }

    if (includeAgentIds && includeAgentIds.length > 0) {
        filteredAgents = filteredAgents.filter((agent) => includeAgentIds.includes(agent.id));
    }

    // Generate tools
    return filteredAgents.map(generateAgentTool);
}

/**
 * Generate a tool definition for a specific agent by ID
 */
export async function generateAgentToolById(agentId: string, userId: string): Promise<Tool | null> {
    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        return null;
    }

    return generateAgentTool(agent);
}

/**
 * Auto-inject agent tools into an agent's available tools
 *
 * This makes all other agents available as tools to the calling agent.
 */
export async function injectAgentTools(
    existingTools: Tool[],
    userId: string,
    currentAgentId?: string
): Promise<Tool[]> {
    // Generate tools for all other agents
    const agentTools = await generateAgentToolsForUser(userId, {
        excludeAgentId: currentAgentId // Don't allow agent to call itself
    });

    // Merge with existing tools, avoiding duplicates
    const existingToolNames = new Set(existingTools.map((t) => t.name));
    const newAgentTools = agentTools.filter((tool) => !existingToolNames.has(tool.name));

    return [...existingTools, ...newAgentTools];
}

/**
 * Check if a tool is an agent tool
 */
export function isAgentTool(tool: Tool): boolean {
    return tool.type === "agent";
}

/**
 * Extract agent ID from an agent tool
 */
export function getAgentIdFromTool(tool: Tool): string | null {
    if (!isAgentTool(tool)) {
        return null;
    }

    return (tool.config.agentId as string) || null;
}
