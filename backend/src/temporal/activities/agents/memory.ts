/**
 * Agent Memory Activities - Thread management, semantic search, and memory tools
 */

import type { JsonObject } from "@flowmaestro/shared";
import { calculateCost } from "../../../core/observability";
import { ThreadManager } from "../../../services/agents/ThreadManager";
import { ThreadMemoryService } from "../../../services/agents/ThreadMemoryService";
import { getWorkingMemoryService } from "../../../services/agents/WorkingMemoryService";
import { db } from "../../../storage/database";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { createActivityLogger } from "../../core";
import { emitTokensUpdated } from "./streaming";
import type { Tool } from "../../../storage/models/Agent";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

// =============================================================================
// Loggers and Service Instances
// =============================================================================

const threadLogger = createActivityLogger({ component: "ThreadActivity" });
const threadMemoryLogger = createActivityLogger({ component: "ThreadMemory" });
const workingMemoryLogger = createActivityLogger({ component: "WorkingMemoryTool" });

const executionRepo = new AgentExecutionRepository();
const conversationMemoryService = new ThreadMemoryService();

// =============================================================================
// Types and Interfaces - Thread Activities
// =============================================================================

/**
 * Input for loading thread history
 */
export interface LoadThreadHistoryInput {
    executionId: string;
}

/**
 * Input for saving thread messages incrementally
 */
export interface SaveThreadIncrementalInput {
    executionId: string;
    threadId: string;
    messages: ThreadMessage[];
    markCompleted?: boolean;
}

/**
 * Input for updating thread token usage
 */
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
 * Input for converting messages to OpenAI format
 */
export interface ConvertToOpenAIInput {
    messages: ThreadMessage[];
}

/**
 * Input for converting messages to Anthropic format
 */
export interface ConvertToAnthropicInput {
    messages: ThreadMessage[];
}

// =============================================================================
// Types and Interfaces - Thread Memory (Vector Search)
// =============================================================================

/**
 * Input for storing thread embeddings
 */
export interface StoreThreadEmbeddingsInput {
    agentId: string;
    userId: string;
    executionId: string;
    messages: ThreadMessage[];
    embeddingModel?: string;
    embeddingProvider?: string;
}

/**
 * Input for searching thread memory
 */
export interface SearchThreadMemoryInput {
    agentId: string;
    userId: string;
    query: string;
    topK?: number;
    similarityThreshold?: number;
    contextWindow?: number;
    executionId?: string;
    excludeCurrentExecution?: boolean;
    messageRoles?: ("user" | "assistant" | "system" | "tool")[];
    embeddingModel?: string;
    embeddingProvider?: string;
}

/**
 * Result from thread memory search
 */
export interface SearchThreadMemoryResult {
    query: string;
    results: Array<{
        message_id: string;
        message_role: string;
        content: string;
        similarity: number;
        execution_id: string;
        context_before?: Array<{ role: string; content: string }>;
        context_after?: Array<{ role: string; content: string }>;
    }>;
    totalResults: number;
    contextWindowSize: number;
    formattedForLLM: string;
}

/**
 * Input for getting memory stats
 */
export interface GetMemoryStatsInput {
    agentId: string;
    userId: string;
}

/**
 * Result from memory stats query
 */
export interface MemoryStatsResult {
    totalMessages: number;
    latestMessages: number;
}

/**
 * Input for clearing execution memory
 */
export interface ClearExecutionMemoryInput {
    executionId: string;
}

// =============================================================================
// Types and Interfaces - Working Memory Tool
// =============================================================================

/**
 * Input for updating working memory
 */
export interface UpdateWorkingMemoryInput {
    agentId: string;
    userId: string;
    newMemory: string;
    searchString?: string;
}

// =============================================================================
// Thread Activities - Load, Save, Token Tracking
// =============================================================================

/**
 * Load conversation history for an execution
 * Returns messages that have been persisted to the database
 */
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

    threadLogger.info("Thread messages saved", {
        executionId,
        threadId,
        messageCount: messages.length,
        markCompleted: markCompleted || false
    });

    return { saved: messages.length };
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

    threadLogger.info("Thread token usage updated", {
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
export async function convertToAnthropic(
    input: ConvertToAnthropicInput
): Promise<{ system: string; messages: unknown[] }> {
    const { messages } = input;

    const conversation = new ThreadManager();
    conversation.addFromMemory(messages);

    return conversation.toAnthropic();
}

// =============================================================================
// Thread Memory - Vector Search and Storage
// =============================================================================

/**
 * Store embeddings for conversation messages
 * Called after agent conversations to enable semantic search
 */
export async function storeThreadEmbeddings(
    input: StoreThreadEmbeddingsInput
): Promise<{ stored: number; skipped: number }> {
    const {
        agentId,
        userId,
        executionId,
        messages,
        embeddingModel = "text-embedding-3-small",
        embeddingProvider = "openai"
    } = input;

    threadMemoryLogger.info("Storing thread embeddings", {
        executionId,
        agentId,
        userId,
        messageCount: messages.length,
        embeddingModel,
        embeddingProvider
    });

    const result = await conversationMemoryService.storeThreadEmbeddings({
        agentId,
        userId,
        executionId,
        messages,
        embeddingModel,
        embeddingProvider
    });

    threadMemoryLogger.info("Thread embeddings stored", {
        executionId,
        agentId,
        storedCount: result.stored,
        skippedCount: result.skipped
    });

    return result;
}

/**
 * Search conversation memory using semantic similarity
 * Returns relevant messages with context windows for better conversation continuity
 */
export async function searchThreadMemory(
    input: SearchThreadMemoryInput
): Promise<SearchThreadMemoryResult> {
    const {
        agentId,
        userId,
        query,
        topK = 5,
        similarityThreshold = 0.7,
        contextWindow = 2,
        executionId,
        excludeCurrentExecution = false,
        messageRoles,
        embeddingModel = "text-embedding-3-small",
        embeddingProvider = "openai"
    } = input;

    threadMemoryLogger.info("Searching thread memory", {
        agentId,
        userId,
        queryPreview: query.substring(0, 50),
        topK,
        similarityThreshold,
        contextWindow,
        executionId,
        excludeCurrentExecution
    });

    const searchResult = await conversationMemoryService.searchThreadMemory({
        agentId,
        userId,
        query,
        topK,
        similarityThreshold,
        contextWindow,
        executionId,
        excludeCurrentExecution,
        messageRoles,
        embeddingModel,
        embeddingProvider
    });

    // Format for LLM context
    const formattedForLLM = conversationMemoryService.formatSearchResultsForLLM(searchResult);

    // Simplify results for workflow (remove unnecessary data)
    const simplifiedResults = searchResult.results.map((result) => ({
        message_id: result.message_id,
        message_role: result.message_role,
        content: result.content,
        similarity: result.similarity,
        execution_id: result.execution_id,
        context_before: result.context_before?.map((msg) => ({
            role: msg.message_role,
            content: msg.content
        })),
        context_after: result.context_after?.map((msg) => ({
            role: msg.message_role,
            content: msg.content
        }))
    }));

    return {
        query: searchResult.query,
        results: simplifiedResults,
        totalResults: searchResult.totalResults,
        contextWindowSize: searchResult.contextWindowSize,
        formattedForLLM
    };
}

/**
 * Get conversation memory statistics
 */
export async function getThreadMemoryStats(input: GetMemoryStatsInput): Promise<MemoryStatsResult> {
    const { agentId, userId } = input;

    const stats = await conversationMemoryService.getMemoryStats(agentId, userId);

    threadMemoryLogger.info("Thread memory stats retrieved", {
        agentId,
        userId,
        totalMessages: stats.totalMessages,
        latestMessages: stats.latestMessages
    });

    return stats;
}

/**
 * Clear conversation memory for an execution
 */
export async function clearExecutionMemory(
    input: ClearExecutionMemoryInput
): Promise<{ deleted: number }> {
    const { executionId } = input;

    const deleted = await conversationMemoryService.clearExecutionMemory(executionId);

    return { deleted };
}

// =============================================================================
// Thread Memory Tool - Auto-injected tool for semantic search
// =============================================================================

/**
 * Create the searchThreadMemory tool definition
 * This tool is automatically injected into agent configurations
 */
export function createThreadMemoryTool(): Tool {
    return {
        id: "built-in-search-thread-memory",
        name: "search_thread_memory",
        type: "function",
        description: `Search your thread history to find relevant past interactions.

Use this when you need to:
- Recall previous threads with the user
- Find information discussed in earlier messages
- Check what you've told the user before
- Remember context from past interactions

The search uses semantic similarity to find the most relevant threads, and includes surrounding messages for full context.

Returns:
- Relevant thread excerpts with context
- Similarity scores (how relevant each result is)
- Thread context (messages before and after the match)`,
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description:
                        "What you're searching for. Can be a question, topic, or concept. Example: 'user's favorite color', 'project requirements we discussed', 'API key configuration'"
                },
                topK: {
                    type: "number",
                    description:
                        "Number of results to return (default: 5). Use fewer (2-3) for focused searches, more (5-10) for broader exploration.",
                    minimum: 1,
                    maximum: 20
                },
                similarityThreshold: {
                    type: "number",
                    description:
                        "Minimum similarity score (0-1, default: 0.7). Lower values (0.5-0.6) return more results but less relevant. Higher values (0.8-0.9) return only very relevant matches.",
                    minimum: 0,
                    maximum: 1
                },
                contextWindow: {
                    type: "number",
                    description:
                        "Number of messages before/after each match to include (default: 2). Provides thread context around the matched message.",
                    minimum: 0,
                    maximum: 10
                },
                searchPastExecutions: {
                    type: "boolean",
                    description:
                        "Search across all past threads (default: false). If true, searches beyond current thread. If false, only searches current thread."
                },
                messageRoles: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["user", "assistant", "system"]
                    },
                    description:
                        "Filter by message role (optional). Example: ['user'] to search only user messages, ['assistant'] to search only your responses."
                }
            },
            required: ["query"]
        },
        config: {
            functionName: "search_thread_memory"
        }
    };
}

/**
 * Merge the thread memory tool into agent's available tools
 */
export function injectThreadMemoryTool(existingTools: Tool[]): Tool[] {
    const threadMemoryTool = createThreadMemoryTool();

    // Check if tool already exists
    const toolExists = existingTools.some((tool) => tool.name === threadMemoryTool.name);

    if (toolExists) {
        return existingTools;
    }

    // Add to the beginning for easy discovery
    return [threadMemoryTool, ...existingTools];
}

// =============================================================================
// Working Memory Tool - Persistent memory management
// =============================================================================

/**
 * Create the updateWorkingMemory tool definition
 */
export function createWorkingMemoryTool(): Tool {
    return {
        id: "built-in-update-working-memory",
        name: "update_working_memory",
        description: `Update your working memory with important information about the user. Use this tool to remember key facts, preferences, or context that will be useful in future conversations. The memory persists across conversations.

Examples of what to remember:
- User's name, role, or company
- User's preferences (e.g., "prefers concise responses")
- Important context (e.g., "working on a machine learning project")
- Key facts mentioned (e.g., "has a deadline next Friday")

The memory is append-only by default. Use searchString to find and replace existing information.`,
        type: "function",
        schema: {
            type: "object",
            properties: {
                newMemory: {
                    type: "string",
                    description:
                        "The new information to add to working memory. Be concise and factual."
                },
                searchString: {
                    type: "string",
                    description:
                        "Optional: A string to find in existing memory and replace with newMemory. Use this to update incorrect or outdated information."
                }
            },
            required: ["newMemory"]
        },
        config: {
            functionName: "update_working_memory"
        }
    };
}

/**
 * Execute the updateWorkingMemory tool
 */
export async function executeUpdateWorkingMemory(
    input: UpdateWorkingMemoryInput
): Promise<JsonObject> {
    const workingMemoryService = getWorkingMemoryService();

    try {
        const result = await workingMemoryService.update({
            agentId: input.agentId,
            userId: input.userId,
            newMemory: input.newMemory,
            searchString: input.searchString
        });

        if (result.success) {
            return {
                success: true,
                action: result.reason,
                message: getSuccessMessage(result.reason),
                currentMemory: result.workingMemory
            };
        } else {
            return {
                success: false,
                action: result.reason,
                message: "This information is already in your working memory."
            };
        }
    } catch (error) {
        workingMemoryLogger.error(
            "Failed to update working memory",
            error instanceof Error ? error : new Error(String(error)),
            {
                agentId: input.agentId,
                userId: input.userId,
                hasSearchString: !!input.searchString
            }
        );
        return {
            success: false,
            error: true,
            message: error instanceof Error ? error.message : "Failed to update working memory"
        };
    }
}

/**
 * Get the current working memory for display to the agent
 */
export async function getWorkingMemoryForAgent(
    agentId: string,
    userId: string
): Promise<string | null> {
    const workingMemoryService = getWorkingMemoryService();
    return await workingMemoryService.get(agentId, userId);
}

/**
 * Helper to get success message based on action
 */
function getSuccessMessage(reason: "created" | "appended" | "replaced" | "duplicate"): string {
    switch (reason) {
        case "created":
            return "Working memory created with this information.";
        case "appended":
            return "Information added to working memory.";
        case "replaced":
            return "Working memory updated with new information.";
        case "duplicate":
            return "This information is already in working memory.";
    }
}

/**
 * Check if an agent has working memory enabled
 * For now, we'll check if the agent's metadata has a workingMemoryEnabled flag
 */
export function isWorkingMemoryEnabled(agentMetadata: JsonObject): boolean {
    return agentMetadata.workingMemoryEnabled === true;
}
