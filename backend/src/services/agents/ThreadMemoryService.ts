/**
 * ThreadMemoryService - High-level service for agent conversation vector memory
 * Integrates EmbeddingService with ThreadEmbeddingRepository for semantic search
 */

import { getLogger } from "../../core/logging";
import {
    ThreadEmbeddingRepository,
    type CreateThreadEmbeddingInput,
    type SearchSimilarMessagesInput,
    type SimilarMessageResult
} from "../../storage/repositories/ThreadEmbeddingRepository";
import { EmbeddingService } from "../embeddings/EmbeddingService";
import type { ThreadMessage } from "../../storage/models/AgentExecution";

const logger = getLogger();

export interface StoreThreadEmbeddingsInput {
    agentId: string;
    userId: string;
    executionId: string;
    threadId: string;
    messages: ThreadMessage[];
    embeddingModel?: string;
    embeddingProvider?: string;
}

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

export interface SearchThreadMemoryResult {
    query: string;
    results: SimilarMessageResult[];
    totalResults: number;
    contextWindowSize: number;
}

export class ThreadMemoryService {
    private embeddingService: EmbeddingService;
    private repository: ThreadEmbeddingRepository;

    constructor(embeddingService?: EmbeddingService, repository?: ThreadEmbeddingRepository) {
        this.embeddingService = embeddingService || new EmbeddingService();
        this.repository = repository || new ThreadEmbeddingRepository();
    }

    /**
     * Store embeddings for conversation messages
     * Generates embeddings and stores them in the database
     */
    async storeThreadEmbeddings(
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

        logger.info(
            {
                component: "ThreadMemoryService",
                executionId,
                agentId,
                userId,
                messageCount: messages.length
            },
            "storeThreadEmbeddings - Starting"
        );

        if (messages.length === 0) {
            logger.info(
                { component: "ThreadMemoryService", executionId },
                "storeThreadEmbeddings - No messages to store"
            );
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

        logger.info(
            {
                component: "ThreadMemoryService",
                executionId,
                totalMessages: messages.length,
                embeddableCount: embeddableMessages.length,
                skippedCount: messages.length - embeddableMessages.length,
                embeddableRoles: embeddableMessages.map((m) => m.role)
            },
            "storeThreadEmbeddings - Filtered messages"
        );

        if (embeddableMessages.length === 0) {
            logger.info(
                { component: "ThreadMemoryService", executionId },
                "storeThreadEmbeddings - No embeddable messages after filtering"
            );
            return { stored: 0, skipped: messages.length };
        }

        // Generate embeddings for all messages
        const texts = embeddableMessages.map((msg) => msg.content);

        logger.info(
            {
                component: "ThreadMemoryService",
                executionId,
                textCount: texts.length,
                embeddingModel,
                embeddingProvider
            },
            "storeThreadEmbeddings - Generating embeddings"
        );

        let embeddingResult;
        try {
            embeddingResult = await this.embeddingService.generateEmbeddings(
                texts,
                {
                    model: embeddingModel,
                    provider: embeddingProvider
                },
                userId
            );

            logger.info(
                {
                    component: "ThreadMemoryService",
                    executionId,
                    embeddingCount: embeddingResult.embeddings.length,
                    firstEmbeddingDim: embeddingResult.embeddings[0]?.length
                },
                "storeThreadEmbeddings - Embeddings generated successfully"
            );
        } catch (embeddingError) {
            logger.error(
                {
                    component: "ThreadMemoryService",
                    executionId,
                    err: embeddingError
                },
                "storeThreadEmbeddings - Embedding generation FAILED"
            );
            throw embeddingError;
        }

        // Create embedding records
        const embeddingInputs: CreateThreadEmbeddingInput[] = embeddableMessages.map(
            (msg, index) => {
                const messageIndex = messages.indexOf(msg); // Original index in conversation
                return {
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: executionId,
                    thread_id: threadId,
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

        logger.info(
            {
                component: "ThreadMemoryService",
                executionId,
                inputCount: embeddingInputs.length
            },
            "storeThreadEmbeddings - Storing in database"
        );

        // Store in database (batch insert)
        let stored;
        try {
            stored = await this.repository.createBatch(embeddingInputs);

            logger.info(
                {
                    component: "ThreadMemoryService",
                    storedCount: stored.length,
                    executionId,
                    inputCount: embeddingInputs.length
                },
                "storeThreadEmbeddings - Database insert complete"
            );
        } catch (dbError) {
            logger.error(
                {
                    component: "ThreadMemoryService",
                    executionId,
                    err: dbError
                },
                "storeThreadEmbeddings - Database insert FAILED"
            );
            throw dbError;
        }

        return {
            stored: stored.length,
            skipped: messages.length - embeddableMessages.length
        };
    }

    /**
     * Search conversation memory using semantic similarity
     * Returns relevant messages with context windows
     */
    async searchThreadMemory(input: SearchThreadMemoryInput): Promise<SearchThreadMemoryResult> {
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

        logger.info(
            {
                component: "ThreadMemoryService",
                agentId,
                userId,
                query: query.substring(0, 100),
                topK,
                similarityThreshold,
                contextWindow,
                executionId,
                excludeCurrentExecution
            },
            "searchThreadMemory - Starting search"
        );

        // Generate query embedding
        let queryEmbedding;
        try {
            queryEmbedding = await this.embeddingService.generateQueryEmbedding(
                query,
                {
                    model: embeddingModel,
                    provider: embeddingProvider
                },
                userId
            );

            logger.info(
                {
                    component: "ThreadMemoryService",
                    embeddingDim: queryEmbedding?.length
                },
                "searchThreadMemory - Query embedding generated"
            );
        } catch (embeddingError) {
            logger.error(
                {
                    component: "ThreadMemoryService",
                    err: embeddingError
                },
                "searchThreadMemory - Query embedding generation FAILED"
            );
            throw embeddingError;
        }

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

        logger.info(
            {
                component: "ThreadMemoryService",
                searchParams: {
                    agent_id: searchInput.agent_id,
                    user_id: searchInput.user_id,
                    top_k: searchInput.top_k,
                    similarity_threshold: searchInput.similarity_threshold,
                    execution_id: searchInput.execution_id,
                    exclude_execution_id: searchInput.exclude_execution_id
                }
            },
            "searchThreadMemory - Executing database search"
        );

        const results = await this.repository.searchSimilar(searchInput);

        logger.info(
            {
                component: "ThreadMemoryService",
                resultCount: results.length,
                queryPreview: query.substring(0, 50),
                topSimilarities: results.slice(0, 3).map((r) => r.similarity)
            },
            "searchThreadMemory - Search complete"
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
    formatSearchResultsForLLM(searchResult: SearchThreadMemoryResult): string {
        if (searchResult.results.length === 0) {
            return "No relevant previous conversations found.";
        }

        const formattedResults = searchResult.results.map((result, index) => {
            const parts: string[] = [];

            // Add header
            parts.push(
                `\n--- Relevant Thread ${index + 1} (Similarity: ${result.similarity.toFixed(3)}) ---`
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

        return `# Relevant Previous Threads\n\nQuery: "${searchResult.query}"\nFound ${searchResult.totalResults} relevant conversation(s):\n${formattedResults.join("\n\n")}`;
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
        logger.info(
            { component: "ThreadMemoryService", deletedCount: deleted, executionId },
            "Cleared execution embeddings"
        );
        return deleted;
    }
}
