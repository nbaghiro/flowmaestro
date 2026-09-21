import type {
    JsonObject,
    WebSocketEvent,
    AgentExecutionStartedEvent,
    AgentMessageNewEvent,
    AgentThinkingEvent,
    AgentTokenEvent,
    AgentExecutionCompletedEvent,
    AgentExecutionFailedEvent
} from "@flowmaestro/shared";
import { executionEventLog } from "../../../services/events/ExecutionEventLog";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { createActivityLogger } from "../../core";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

const logger = createActivityLogger({ component: "AgentEvents" });

/**
 * Activities for emitting agent events to WebSocket clients
 * These are side-effect activities called from the agent orchestrator workflow
 *
 * Every event is published to pub/sub for live subscribers and appended to the
 * execution's event log, which the agent SSE route relays from so that late or
 * reconnecting clients still receive it. The log entry carries the SSE event name
 * and the exact payload the route sends.
 */

export interface EmitAgentExecutionStartedInput {
    executionId: string;
    agentId: string;
    agentName: string;
    threadId: string;
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
}

export interface EmitAgentMessageInput {
    executionId: string;
    threadId: string;
    message: ThreadMessage;
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
}

export interface EmitAgentThinkingInput {
    executionId: string;
    threadId: string;
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
}

export interface EmitAgentTokenInput {
    executionId: string;
    token: string;
    threadId: string;
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
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
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
}

export interface EmitAgentExecutionFailedInput {
    executionId: string;
    threadId: string;
    error: string;
    /** Skip global channel, only publish to thread-specific channel (for chat interfaces) */
    threadOnly?: boolean;
}

/**
 * Emit agent execution started event
 */
export async function emitAgentExecutionStarted(
    input: EmitAgentExecutionStartedInput
): Promise<void> {
    const { executionId, agentId, agentName, threadId, threadOnly } = input;

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        tasks.push(
            redisEventBus.publish("agent:events:execution:started", {
                type: "agent:execution:started",
                timestamp: Date.now(),
                executionId,
                threadId,
                agentId,
                agentName
            })
        );
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadEvent: AgentExecutionStartedEvent = {
        type: "agent:execution:started",
        timestamp: Date.now(),
        executionId,
        agentId,
        agentName
    };
    tasks.push(redisEventBus.publishThreadEvent(input.threadId, threadEvent));

    tasks.push(executionEventLog.append(executionId, "started", { executionId, agentName }));

    await Promise.all(tasks);
}

/**
 * Emit new message event (user, assistant, or tool)
 */
export async function emitAgentMessage(input: EmitAgentMessageInput): Promise<void> {
    const { executionId, threadId, message, threadOnly } = input;

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

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        tasks.push(
            redisEventBus.publish("agent:events:message:new", {
                type: "agent:message:new",
                timestamp: Date.now(),
                executionId,
                threadId,
                message: serializedMessage
            })
        );
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadMessageEvent: AgentMessageNewEvent = {
        type: "agent:message:new",
        timestamp: Date.now(),
        executionId,
        threadId,
        message: serializedMessage
    };
    tasks.push(redisEventBus.publishThreadEvent(threadId, threadMessageEvent));

    tasks.push(
        executionEventLog.append(executionId, "message", {
            message: serializedMessage,
            executionId
        })
    );

    await Promise.all(tasks);
}

/**
 * Emit agent thinking event
 */
export async function emitAgentThinking(input: EmitAgentThinkingInput): Promise<void> {
    const { executionId, threadId, threadOnly } = input;

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        tasks.push(
            redisEventBus.publish("agent:events:thinking", {
                type: "agent:thinking",
                timestamp: Date.now(),
                executionId,
                threadId
            })
        );
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadThinkingEvent: AgentThinkingEvent = {
        type: "agent:thinking",
        timestamp: Date.now(),
        executionId,
        threadId
    };
    tasks.push(redisEventBus.publishThreadEvent(threadId, threadThinkingEvent));

    tasks.push(executionEventLog.append(executionId, "thinking", { executionId }));

    await Promise.all(tasks);
}

/**
 * Emit token for streaming responses
 */
export async function emitAgentToken(input: EmitAgentTokenInput): Promise<void> {
    const { executionId, token, threadId, threadOnly } = input;

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        const event = {
            type: "agent:token",
            timestamp: Date.now(),
            executionId,
            threadId,
            token
        } as unknown as WebSocketEvent;
        logger.debug("Publishing agent token event", {
            executionId,
            tokenLength: token.length
        });
        tasks.push(redisEventBus.publish("agent:events:token", event));
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadTokenEvent: AgentTokenEvent = {
        type: "agent:token",
        timestamp: Date.now(),
        executionId,
        token
    };
    tasks.push(redisEventBus.publishThreadEvent(threadId, threadTokenEvent));

    tasks.push(executionEventLog.append(executionId, "token", { token, executionId }));

    await Promise.all(tasks);
}

/**
 * Emit tool call started event
 */
export async function emitAgentToolCallStarted(
    input: EmitAgentToolCallStartedInput
): Promise<void> {
    const { executionId, threadId, toolName, arguments: args } = input;
    await Promise.all([
        redisEventBus.publish("agent:events:tool:call:started", {
            type: "agent:tool:call:started",
            timestamp: Date.now(),
            executionId,
            threadId,
            toolName,
            arguments: args
        }),
        executionEventLog.append(executionId, "tool_call_started", {
            toolName,
            arguments: args,
            executionId
        })
    ]);
}

/**
 * Emit tool call completed event
 */
export async function emitAgentToolCallCompleted(
    input: EmitAgentToolCallCompletedInput
): Promise<void> {
    const { executionId, threadId, toolName, result } = input;
    await Promise.all([
        redisEventBus.publish("agent:events:tool:call:completed", {
            type: "agent:tool:call:completed",
            timestamp: Date.now(),
            executionId,
            threadId,
            toolName,
            result
        }),
        executionEventLog.append(executionId, "tool_call_completed", {
            toolName,
            result,
            executionId
        })
    ]);
}

/**
 * Emit tool call failed event
 */
export async function emitAgentToolCallFailed(input: EmitAgentToolCallFailedInput): Promise<void> {
    const { executionId, threadId, toolName, error } = input;
    await Promise.all([
        redisEventBus.publish("agent:events:tool:call:failed", {
            type: "agent:tool:call:failed",
            timestamp: Date.now(),
            executionId,
            threadId,
            toolName,
            error
        }),
        executionEventLog.append(executionId, "tool_call_failed", {
            toolName,
            error,
            executionId
        })
    ]);
}

/**
 * Emit agent execution completed event
 */
export async function emitAgentExecutionCompleted(
    input: EmitAgentExecutionCompletedInput
): Promise<void> {
    const { executionId, threadId, finalMessage, iterations, threadOnly } = input;

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        tasks.push(
            redisEventBus.publish("agent:events:execution:completed", {
                type: "agent:execution:completed",
                timestamp: Date.now(),
                executionId,
                threadId,
                status: "completed",
                finalMessage,
                iterations
            })
        );
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadCompletedEvent: AgentExecutionCompletedEvent = {
        type: "agent:execution:completed",
        timestamp: Date.now(),
        executionId,
        threadId,
        status: "completed",
        finalMessage,
        iterations
    };
    tasks.push(redisEventBus.publishThreadEvent(threadId, threadCompletedEvent));

    tasks.push(
        executionEventLog.append(executionId, "completed", {
            finalMessage,
            iterations,
            executionId
        })
    );

    await Promise.all(tasks);
}

/**
 * Emit agent execution failed event
 */
export async function emitAgentExecutionFailed(
    input: EmitAgentExecutionFailedInput
): Promise<void> {
    const { executionId, threadId, error, threadOnly } = input;

    const tasks: Promise<void>[] = [];

    // Publish to global channel (for main app WebSocket streaming)
    if (!threadOnly) {
        tasks.push(
            redisEventBus.publish("agent:events:execution:failed", {
                type: "agent:execution:failed",
                timestamp: Date.now(),
                executionId,
                threadId,
                status: "failed",
                error
            })
        );
    }

    // Publish to thread stream (for chat interface SSE streaming)
    const threadFailedEvent: AgentExecutionFailedEvent = {
        type: "agent:execution:failed",
        timestamp: Date.now(),
        executionId,
        threadId,
        status: "failed",
        error
    };
    tasks.push(redisEventBus.publishThreadEvent(threadId, threadFailedEvent));

    tasks.push(executionEventLog.append(executionId, "error", { error, executionId }));

    await Promise.all(tasks);
}
