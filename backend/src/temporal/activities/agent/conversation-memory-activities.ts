/**
 * Conversation Memory Activities - Vector memory with context windows for agent conversations
 * Enables semantic search across conversation history with surrounding message context
 */

import { ConversationMemoryService } from "../../../services/conversation/ConversationMemoryService";
import type { ConversationMessage } from "../../../storage/models/AgentExecution";

const conversationMemoryService = new ConversationMemoryService();

/**
 * Store embeddings for conversation messages
 * Called after agent conversations to enable semantic search
 */
export interface StoreConversationEmbeddingsInput {
    agentId: string;
    userId: string;
    executionId: string;
    messages: ConversationMessage[];
    embeddingModel?: string;
    embeddingProvider?: string;
}

export async function storeConversationEmbeddings(
    input: StoreConversationEmbeddingsInput
): Promise<{ stored: number; skipped: number }> {
    const {
        agentId,
        userId,
        executionId,
        messages,
        embeddingModel = "text-embedding-3-small",
        embeddingProvider = "openai"
    } = input;

    console.log(
        `[StoreConversationEmbeddings] Storing embeddings for ${messages.length} messages in execution ${executionId}`
    );

    const result = await conversationMemoryService.storeConversationEmbeddings({
        agentId,
        userId,
        executionId,
        messages,
        embeddingModel,
        embeddingProvider
    });

    console.log(
        `[StoreConversationEmbeddings] Stored ${result.stored} embeddings, skipped ${result.skipped}`
    );

    return result;
}

/**
 * Search conversation memory using semantic similarity
 * Returns relevant messages with context windows for better conversation continuity
 */
export interface SearchConversationMemoryInput {
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

export interface SearchConversationMemoryResult {
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

export async function searchConversationMemory(
    input: SearchConversationMemoryInput
): Promise<SearchConversationMemoryResult> {
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

    console.log(
        `[SearchConversationMemory] Searching for: "${query.substring(0, 50)}..." (topK: ${topK}, threshold: ${similarityThreshold}, context: ${contextWindow})`
    );

    const searchResult = await conversationMemoryService.searchConversationMemory({
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
export interface GetMemoryStatsInput {
    agentId: string;
    userId: string;
}

export interface MemoryStatsResult {
    totalMessages: number;
    latestMessages: number;
}

export async function getConversationMemoryStats(
    input: GetMemoryStatsInput
): Promise<MemoryStatsResult> {
    const { agentId, userId } = input;

    const stats = await conversationMemoryService.getMemoryStats(agentId, userId);

    console.log(
        `[GetMemoryStats] Agent ${agentId}: ${stats.totalMessages} total messages, ${stats.latestMessages} latest`
    );

    return stats;
}

/**
 * Clear conversation memory for an execution
 */
export interface ClearExecutionMemoryInput {
    executionId: string;
}

export async function clearExecutionMemory(
    input: ClearExecutionMemoryInput
): Promise<{ deleted: number }> {
    const { executionId } = input;

    const deleted = await conversationMemoryService.clearExecutionMemory(executionId);

    return { deleted };
}
