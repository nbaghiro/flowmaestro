/**
 * Agent Executor Task
 *
 * Executes AI agents with tool calling capabilities via Trigger.dev.
 * This is a standalone task for agent-based conversations, separate from
 * the node-executor which runs agents as part of workflows.
 */

import { task, metadata } from "@trigger.dev/sdk/v3";
import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { AgentRepository } from "../../storage/repositories/AgentRepository";
import { AgentExecutionRepository } from "../../storage/repositories/AgentExecutionRepository";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { handlerRegistry } from "../node-handlers";
import type { ContextSnapshot } from "../shared/context-manager";

const logger = createServiceLogger("AgentExecutor");

export interface AgentExecutorPayload {
    executionId: string;
    agentId: string;
    userId: string;
    threadId: string;
    initialMessage: string;
    connectionId?: string;
    model?: string;
}

export interface AgentExecutorResult {
    success: boolean;
    executionId: string;
    threadId: string;
    response?: string;
    iterations: number;
    toolCalls?: Array<{
        name: string;
        arguments: JsonObject;
        result?: unknown;
    }>;
    error?: string;
}

/**
 * Agent Executor Task
 *
 * Runs an AI agent with optional tool calling.
 * Uses the same AgentHandler from node-handlers for consistency.
 */
export const agentExecutor = task({
    id: "agent-executor",
    retry: { maxAttempts: 1 },
    run: async (payload: AgentExecutorPayload): Promise<AgentExecutorResult> => {
        const { executionId, agentId, userId, threadId, initialMessage, connectionId, model } = payload;

        await metadata.set("executionId", executionId);
        await metadata.set("agentId", agentId);
        await metadata.set("threadId", threadId);
        await metadata.set("status", "running");

        const agentRepo = new AgentRepository();
        const executionRepo = new AgentExecutionRepository();
        const connectionRepo = new ConnectionRepository();

        try {
            // Load the agent configuration
            const agent = await agentRepo.findByIdAndUserId(agentId, userId);
            if (!agent) {
                throw new Error("Agent not found");
            }

            // Determine connection to use
            let effectiveConnectionId = connectionId;
            if (!effectiveConnectionId && agent.connection_id) {
                effectiveConnectionId = agent.connection_id;
            }

            // Get provider from connection if available
            let provider = "openai";
            let effectiveModel = model || agent.model || "gpt-4o";

            if (effectiveConnectionId) {
                const connection = await connectionRepo.findByIdWithData(effectiveConnectionId);
                if (connection) {
                    provider = connection.provider;
                }
            }

            // Build agent config for the handler
            // Convert tools to JsonObject-compatible format
            const toolsJson = (agent.available_tools || []).map((tool) => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                type: tool.type,
                schema: tool.schema,
                config: tool.config as JsonObject
            }));

            const agentConfig: JsonObject = {
                provider,
                model: effectiveModel,
                systemPrompt: agent.system_prompt,
                connectionId: effectiveConnectionId || null,
                tools: toolsJson,
                maxIterations: agent.max_iterations || 10,
                temperature: agent.temperature || 0.7
            };

            // Build minimal context for agent execution
            const context: ContextSnapshot = {
                inputs: { message: initialMessage },
                nodeOutputs: {},
                workflowVariables: {},
                loopContext: undefined,
                parallelContext: undefined
            };

            // Get the agent handler
            const handler = handlerRegistry.getHandler("agent");

            // Execute the agent
            const result = await handler.execute({
                nodeId: executionId,
                nodeType: "agent",
                nodeName: agent.name,
                config: agentConfig,
                context,
                userId,
                executionId
            });

            // Update execution in database
            if (result.success) {
                await executionRepo.update(executionId, {
                    status: "completed",
                    completed_at: new Date()
                });

                const responseData = result.data as JsonObject | undefined;

                await metadata.set("status", "completed");

                return {
                    success: true,
                    executionId,
                    threadId,
                    response: responseData?.response as string | undefined,
                    iterations: (responseData?.iterations as number) || 1,
                    toolCalls: responseData?.toolCalls as AgentExecutorResult["toolCalls"]
                };
            } else {
                await executionRepo.update(executionId, {
                    status: "failed",
                    error: result.error?.message,
                    completed_at: new Date()
                });

                await metadata.set("status", "failed");
                await metadata.set("error", result.error?.message || "Unknown error");

                return {
                    success: false,
                    executionId,
                    threadId,
                    iterations: 0,
                    error: result.error?.message || "Unknown error"
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error({ executionId, agentId, error: errorMessage }, "Agent execution failed");

            await executionRepo.update(executionId, {
                status: "failed",
                error: errorMessage,
                completed_at: new Date()
            });

            await metadata.set("status", "failed");
            await metadata.set("error", errorMessage);

            return {
                success: false,
                executionId,
                threadId,
                iterations: 0,
                error: errorMessage
            };
        }
    }
});
