import type {
    JsonObject,
    WebSocketEvent,
    AgentExecutionStartedEvent,
    AgentMessageNewEvent,
    AgentThinkingEvent,
    AgentTokenEvent,
    AgentExecutionCompletedEvent
} from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { createActivityLogger } from "../../core";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

const logger = createActivityLogger({ component: "AgentEvents" });

/**
 * Activities for emitting agent events to WebSocket clients
 * These are side-effect activities called from the agent orchestrator workflow
 */

export interface EmitAgentExecutionStartedInput {
    executionId: string;
    agentId: string;
    agentName: string;
    threadId: string;
}

export interface EmitAgentMessageInput {
    executionId: string;
    threadId: string;
    message: ThreadMessage;
}

export interface EmitAgentThinkingInput {
    executionId: string;
    threadId: string;
}

export interface EmitAgentTokenInput {
    executionId: string;
    token: string;
    threadId: string;
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

    // Also publish to thread stream
    const threadEvent: AgentExecutionStartedEvent = {
        type: "agent:execution:started",
        timestamp: Date.now(),
        executionId,
        agentId,
        agentName
    };
    await redisEventBus.publishThreadEvent(input.threadId, threadEvent);
}

/**
 * Emit new message event (user, assistant, or tool)
 */
export async function emitAgentMessage(input: EmitAgentMessageInput): Promise<void> {
    const { executionId, threadId, message } = input;

    // Handle timestamp which might be Date, string, or number after Temporal serialization
    const timestamp =
        message.timestamp instanceof Date
            ? message.timestamp.toISOString()
            : new Date(message.timestamp).toISOString();

    const serializedMessage: JsonObject = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp,
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

    // Also publish to thread stream
    const threadMessageEvent: AgentMessageNewEvent = {
        type: "agent:message:new",
        timestamp: Date.now(),
        executionId,
        threadId,
        message: serializedMessage
    };
    await redisEventBus.publishThreadEvent(threadId, threadMessageEvent);
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

    const threadThinkingEvent: AgentThinkingEvent = {
        type: "agent:thinking",
        timestamp: Date.now(),
        executionId,
        threadId
    };
    await redisEventBus.publishThreadEvent(threadId, threadThinkingEvent);
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
    logger.debug("Publishing agent token event", {
        executionId,
        tokenLength: token.length
    });
    await redisEventBus.publish("agent:events:token", event);

    // Also publish to thread stream
    const threadTokenEvent: AgentTokenEvent = {
        type: "agent:token",
        timestamp: Date.now(),
        executionId,
        token
    };
    await redisEventBus.publishThreadEvent(input.threadId, threadTokenEvent);
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
 */
export async function emitAgentToolCallCompleted(
    input: EmitAgentToolCallCompletedInput
): Promise<void> {
    const { executionId, threadId, toolName, result } = input;
    await redisEventBus.publish("agent:events:tool:call:completed", {
        type: "agent:tool:call:completed",
        timestamp: Date.now(),
        executionId,
        threadId,
        toolName,
        result
    });
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

    const threadCompletedEvent: AgentExecutionCompletedEvent = {
        type: "agent:execution:completed",
        timestamp: Date.now(),
        executionId,
        threadId,
        status: "completed",
        finalMessage,
        iterations
    };
    await redisEventBus.publishThreadEvent(threadId, threadCompletedEvent);
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
