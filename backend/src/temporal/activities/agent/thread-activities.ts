/**
 * Thread Activities - Activities for managing conversations with ThreadManager
 */

import { calculateCost } from "../../../core/tracing/cost-calculator";
import { ThreadManager } from "../../../services/agents/ThreadManager";
import { db } from "../../../storage/database";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { emitTokensUpdated } from "./streaming-events";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

const executionRepo = new AgentExecutionRepository();

/**
 * Load conversation history for an execution
 * Returns messages that have been persisted to the database
 */
export interface LoadThreadHistoryInput {
    executionId: string;
}

export async function loadThreadHistory(input: LoadThreadHistoryInput): Promise<ThreadMessage[]> {
    const { executionId } = input;

    // Load execution from database
    const execution = await executionRepo.findById(executionId);

    if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
    }

    // Return thread history
    return execution.thread_history || [];
}

/**
 * Save new conversation messages incrementally
 * Only saves messages that haven't been saved yet
 *
 * Thread-aware: Saves messages to both execution and agent_messages table with thread_id
 */
export interface SaveThreadIncrementalInput {
    executionId: string;
    threadId: string; // Thread ID for message persistence
    messages: ThreadMessage[];
    markCompleted?: boolean; // If true, mark execution as completed after saving
}

export async function saveThreadIncremental(
    input: SaveThreadIncrementalInput
): Promise<{ saved: number }> {
    const { executionId, threadId, messages, markCompleted } = input;

    if (messages.length === 0) {
        return { saved: 0 };
    }

    // Load current execution
    const execution = await executionRepo.findById(executionId);

    if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
    }

    // Use ThreadManager for proper handling
    const conversation = new ThreadManager();

    // Add existing messages from database (mark as saved)
    if (execution.thread_history && execution.thread_history.length > 0) {
        conversation.addFromMemory(execution.thread_history);
    }

    // Add new messages
    messages.forEach((msg) => {
        switch (msg.role) {
            case "user":
                conversation.addUserMessage(msg.content, msg.id);
                break;
            case "assistant":
                conversation.addAssistantMessage(msg.content, msg.tool_calls, msg.id);
                break;
            case "tool":
                if (msg.tool_name && msg.tool_call_id) {
                    conversation.addToolMessage(
                        msg.content,
                        msg.tool_name,
                        msg.tool_call_id,
                        msg.id
                    );
                }
                break;
            case "system":
                conversation.addSystemMessage(msg.content, msg.id);
                break;
        }
    });

    // Get all messages for storage
    const allMessages = conversation.toDatabase();

    // Update execution with all messages
    await executionRepo.update(executionId, {
        thread_history: allMessages
    });

    // Also save individual messages to agent_messages table with thread_id
    // This allows messages to persist across multiple executions in the same thread
    await executionRepo.saveMessagesToThread(threadId, executionId, messages);

    // Optionally mark execution as completed
    if (markCompleted) {
        await executionRepo.update(executionId, {
            status: "completed",
            completed_at: new Date()
        });
    }

    console.log(
        `[ThreadActivity] Saved ${messages.length} new messages for execution ${executionId} in thread ${threadId}${markCompleted ? " (marked as completed)" : ""}`
    );

    return { saved: messages.length };
}

export interface UpdateThreadTokensInput {
    threadId: string;
    executionId: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    provider?: string;
    model?: string;
}

/**
 * Aggregate token usage for a thread from MODEL_GENERATION spans
 * and store it in thread.metadata.tokenUsage, then emit a streaming event.
 */
export async function updateThreadTokens(input: UpdateThreadTokensInput): Promise<void> {
    const { threadId, executionId, usage, provider, model } = input;

    const result = await db.query<{
        prompt_tokens: string;
        completion_tokens: string;
        total_tokens: string;
        total_cost: string;
        execution_count: string;
    }>(
        `
        SELECT
            COALESCE(SUM((s.attributes->>'promptTokens')::int), 0) as prompt_tokens,
            COALESCE(SUM((s.attributes->>'completionTokens')::int), 0) as completion_tokens,
            COALESCE(SUM((s.attributes->>'totalTokens')::int), 0) as total_tokens,
            COALESCE(SUM((s.attributes->>'totalCost')::numeric), 0) as total_cost,
            COUNT(DISTINCT e.id) as execution_count
        FROM flowmaestro.execution_spans s
        INNER JOIN flowmaestro.agent_executions e ON s.trace_id = e.id
        WHERE e.thread_id = $1
          AND s.span_type = 'model_generation'
          AND s.attributes ? 'totalTokens'
        `,
        [threadId]
    );

    const aggregated = {
        promptTokens: parseInt(result.rows[0].prompt_tokens, 10),
        completionTokens: parseInt(result.rows[0].completion_tokens, 10),
        totalTokens: parseInt(result.rows[0].total_tokens, 10),
        totalCost: parseFloat(result.rows[0].total_cost),
        executionCount: parseInt(result.rows[0].execution_count, 10)
    };

    // Fallback: if aggregation returned zeros but we have usage from the LLM response, use it
    const shouldFallback =
        aggregated.totalTokens === 0 &&
        usage &&
        typeof usage.promptTokens === "number" &&
        typeof usage.completionTokens === "number" &&
        typeof usage.totalTokens === "number";

    // Compute cost if we have usage and pricing info
    const fallbackCost =
        shouldFallback && provider && model
            ? calculateCost({
                  provider,
                  model,
                  promptTokens: usage.promptTokens,
                  completionTokens: usage.completionTokens
              })
            : null;

    const tokenUsage = shouldFallback
        ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              totalCost: fallbackCost?.totalCost ?? aggregated.totalCost ?? 0,
              lastUpdatedAt: new Date().toISOString(),
              executionCount: aggregated.executionCount || 1
          }
        : {
              ...aggregated,
              lastUpdatedAt: new Date().toISOString()
          };

    await db.query(
        `
        UPDATE flowmaestro.threads
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{tokenUsage}',
            $2::jsonb
        )
        WHERE id = $1
        `,
        [threadId, JSON.stringify(tokenUsage)]
    );

    console.log(
        `[ThreadTokens] Updated thread ${threadId}: ${tokenUsage.totalTokens} tokens` +
            `(${tokenUsage.executionCount} executions, $${tokenUsage.totalCost.toFixed(4)})`
    );

    await emitTokensUpdated({
        threadId,
        executionId,
        tokenUsage
    });
}

/**
 * Convert conversation to OpenAI format
 * Useful for format conversion in activities
 */
export interface ConvertToOpenAIInput {
    messages: ThreadMessage[];
}

export async function convertToOpenAI(input: ConvertToOpenAIInput): Promise<unknown[]> {
    const { messages } = input;

    const conversation = new ThreadManager();
    conversation.addFromMemory(messages);

    return conversation.toOpenAI();
}

/**
 * Convert conversation to Anthropic format
 * Useful for format conversion in activities
 */
export interface ConvertToAnthropicInput {
    messages: ThreadMessage[];
}

export async function convertToAnthropic(
    input: ConvertToAnthropicInput
): Promise<{ system: string; messages: unknown[] }> {
    const { messages } = input;

    const conversation = new ThreadManager();
    conversation.addFromMemory(messages);

    return conversation.toAnthropic();
}
