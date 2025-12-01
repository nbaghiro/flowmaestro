import type { JsonObject, WebSocketEvent } from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import type { ConversationMessage } from "../../../storage/models/AgentExecution";

/**
 * Activities for emitting agent events to WebSocket clients
 * These are side-effect activities called from the agent orchestrator workflow
 */

export interface EmitAgentExecutionStartedInput {
    executionId: string;
    agentId: string;
    agentName: string;
}

export interface EmitAgentMessageInput {
    executionId: string;
    threadId: string;
    message: ConversationMessage;
}

export interface EmitAgentThinkingInput {
    executionId: string;
    threadId: string;
}

export interface EmitAgentTokenInput {
    executionId: string;
    token: string;
}

export interface EmitAgentToolCallStartedInput {
    executionId: string;
    threadId: string;
    toolName: string;
    arguments: JsonObject;
}

export interface EmitAgentToolCallCompletedInput {
    executionId: string;
    threadId: string;
    toolName: string;
    result: JsonObject;
}

export interface EmitAgentToolCallFailedInput {
    executionId: string;
    threadId: string;
    toolName: string;
    error: string;
}

export interface EmitAgentExecutionCompletedInput {
    executionId: string;
    threadId: string;
    finalMessage: string;
    iterations: number;
}

export interface EmitAgentExecutionFailedInput {
    executionId: string;
    threadId: string;
    error: string;
}

/**
 * Emit agent execution started event
 */
export async function emitAgentExecutionStarted(
    input: EmitAgentExecutionStartedInput
): Promise<void> {
    const { executionId, agentId, agentName } = input;
    await redisEventBus.publish("agent:events:execution:started", {
        type: "agent:execution:started",
        timestamp: Date.now(),
        executionId,
        agentId,
        agentName
    });
}

/**
 * Emit new message event (user, assistant, or tool)
 * Note: Tool messages are not emitted to avoid showing raw JSON to users
 */
export async function emitAgentMessage(input: EmitAgentMessageInput): Promise<void> {
    const { executionId, threadId, message } = input;

    // Skip tool messages - they contain raw JSON that users don't need to see
    // The LLM still has access to them in the conversation history
    if (message.role === "tool") {
        return;
    }

    // Normalize timestamp to ISO string regardless of whether it's a Date,
    // string, or numeric epoch. This avoids runtime errors when message
    // has already been serialized/deserialized.
    const isoTimestamp =
        message.timestamp instanceof Date
            ? message.timestamp.toISOString()
            : typeof message.timestamp === "string"
              ? message.timestamp
              : new Date(
                    // Support numeric epoch values or fall back to "now"
                    typeof message.timestamp === "number" ? message.timestamp : Date.now()
                ).toISOString();

    const serializedMessage: JsonObject = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: isoTimestamp,
        ...(message.tool_calls && {
            tool_calls: message.tool_calls.map((tc) => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments
            }))
        }),
        ...(message.tool_name && { tool_name: message.tool_name }),
        ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    };

    await redisEventBus.publish("agent:events:message:new", {
        type: "agent:message:new",
        timestamp: Date.now(),
        executionId,
        threadId,
        message: serializedMessage
    });
}

/**
 * Emit agent thinking event
 */
export async function emitAgentThinking(input: EmitAgentThinkingInput): Promise<void> {
    const { executionId, threadId } = input;
    await redisEventBus.publish("agent:events:thinking", {
        type: "agent:thinking",
        timestamp: Date.now(),
        executionId,
        threadId
    });
}

/**
 * Emit token for streaming responses
 */
export async function emitAgentToken(input: EmitAgentTokenInput): Promise<void> {
    const { executionId, token } = input;
    const event = {
        type: "agent:token",
        timestamp: Date.now(),
        executionId,
        token
    } as unknown as WebSocketEvent;
    await redisEventBus.publish("agent:events:token", event);
}

/**
 * Emit tool call started event
 */
export async function emitAgentToolCallStarted(
    input: EmitAgentToolCallStartedInput
): Promise<void> {
    const { executionId, threadId, toolName, arguments: args } = input;
    await redisEventBus.publish("agent:events:tool:call:started", {
        type: "agent:tool:call:started",
        timestamp: Date.now(),
        executionId,
        threadId,
        toolName,
        arguments: args
    });
}

/**
 * Emit tool call completed event
 * Note: This event is not emitted to avoid showing raw JSON to users
 */
export async function emitAgentToolCallCompleted(
    _input: EmitAgentToolCallCompletedInput
): Promise<void> {
    // Don't emit tool call completed events - they contain raw JSON
    // Users don't need to see these, and the LLM has access via conversation history
    return;
}

/**
 * Emit tool call failed event
 */
export async function emitAgentToolCallFailed(input: EmitAgentToolCallFailedInput): Promise<void> {
    const { executionId, threadId, toolName, error } = input;
    await redisEventBus.publish("agent:events:tool:call:failed", {
        type: "agent:tool:call:failed",
        timestamp: Date.now(),
        executionId,
        threadId,
        toolName,
        error
    });
}

/**
 * Emit agent execution completed event
 */
export async function emitAgentExecutionCompleted(
    input: EmitAgentExecutionCompletedInput
): Promise<void> {
    const { executionId, threadId, finalMessage, iterations } = input;
    await redisEventBus.publish("agent:events:execution:completed", {
        type: "agent:execution:completed",
        timestamp: Date.now(),
        executionId,
        threadId,
        status: "completed",
        finalMessage,
        iterations
    });
}

/**
 * Emit agent execution failed event
 */
export async function emitAgentExecutionFailed(
    input: EmitAgentExecutionFailedInput
): Promise<void> {
    const { executionId, threadId, error } = input;
    await redisEventBus.publish("agent:events:execution:failed", {
        type: "agent:execution:failed",
        timestamp: Date.now(),
        executionId,
        threadId,
        status: "failed",
        error
    });
}
