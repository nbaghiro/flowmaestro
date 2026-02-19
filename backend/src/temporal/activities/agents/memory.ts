/**
 * Agent Memory Activities - Thread management, semantic search, memory tools, and summarization
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../core/config";
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
    threadId: string;
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
 * Accumulate token usage for a thread and store it in thread.metadata.tokenUsage,
 * then emit a streaming event.
 *
 * Note: Previously this queried execution_spans table, but spans are now exported
 * to GCP Cloud Trace via OpenTelemetry. Token tracking now uses direct accumulation
 * from the usage parameter passed by the agent execution.
 */
export async function updateThreadTokens(input: UpdateThreadTokensInput): Promise<void> {
    const { threadId, executionId, usage, provider, model } = input;

    // Load existing token usage from thread metadata for accumulation
    const existingUsageResult = await db.query<{
        token_usage: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
            totalCost?: number;
            executionCount?: number;
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
    const priorExecutionCount = existingUsage.executionCount || 0;

    // Get current execution's token usage
    const usagePrompt = usage?.promptTokens ?? 0;
    const usageCompletion = usage?.completionTokens ?? 0;
    const usageTotal =
        usage?.totalTokens ??
        (typeof usagePrompt === "number" && typeof usageCompletion === "number"
            ? usagePrompt + usageCompletion
            : 0);

    // Accumulate tokens from this execution
    const effectivePromptTokens = priorPromptTokens + usagePrompt;
    const effectiveCompletionTokens = priorCompletionTokens + usageCompletion;
    const effectiveTotalTokens = priorTotalTokens + usageTotal;

    // Compute cost for this execution's tokens
    const costResult =
        provider && model && usageTotal > 0
            ? calculateCost({
                  provider,
                  model,
                  promptTokens: usagePrompt,
                  completionTokens: usageCompletion
              })
            : null;

    const executionCost = costResult?.totalCost ?? 0;

    const tokenUsage = {
        promptTokens: effectivePromptTokens,
        completionTokens: effectiveCompletionTokens,
        totalTokens: effectiveTotalTokens,
        totalCost: priorTotalCost + executionCost,
        lastUpdatedAt: new Date().toISOString(),
        executionCount: priorExecutionCount + 1
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
        threadId,
        messages,
        embeddingModel = "text-embedding-3-small",
        embeddingProvider = "openai"
    } = input;

    // Detailed logging to help debug embedding storage issues
    threadMemoryLogger.info("Storing thread embeddings - START", {
        executionId,
        agentId,
        userId,
        threadId,
        messageCount: messages.length,
        embeddingModel,
        embeddingProvider,
        messageRoles: messages.map((m) => m.role),
        messagePreview: messages.slice(0, 3).map((m) => ({
            role: m.role,
            contentLength: m.content?.length ?? 0,
            preview: m.content?.substring(0, 50)
        }))
    });

    try {
        const result = await conversationMemoryService.storeThreadEmbeddings({
            agentId,
            userId,
            executionId,
            threadId,
            messages,
            embeddingModel,
            embeddingProvider
        });

        threadMemoryLogger.info("Thread embeddings stored - SUCCESS", {
            executionId,
            agentId,
            userId,
            storedCount: result.stored,
            skippedCount: result.skipped
        });

        return result;
    } catch (error) {
        // Log the full error for debugging
        threadMemoryLogger.error(
            "Thread embeddings storage - FAILED",
            error instanceof Error ? error : new Error(String(error)),
            {
                executionId,
                agentId,
                userId,
                messageCount: messages.length
            }
        );
        throw error;
    }
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
                        "Search across all past threads (default: true). Set to false to only search the current thread."
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
// Clear Thread Memory Tool - Reset conversation memory
// =============================================================================

/**
 * Create the clearThreadMemory tool definition
 * This tool allows agents to clear conversation memory when appropriate
 */
export function createClearThreadMemoryTool(): Tool {
    return {
        id: "built-in-clear-thread-memory",
        name: "clear_thread_memory",
        description: `Clear the conversation memory for this thread. Use this tool when:
- The user explicitly requests to start fresh or "forget everything"
- The topic has changed significantly and old context is no longer relevant
- The conversation has become confused due to accumulated misunderstandings
- You want to reset the context to provide clearer responses

Note: This clears the vector embeddings used for semantic search, not the visible conversation history.
The user will still see previous messages, but you won't retrieve them for context.`,
        type: "function",
        schema: {
            type: "object",
            properties: {
                reason: {
                    type: "string",
                    description:
                        "Brief reason for clearing memory (for logging purposes). Example: 'User requested fresh start'"
                },
                confirmation: {
                    type: "boolean",
                    description:
                        "Set to true to confirm the clear operation. This is required to prevent accidental clearing."
                }
            },
            required: ["confirmation"]
        },
        config: {
            functionName: "clear_thread_memory"
        }
    };
}

/**
 * Input for clearing thread memory
 */
export interface ClearThreadMemoryInput {
    executionId: string;
    agentId: string;
    userId: string;
    reason?: string;
}

/**
 * Execute the clearThreadMemory tool
 */
export async function executeClearThreadMemory(input: ClearThreadMemoryInput): Promise<JsonObject> {
    const { executionId, agentId, userId, reason } = input;

    threadMemoryLogger.info("Clearing thread memory", {
        executionId,
        agentId,
        userId,
        reason
    });

    try {
        const deleted = await conversationMemoryService.clearExecutionMemory(executionId);

        threadMemoryLogger.info("Thread memory cleared", {
            executionId,
            agentId,
            userId,
            deletedCount: deleted,
            reason
        });

        return {
            success: true,
            message: `Cleared ${deleted} memory entries from this conversation.${reason ? ` Reason: ${reason}` : ""}`,
            deletedCount: deleted
        };
    } catch (error) {
        threadMemoryLogger.error(
            "Failed to clear thread memory",
            error instanceof Error ? error : new Error(String(error)),
            {
                executionId,
                agentId,
                userId,
                reason
            }
        );
        return {
            success: false,
            error: true,
            message: error instanceof Error ? error.message : "Failed to clear thread memory"
        };
    }
}

/**
 * Inject both thread memory tools (search and clear) into agent's available tools
 */
export function injectThreadMemoryTools(existingTools: Tool[]): Tool[] {
    const searchTool = createThreadMemoryTool();
    const clearTool = createClearThreadMemoryTool();

    const toolsToAdd: Tool[] = [];

    // Check if search tool already exists
    if (!existingTools.some((tool) => tool.name === searchTool.name)) {
        toolsToAdd.push(searchTool);
    }

    // Check if clear tool already exists
    if (!existingTools.some((tool) => tool.name === clearTool.name)) {
        toolsToAdd.push(clearTool);
    }

    // Add to the beginning for easy discovery
    return [...toolsToAdd, ...existingTools];
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

/**
 * Inject the working memory tool into agent's available tools
 */
export function injectWorkingMemoryTool(existingTools: Tool[]): Tool[] {
    const workingMemoryTool = createWorkingMemoryTool();

    // Check if tool already exists
    const toolExists = existingTools.some((tool) => tool.name === workingMemoryTool.name);

    if (toolExists) {
        return existingTools;
    }

    workingMemoryLogger.debug("Injecting working memory tool");

    // Add to the beginning for easy discovery
    return [workingMemoryTool, ...existingTools];
}

// =============================================================================
// Shared Memory Tools - In-workflow key-value storage with semantic search
// =============================================================================

const sharedMemoryLogger = createActivityLogger({ component: "SharedMemoryTool" });

/**
 * Create the read_shared_memory tool definition
 */
export function createReadSharedMemoryTool(): Tool {
    return {
        id: "built-in-read-shared-memory",
        name: "read_shared_memory",
        type: "function",
        description: `Read a value from the workflow's shared memory by key.

Use this when you need to:
- Retrieve information stored earlier in this workflow execution
- Check if a particular key exists in shared memory
- Access data that other nodes have stored

Returns the value if found, or null if the key doesn't exist.`,
        schema: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                    description: "The key to read from shared memory"
                }
            },
            required: ["key"]
        },
        config: {
            functionName: "read_shared_memory"
        }
    };
}

/**
 * Create the write_shared_memory tool definition
 */
export function createWriteSharedMemoryTool(): Tool {
    return {
        id: "built-in-write-shared-memory",
        name: "write_shared_memory",
        type: "function",
        description: `Write a value to the workflow's shared memory.

Use this when you need to:
- Store information for later use in this workflow execution
- Share data with other nodes in the workflow
- Save intermediate results that other parts of the workflow need

The value will be available to all nodes in this workflow execution.
Enable semantic search for longer text values to allow finding them by meaning later.`,
        schema: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                    description: "The key to store the value under"
                },
                value: {
                    type: ["string", "number", "boolean", "object", "array"],
                    description: "The value to store"
                },
                enableSemanticSearch: {
                    type: "boolean",
                    description:
                        "Enable semantic search for this value (default: false). When enabled, the value can be found using search_shared_memory. Only useful for longer text content."
                }
            },
            required: ["key", "value"]
        },
        config: {
            functionName: "write_shared_memory"
        }
    };
}

/**
 * Create the search_shared_memory tool definition
 */
export function createSearchSharedMemoryTool(): Tool {
    return {
        id: "built-in-search-shared-memory",
        name: "search_shared_memory",
        type: "function",
        description: `Search the workflow's shared memory using semantic similarity.

Use this when you need to:
- Find information stored earlier by meaning (not just exact key)
- Search for relevant data without knowing the exact key
- Retrieve related content from shared memory

Note: Only values stored with enableSemanticSearch=true can be found via search.`,
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "What you're searching for. Describe the information you need."
                },
                topK: {
                    type: "number",
                    description: "Maximum number of results to return (default: 5)",
                    minimum: 1,
                    maximum: 20
                },
                similarityThreshold: {
                    type: "number",
                    description:
                        "Minimum similarity score (0-1, default: 0.7). Lower values return more results.",
                    minimum: 0,
                    maximum: 1
                }
            },
            required: ["query"]
        },
        config: {
            functionName: "search_shared_memory"
        }
    };
}

/**
 * Inject shared memory tools into agent's available tools
 */
export function injectSharedMemoryTools(existingTools: Tool[]): Tool[] {
    const sharedMemoryTools = [
        createReadSharedMemoryTool(),
        createWriteSharedMemoryTool(),
        createSearchSharedMemoryTool()
    ];

    // Filter out tools that already exist
    const newTools = sharedMemoryTools.filter(
        (newTool) => !existingTools.some((existing) => existing.name === newTool.name)
    );

    if (newTools.length === 0) {
        return existingTools;
    }

    sharedMemoryLogger.debug("Injecting shared memory tools", {
        toolCount: newTools.length,
        toolNames: newTools.map((t) => t.name)
    });

    return [...newTools, ...existingTools];
}

/**
 * Input for shared memory tool execution
 */
export interface SharedMemoryToolInput {
    toolName: "read_shared_memory" | "write_shared_memory" | "search_shared_memory";
    arguments: JsonObject;
}

/**
 * Result from shared memory tool execution
 */
export interface SharedMemoryToolResult {
    result: JsonObject;
    /** If true, the context was modified and needs to be merged back */
    contextModified: boolean;
    /** Serialized context updates to merge back (only when contextModified=true) */
    contextUpdates?: JsonObject;
}

/**
 * Check if a tool name is a shared memory tool
 */
export function isSharedMemoryTool(toolName: string): boolean {
    return ["read_shared_memory", "write_shared_memory", "search_shared_memory"].includes(toolName);
}

// =============================================================================
// Message Summarization Activity
// =============================================================================

const summarizeLogger = createActivityLogger({ component: "SummarizeActivity" });

/**
 * Input for summarizing messages
 */
export interface SummarizeMessagesInput {
    messages: ThreadMessage[];
    model?: string;
    provider?: "openai" | "anthropic";
    maxSummaryTokens?: number;
}

/**
 * Result from message summarization
 */
export interface SummarizeMessagesResult {
    summary: string;
    originalMessageCount: number;
    originalTokenEstimate: number;
    summaryTokenEstimate: number;
    tokensSaved: number;
}

/**
 * Summarize a list of messages into a concise summary.
 * Used by the summary memory type to compress older conversation history.
 */
export async function summarizeMessages(
    input: SummarizeMessagesInput
): Promise<SummarizeMessagesResult> {
    const { messages, model = "gpt-4o-mini", provider = "openai", maxSummaryTokens = 500 } = input;

    if (messages.length === 0) {
        return {
            summary: "",
            originalMessageCount: 0,
            originalTokenEstimate: 0,
            summaryTokenEstimate: 0,
            tokensSaved: 0
        };
    }

    // Estimate original token count (rough: 4 chars per token)
    const originalTokenEstimate = messages.reduce(
        (acc, m) => acc + Math.ceil(m.content.length / 4),
        0
    );

    // Format messages for summarization
    const formattedMessages = messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n\n");

    const systemPrompt = `You are a conversation summarizer. Your task is to create a concise summary of the following conversation that preserves:
1. Key facts and information shared
2. Important decisions or conclusions reached
3. User preferences or requirements mentioned
4. Any commitments or action items

Keep the summary under ${maxSummaryTokens} tokens. Focus on information that would be useful context for continuing the conversation later.`;

    const userPrompt = `Please summarize the following conversation:\n\n${formattedMessages}`;

    summarizeLogger.info("Summarizing messages", {
        messageCount: messages.length,
        originalTokenEstimate,
        provider,
        model
    });

    let summary: string;

    try {
        if (provider === "anthropic") {
            const apiKey = appConfig.ai.anthropic.apiKey;
            if (!apiKey) {
                throw new Error("Anthropic API key not configured");
            }

            const anthropic = new Anthropic({ apiKey });
            const response = await anthropic.messages.create({
                model: model || "claude-3-haiku-20240307",
                max_tokens: maxSummaryTokens,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }]
            });

            const textBlock = response.content.find((block) => block.type === "text");
            summary = textBlock ? textBlock.text : "";
        } else {
            // Default to OpenAI
            const apiKey = appConfig.ai.openai.apiKey;
            if (!apiKey) {
                throw new Error("OpenAI API key not configured");
            }

            const openai = new OpenAI({ apiKey });
            const response = await openai.chat.completions.create({
                model: model || "gpt-4o-mini",
                max_tokens: maxSummaryTokens,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            });

            summary = response.choices[0]?.message?.content || "";
        }
    } catch (error) {
        summarizeLogger.error(
            "Failed to summarize messages",
            error instanceof Error ? error : new Error(String(error)),
            { messageCount: messages.length }
        );
        throw error;
    }

    const summaryTokenEstimate = Math.ceil(summary.length / 4);
    const tokensSaved = Math.max(0, originalTokenEstimate - summaryTokenEstimate);

    summarizeLogger.info("Messages summarized successfully", {
        originalMessageCount: messages.length,
        originalTokenEstimate,
        summaryTokenEstimate,
        tokensSaved
    });

    return {
        summary,
        originalMessageCount: messages.length,
        originalTokenEstimate,
        summaryTokenEstimate,
        tokensSaved
    };
}
