/**
 * ConversationMemoryService - High-level service for agent conversation vector memory
 * Integrates EmbeddingService with ConversationEmbeddingRepository for semantic search
 */

import {
    ConversationEmbeddingRepository,
    type CreateConversationEmbeddingInput,
    type SearchSimilarMessagesInput,
    type SimilarMessageResult
} from "../../storage/repositories/ConversationEmbeddingRepository";
import { EmbeddingService } from "../embeddings/EmbeddingService";
import type { ConversationMessage } from "../../storage/models/AgentExecution";

export interface StoreConversationEmbeddingsInput {
    agentId: string;
    userId: string;
    executionId: string;
    messages: ConversationMessage[];
    embeddingModel?: string;
    embeddingProvider?: string;
}

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
    results: SimilarMessageResult[];
    totalResults: number;
    contextWindowSize: number;
}

export class ConversationMemoryService {
    private embeddingService: EmbeddingService;
    private repository: ConversationEmbeddingRepository;

    constructor(embeddingService?: EmbeddingService, repository?: ConversationEmbeddingRepository) {
        this.embeddingService = embeddingService || new EmbeddingService();
        this.repository = repository || new ConversationEmbeddingRepository();
    }

    /**
     * Store embeddings for conversation messages
     * Generates embeddings and stores them in the database
     */
    async storeConversationEmbeddings(
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

        if (messages.length === 0) {
            return { stored: 0, skipped: 0 };
        }

        // Filter out messages that shouldn't be embedded (e.g., tool calls, empty content)
        const embeddableMessages = messages.filter((msg) => {
            // Skip tool messages (they're usually JSON results)
            if (msg.role === "tool") {
                return false;
            }

            // Skip messages with no content
            if (!msg.content || msg.content.trim().length === 0) {
                return false;
            }

            // Skip very short messages (less than 10 characters)
            if (msg.content.trim().length < 10) {
                return false;
            }

            return true;
        });

        if (embeddableMessages.length === 0) {
            return { stored: 0, skipped: messages.length };
        }

        // Generate embeddings for all messages
        const texts = embeddableMessages.map((msg) => msg.content);
        const embeddingResult = await this.embeddingService.generateEmbeddings(
            texts,
            {
                model: embeddingModel,
                provider: embeddingProvider
            },
            userId
        );

        // Create embedding records
        const embeddingInputs: CreateConversationEmbeddingInput[] = embeddableMessages.map(
            (msg, index) => {
                const messageIndex = messages.indexOf(msg); // Original index in conversation
                return {
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: executionId,
                    message_id: msg.id,
                    message_role: msg.role as "user" | "assistant" | "system" | "tool",
                    message_index: messageIndex,
                    content: msg.content,
                    embedding: embeddingResult.embeddings[index],
                    embedding_model: embeddingModel,
                    embedding_provider: embeddingProvider
                };
            }
        );

        // Store in database (batch insert)
        const stored = await this.repository.createBatch(embeddingInputs);

        console.log(
            `[ConversationMemoryService] Stored ${stored.length} embeddings for execution ${executionId}`
        );

        return {
            stored: stored.length,
            skipped: messages.length - embeddableMessages.length
        };
    }

    /**
     * Search conversation memory using semantic similarity
     * Returns relevant messages with context windows
     */
    async searchConversationMemory(
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

        // Generate query embedding
        const queryEmbedding = await this.embeddingService.generateQueryEmbedding(
            query,
            {
                model: embeddingModel,
                provider: embeddingProvider
            },
            userId
        );

        // Search for similar messages
        const searchInput: SearchSimilarMessagesInput = {
            agent_id: agentId,
            user_id: userId,
            query_embedding: queryEmbedding,
            top_k: topK,
            similarity_threshold: similarityThreshold,
            context_window: contextWindow,
            message_roles: messageRoles
        };

        if (executionId) {
            if (excludeCurrentExecution) {
                searchInput.exclude_execution_id = executionId;
            } else {
                searchInput.execution_id = executionId;
            }
        }

        const results = await this.repository.searchSimilar(searchInput);

        console.log(
            `[ConversationMemoryService] Found ${results.length} similar messages for query: "${query.substring(0, 50)}..."`
        );

        return {
            query,
            results,
            totalResults: results.length,
            contextWindowSize: contextWindow
        };
    }

    /**
     * Format search results for LLM context
     * Creates a readable string with messages and their context
     */
    formatSearchResultsForLLM(searchResult: SearchConversationMemoryResult): string {
        if (searchResult.results.length === 0) {
            return "No relevant previous conversations found.";
        }

        const formattedResults = searchResult.results.map((result, index) => {
            const parts: string[] = [];

            // Add header
            parts.push(
                `\n--- Relevant Conversation ${index + 1} (Similarity: ${result.similarity.toFixed(3)}) ---`
            );

            // Add context before (if available)
            if (result.context_before && result.context_before.length > 0) {
                parts.push("\n[Context before]:");
                result.context_before.forEach((msg) => {
                    parts.push(`${msg.message_role}: ${msg.content}`);
                });
            }

            // Add the matched message
            parts.push("\n[Matched message]:");
            parts.push(`${result.message_role}: ${result.content}`);

            // Add context after (if available)
            if (result.context_after && result.context_after.length > 0) {
                parts.push("\n[Context after]:");
                result.context_after.forEach((msg) => {
                    parts.push(`${msg.message_role}: ${msg.content}`);
                });
            }

            return parts.join("\n");
        });

        return `# Relevant Previous Conversations\n\nQuery: "${searchResult.query}"\nFound ${searchResult.totalResults} relevant conversation(s):\n${formattedResults.join("\n\n")}`;
    }

    /**
     * Get conversation memory statistics
     */
    async getMemoryStats(
        agentId: string,
        userId: string
    ): Promise<{
        totalMessages: number;
        latestMessages: number;
    }> {
        const totalMessages = await this.repository.getCount(agentId, userId);
        const latestMessages = (await this.repository.getLatest(agentId, userId, 10)).length;

        return {
            totalMessages,
            latestMessages
        };
    }

    /**
     * Clear conversation memory for an execution
     */
    async clearExecutionMemory(executionId: string): Promise<number> {
        const deleted = await this.repository.deleteByExecution(executionId);
        console.log(
            `[ConversationMemoryService] Cleared ${deleted} embeddings for execution ${executionId}`
        );
        return deleted;
    }
}
