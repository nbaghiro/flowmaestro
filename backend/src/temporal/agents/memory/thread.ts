/**
 * Thread Activities - Activities for managing conversations with ThreadManager
 */

import { calculateCost } from "../../../core/tracing/cost-calculator";
import { ThreadManager } from "../../../services/agents/ThreadManager";
import { db } from "../../../storage/database";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { emitTokensUpdated } from "../streaming";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";
import { createActivityLogger } from "../../shared/logger";

const logger = createActivityLogger({ component: "ThreadActivity" });

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

    logger.info("Thread messages saved", {
        executionId,
        threadId,
        messageCount: messages.length,
        markCompleted: markCompleted || false
    });

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

    // Load existing token usage from thread metadata for accumulation when spans are missing
    const existingUsageResult = await db.query<{
        token_usage: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
            totalCost?: number;
        } | null;
    }>(
        `
        SELECT (metadata->'tokenUsage') AS token_usage
        FROM flowmaestro.threads
        WHERE id = $1
        `,
        [threadId]
    );

    const existingUsage = existingUsageResult.rows[0]?.token_usage || {};
    const priorPromptTokens = existingUsage.promptTokens || 0;
    const priorCompletionTokens = existingUsage.completionTokens || 0;
    const priorTotalTokens = existingUsage.totalTokens || 0;
    const priorTotalCost = existingUsage.totalCost || 0;
    const usagePrompt = usage?.promptTokens ?? 0;
    const usageCompletion = usage?.completionTokens ?? 0;
    const usageTotal =
        usage?.totalTokens ??
        (typeof usagePrompt === "number" && typeof usageCompletion === "number"
            ? usagePrompt + usageCompletion
            : 0);

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

    // Fallback usage when spans are incomplete
    const usageFallbackAvailable =
        usage &&
        typeof usage.promptTokens === "number" &&
        typeof usage.completionTokens === "number";

    // Start from the higher of aggregated vs existing totals
    const basePromptTokens = Math.max(aggregated.promptTokens, priorPromptTokens);
    const baseCompletionTokens = Math.max(aggregated.completionTokens, priorCompletionTokens);
    const baseTotalTokens = Math.max(aggregated.totalTokens, priorTotalTokens);

    // If spans missed this execution but usage is present, add the missing delta
    const effectivePromptTokens =
        usageFallbackAvailable && aggregated.promptTokens < priorPromptTokens + usagePrompt
            ? priorPromptTokens + usagePrompt
            : basePromptTokens;

    const effectiveCompletionTokens =
        usageFallbackAvailable &&
        aggregated.completionTokens < priorCompletionTokens + usageCompletion
            ? priorCompletionTokens + usageCompletion
            : baseCompletionTokens;

    const effectiveTotalTokens =
        usageFallbackAvailable && aggregated.totalTokens < priorTotalTokens + usageTotal
            ? priorTotalTokens + usageTotal
            : baseTotalTokens;

    // Compute cost if missing/zero
    const shouldComputeCost =
        provider &&
        model &&
        effectiveTotalTokens > 0 &&
        (aggregated.totalCost === 0 ||
            aggregated.totalCost === null ||
            aggregated.totalCost === undefined);

    const costResult =
        shouldComputeCost && provider && model
            ? calculateCost({
                  provider,
                  model,
                  promptTokens: effectivePromptTokens,
                  completionTokens: effectiveCompletionTokens
              })
            : null;

    const tokenUsage = {
        promptTokens: effectivePromptTokens,
        completionTokens: effectiveCompletionTokens,
        totalTokens: effectiveTotalTokens,
        totalCost: costResult?.totalCost ?? aggregated.totalCost ?? priorTotalCost ?? 0,
        lastUpdatedAt: new Date().toISOString(),
        executionCount: aggregated.executionCount || 1
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

    logger.info("Thread token usage updated", {
        threadId,
        executionId,
        totalTokens: tokenUsage.totalTokens,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        executionCount: tokenUsage.executionCount,
        totalCost: tokenUsage.totalCost
    });

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
