/**
 * ThreadEmbeddingRepository - Manages vector embeddings for agent conversations
 * Implements semantic search with context window retrieval for better conversation continuity
 */

import { db } from "../database";

export interface ThreadEmbedding {
    id: string;
    agent_id: string;
    user_id: string;
    execution_id: string;
    message_id: string;
    message_role: "user" | "assistant" | "system" | "tool";
    message_index: number;
    content: string;
    embedding: number[];
    embedding_model: string;
    embedding_provider: string;
    created_at: Date;
}

export interface CreateThreadEmbeddingInput {
    agent_id: string;
    user_id: string;
    execution_id: string;
    message_id: string;
    message_role: "user" | "assistant" | "system" | "tool";
    message_index: number;
    content: string;
    embedding: number[];
    embedding_model: string;
    embedding_provider: string;
}

export interface SearchSimilarMessagesInput {
    agent_id: string;
    user_id: string;
    query_embedding: number[];
    top_k?: number;
    similarity_threshold?: number;
    context_window?: number; // Number of messages before/after to include
    execution_id?: string; // Optional: limit to specific execution
    exclude_execution_id?: string; // Optional: exclude current execution
    message_roles?: ("user" | "assistant" | "system" | "tool")[]; // Optional: filter by role
}

export interface SimilarMessageResult {
    // Core message data
    id: string;
    agent_id: string;
    user_id: string;
    execution_id: string;
    message_id: string;
    message_role: "user" | "assistant" | "system" | "tool";
    message_index: number;
    content: string;
    similarity: number;
    created_at: Date;

    // Context window
    context_before?: ThreadEmbedding[];
    context_after?: ThreadEmbedding[];
}

export class ThreadEmbeddingRepository {
    /**
     * Store a conversation message embedding
     */
    async create(input: CreateThreadEmbeddingInput): Promise<ThreadEmbedding> {
        const result = await db.query<ThreadEmbedding>(
            `INSERT INTO flowmaestro.agent_conversation_embeddings (
                agent_id,
                user_id,
                execution_id,
                message_id,
                message_role,
                message_index,
                content,
                embedding,
                embedding_model,
                embedding_provider
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                input.agent_id,
                input.user_id,
                input.execution_id,
                input.message_id,
                input.message_role,
                input.message_index,
                input.content,
                JSON.stringify(input.embedding),
                input.embedding_model,
                input.embedding_provider
            ]
        );

        return result.rows[0];
    }

    /**
     * Batch create embeddings for multiple messages
     */
    async createBatch(inputs: CreateThreadEmbeddingInput[]): Promise<ThreadEmbedding[]> {
        if (inputs.length === 0) {
            return [];
        }

        // Build VALUES clause with proper parameterization
        const valuesPlaceholders = inputs.map((_, index) => {
            const base = index * 10;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
        });

        const values = inputs.flatMap((input) => [
            input.agent_id,
            input.user_id,
            input.execution_id,
            input.message_id,
            input.message_role,
            input.message_index,
            input.content,
            JSON.stringify(input.embedding),
            input.embedding_model,
            input.embedding_provider
        ]);

        const result = await db.query<ThreadEmbedding>(
            `INSERT INTO flowmaestro.agent_conversation_embeddings (
                agent_id,
                user_id,
                execution_id,
                message_id,
                message_role,
                message_index,
                content,
                embedding,
                embedding_model,
                embedding_provider
            ) VALUES ${valuesPlaceholders.join(", ")}
            ON CONFLICT (execution_id, message_id) DO NOTHING
            RETURNING *`,
            values
        );

        return result.rows;
    }

    /**
     * Search for similar messages with context windows
     * Uses cosine similarity for vector comparison
     */
    async searchSimilar(input: SearchSimilarMessagesInput): Promise<SimilarMessageResult[]> {
        const {
            agent_id,
            user_id,
            query_embedding,
            top_k = 5,
            similarity_threshold = 0.7,
            context_window = 2,
            execution_id,
            exclude_execution_id,
            message_roles
        } = input;

        // Build WHERE clause conditions
        const conditions = ["agent_id = $1", "user_id = $2"];
        const params: unknown[] = [agent_id, user_id];
        let paramIndex = 3;

        if (execution_id) {
            conditions.push(`execution_id = $${paramIndex}`);
            params.push(execution_id);
            paramIndex++;
        }

        if (exclude_execution_id) {
            conditions.push(`execution_id != $${paramIndex}`);
            params.push(exclude_execution_id);
            paramIndex++;
        }

        if (message_roles && message_roles.length > 0) {
            conditions.push(`message_role = ANY($${paramIndex})`);
            params.push(message_roles);
            paramIndex++;
        }

        const whereClause = conditions.join(" AND ");

        // Query for similar messages
        const similarityQuery = `
            SELECT
                id,
                agent_id,
                user_id,
                execution_id,
                message_id,
                message_role,
                message_index,
                content,
                created_at,
                1 - (embedding <=> $${paramIndex}::vector) AS similarity
            FROM flowmaestro.agent_conversation_embeddings
            WHERE ${whereClause}
            AND 1 - (embedding <=> $${paramIndex}::vector) >= $${paramIndex + 1}
            ORDER BY similarity DESC
            LIMIT $${paramIndex + 2}
        `;

        params.push(
            JSON.stringify(query_embedding), // query embedding
            similarity_threshold, // similarity threshold
            top_k // limit
        );

        const similarResults = await db.query(similarityQuery, params);

        if (similarResults.rows.length === 0) {
            return [];
        }

        // For each similar message, fetch context window if requested
        if (context_window === 0) {
            // No context window requested
            return similarResults.rows.map((row) => ({
                id: row.id,
                agent_id: row.agent_id,
                user_id: row.user_id,
                execution_id: row.execution_id,
                message_id: row.message_id,
                message_role: row.message_role as "user" | "assistant" | "system" | "tool",
                message_index: row.message_index,
                content: row.content,
                similarity: row.similarity,
                created_at: row.created_at
            }));
        }

        // Fetch context windows for all similar messages
        const results: SimilarMessageResult[] = [];

        for (const row of similarResults.rows) {
            const contextQuery = `
                SELECT
                    id,
                    agent_id,
                    user_id,
                    execution_id,
                    message_id,
                    message_role,
                    message_index,
                    content,
                    embedding,
                    embedding_model,
                    embedding_provider,
                    created_at
                FROM flowmaestro.agent_conversation_embeddings
                WHERE execution_id = $1
                AND message_index >= $2
                AND message_index <= $3
                ORDER BY message_index ASC
            `;

            const contextResult = await db.query<ThreadEmbedding>(contextQuery, [
                row.execution_id,
                row.message_index - context_window,
                row.message_index + context_window
            ]);

            // Split context into before, current, and after
            const allContext = contextResult.rows;
            const currentIndex = allContext.findIndex((msg) => msg.message_id === row.message_id);

            const context_before = currentIndex > 0 ? allContext.slice(0, currentIndex) : [];
            const context_after =
                currentIndex < allContext.length - 1 ? allContext.slice(currentIndex + 1) : [];

            results.push({
                id: row.id,
                agent_id: row.agent_id,
                user_id: row.user_id,
                execution_id: row.execution_id,
                message_id: row.message_id,
                message_role: row.message_role as "user" | "assistant" | "system" | "tool",
                message_index: row.message_index,
                content: row.content,
                similarity: row.similarity,
                created_at: row.created_at,
                context_before,
                context_after
            });
        }

        return results;
    }

    /**
     * Get embeddings for a specific execution
     */
    async findByExecution(executionId: string): Promise<ThreadEmbedding[]> {
        const result = await db.query<ThreadEmbedding>(
            `SELECT * FROM flowmaestro.agent_conversation_embeddings
             WHERE execution_id = $1
             ORDER BY message_index ASC`,
            [executionId]
        );

        return result.rows;
    }

    /**
     * Delete embeddings for an execution (when execution is deleted)
     */
    async deleteByExecution(executionId: string): Promise<number> {
        const result = await db.query(
            `DELETE FROM flowmaestro.agent_conversation_embeddings
             WHERE execution_id = $1`,
            [executionId]
        );

        return result.rowCount || 0;
    }

    /**
     * Get count of embeddings for an agent-user pair
     */
    async getCount(agentId: string, userId: string): Promise<number> {
        const result = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM flowmaestro.agent_conversation_embeddings
             WHERE agent_id = $1 AND user_id = $2`,
            [agentId, userId]
        );

        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Get latest embeddings for an agent-user pair (for memory recap)
     */
    async getLatest(
        agentId: string,
        userId: string,
        limit: number = 10
    ): Promise<ThreadEmbedding[]> {
        const result = await db.query<ThreadEmbedding>(
            `SELECT * FROM flowmaestro.agent_conversation_embeddings
             WHERE agent_id = $1 AND user_id = $2
             ORDER BY created_at DESC
             LIMIT $3`,
            [agentId, userId, limit]
        );

        return result.rows;
    }
}
