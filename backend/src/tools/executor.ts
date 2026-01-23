/**
 * Tool Executor
 *
 * Handles execution of both built-in and integration (MCP) tools
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../core/logging";
import { validateToolInput } from "../core/validation/tool-validation";
import { providerRegistry } from "../integrations/core/ProviderRegistry";
import { ConnectionRepository } from "../storage/repositories/ConnectionRepository";
import { getBuiltInTool, getAllBuiltInTools } from "./builtin";
import type {
    AnyTool,
    IntegrationTool,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolCollection,
    ToolCategory,
    BuiltInTool
} from "./types";

const logger = createServiceLogger("ToolExecutor");

/**
 * Execute a tool by name
 */
export async function executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    logger.info(
        {
            toolName,
            userId: context.userId,
            workspaceId: context.workspaceId,
            mode: context.mode,
            traceId: context.traceId
        },
        "Executing tool"
    );

    try {
        // Check if it's a built-in tool
        const builtInTool = getBuiltInTool(toolName);
        if (builtInTool) {
            return await executeBuiltInTool(builtInTool, params, context);
        }

        // Check if it's an integration tool (provider_operation format)
        if (toolName.includes("_")) {
            const [providerName] = toolName.split("_", 1);
            const provider = await providerRegistry.getProvider(providerName);

            if (provider) {
                return await executeIntegrationTool(toolName, params, context);
            }
        }

        // Tool not found
        logger.warn({ toolName, traceId: context.traceId }, "Tool not found");
        return {
            success: false,
            error: {
                message: `Tool not found: ${toolName}`,
                code: "TOOL_NOT_FOUND",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    } catch (error) {
        logger.error({ err: error, toolName, traceId: context.traceId }, "Tool execution failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Tool execution failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Execute a built-in tool
 */
async function executeBuiltInTool(
    tool: BuiltInTool,
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    logger.debug({ toolName: tool.name, traceId: context.traceId }, "Executing built-in tool");

    // Validate input if tool has a schema
    if (tool.zodSchema) {
        const validation = validateToolInput(
            {
                id: tool.name,
                name: tool.name,
                description: tool.description,
                type: "function",
                schema: tool.inputSchema as JsonObject,
                config: {}
            },
            params
        );

        if (!validation.success) {
            return {
                success: false,
                error: {
                    message: validation.error?.message || "Validation failed",
                    code: "VALIDATION_ERROR",
                    retryable: false
                }
            };
        }
    }

    // Execute the tool
    return await tool.execute(params, context);
}

/**
 * Execute an integration tool via MCP
 */
async function executeIntegrationTool(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    logger.debug(
        { toolName, connectionId: context.connectionId, traceId: context.traceId },
        "Executing integration tool"
    );

    // Parse provider and tool name (format: provider_toolName)
    const underscoreIndex = toolName.indexOf("_");
    if (underscoreIndex === -1) {
        return {
            success: false,
            error: {
                message: `Invalid integration tool name format: ${toolName}`,
                code: "INVALID_TOOL_NAME",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }

    const providerName = toolName.substring(0, underscoreIndex);
    const mcpToolName = toolName.substring(underscoreIndex + 1);

    // Get the provider
    const provider = await providerRegistry.getProvider(providerName);
    if (!provider) {
        return {
            success: false,
            error: {
                message: `Provider not found: ${providerName}`,
                code: "PROVIDER_NOT_FOUND",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }

    // Get the connection
    if (!context.connectionId) {
        return {
            success: false,
            error: {
                message: `Connection required for integration tool: ${toolName}`,
                code: "CONNECTION_REQUIRED",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }

    const connectionRepo = new ConnectionRepository();
    const connection = await connectionRepo.findByIdWithData(context.connectionId);

    if (!connection) {
        return {
            success: false,
            error: {
                message: `Connection not found: ${context.connectionId}`,
                code: "CONNECTION_NOT_FOUND",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }

    // Check connection belongs to workspace
    if (connection.workspace_id !== context.workspaceId) {
        return {
            success: false,
            error: {
                message: "Access denied to connection",
                code: "ACCESS_DENIED",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }

    try {
        // Execute via provider's MCP interface
        const result = await provider.executeMCPTool(mcpToolName, params, connection);

        return {
            success: true,
            data: result,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 1 // Integration tools cost 1 credit
            }
        };
    } catch (error) {
        logger.error(
            { err: error, toolName, traceId: context.traceId },
            "Integration tool execution failed"
        );

        return {
            success: false,
            error: {
                message:
                    error instanceof Error ? error.message : "Integration tool execution failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Get all available tools for a user (for personas)
 * This includes all built-in tools and all integration tools from the user's connections
 */
export async function getAllToolsForUser(
    userId: string,
    workspaceId: string
): Promise<ToolCollection> {
    logger.info({ userId, workspaceId }, "Getting all tools for user");

    // Get all built-in tools
    const builtIn = getAllBuiltInTools();

    // Get all user connections
    const connectionRepo = new ConnectionRepository();
    const { connections } = await connectionRepo.findByWorkspaceId(workspaceId);

    // Get integration tools from each connection
    const integrationTools: IntegrationTool[] = [];

    for (const connection of connections) {
        try {
            const provider = await providerRegistry.getProvider(connection.provider);
            if (!provider) continue;

            const mcpTools = provider.getMCPTools();

            for (const mcpTool of mcpTools) {
                integrationTools.push({
                    name: `${connection.provider}_${mcpTool.name}`,
                    displayName: mcpTool.name
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                    description: mcpTool.description,
                    category: "integration",
                    riskLevel: "medium", // Default for integration tools
                    inputSchema: mcpTool.inputSchema,
                    enabledByDefault: true,
                    creditCost: 1,
                    tags: [connection.provider, "integration"],
                    provider: connection.provider,
                    mcpToolName: mcpTool.name,
                    connectionId: connection.id
                });
            }
        } catch (error) {
            logger.warn(
                { err: error, provider: connection.provider },
                "Failed to get MCP tools from provider"
            );
        }
    }

    // Create the tool collection
    const collection: ToolCollection = {
        builtIn,
        integration: integrationTools,

        all: () => [...builtIn, ...integrationTools],

        byCategory: (category: ToolCategory) => {
            return [
                ...builtIn.filter((t) => t.category === category),
                ...integrationTools.filter((t) => t.category === category)
            ];
        },

        findByName: (name: string): AnyTool | undefined => {
            const builtin = builtIn.find((t) => t.name === name);
            if (builtin) return builtin;
            return integrationTools.find((t) => t.name === name);
        }
    };

    logger.info(
        {
            builtInCount: builtIn.length,
            integrationCount: integrationTools.length,
            totalCount: builtIn.length + integrationTools.length
        },
        "Tool collection assembled"
    );

    return collection;
}

/**
 * Get tools for a specific agent (explicit tool selection)
 * Returns only the tools that have been explicitly assigned to the agent
 */
export async function getToolsForAgent(
    agentTools: Array<{
        type: string;
        name: string;
        config?: { connectionId?: string; provider?: string };
    }>,
    _userId: string,
    _workspaceId: string
): Promise<AnyTool[]> {
    const tools: AnyTool[] = [];

    for (const agentTool of agentTools) {
        if (agentTool.type === "function") {
            // Check if it's a built-in tool
            const builtIn = getBuiltInTool(agentTool.name);
            if (builtIn) {
                tools.push(builtIn);
            }
        } else if (
            agentTool.type === "mcp" &&
            agentTool.config?.connectionId &&
            agentTool.config?.provider
        ) {
            // It's an integration tool - get from provider
            const provider = await providerRegistry.getProvider(agentTool.config.provider);
            if (provider) {
                const mcpTools = provider.getMCPTools();
                const mcpTool = mcpTools.find((t) => t.name === agentTool.name);

                if (mcpTool) {
                    tools.push({
                        name: `${agentTool.config.provider}_${mcpTool.name}`,
                        displayName: mcpTool.name
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase()),
                        description: mcpTool.description,
                        category: "integration",
                        riskLevel: "medium",
                        inputSchema: mcpTool.inputSchema,
                        enabledByDefault: true,
                        creditCost: 1,
                        tags: [agentTool.config.provider, "integration"],
                        provider: agentTool.config.provider,
                        mcpToolName: mcpTool.name,
                        connectionId: agentTool.config.connectionId
                    });
                }
            }
        }
    }

    return tools;
}
