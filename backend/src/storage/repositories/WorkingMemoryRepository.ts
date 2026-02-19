/**
 * WorkingMemoryRepository - Database access for agent working memory
 *
 * Supports both global memory (shared across all threads) and thread-scoped memory.
 * - threadId: null/undefined = global memory for this agent-user pair
 * - threadId: <uuid> = memory specific to a particular thread
 */

import type { JsonObject } from "@flowmaestro/shared";
import { db } from "../database";

export interface WorkingMemory {
    id?: string;
    agentId: string;
    userId: string;
    threadId?: string | null;
    workingMemory: string;
    updatedAt: Date;
    createdAt: Date;
    metadata: JsonObject;
}

export interface CreateWorkingMemoryInput {
    agentId: string;
    userId: string;
    threadId?: string | null;
    workingMemory: string;
    metadata?: JsonObject;
}

export interface UpdateWorkingMemoryInput {
    agentId: string;
    userId: string;
    threadId?: string | null;
    workingMemory: string;
    metadata?: JsonObject;
}

export class WorkingMemoryRepository {
    /**
     * Get working memory for an agent-user pair
     * @param threadId - Optional thread ID. null/undefined = global memory, specific ID = thread-scoped
     */
    async get(
        agentId: string,
        userId: string,
        threadId?: string | null
    ): Promise<WorkingMemory | null> {
        // Use COALESCE to handle NULL thread_id comparison
        const threadCondition = threadId ? "thread_id = $3" : "thread_id IS NULL";

        const params = threadId ? [agentId, userId, threadId] : [agentId, userId];

        const result = await db.query<{
            id: string;
            agent_id: string;
            user_id: string;
            thread_id: string | null;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1 AND user_id = $2 AND ${threadCondition}
            `,
            params
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            agentId: row.agent_id,
            userId: row.user_id,
            threadId: row.thread_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        };
    }

    /**
     * Create working memory
     */
    async create(input: CreateWorkingMemoryInput): Promise<WorkingMemory> {
        const result = await db.query<{
            id: string;
            agent_id: string;
            user_id: string;
            thread_id: string | null;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            INSERT INTO flowmaestro.agent_working_memory (agent_id, user_id, thread_id, working_memory, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
            `,
            [
                input.agentId,
                input.userId,
                input.threadId || null,
                input.workingMemory,
                input.metadata || {}
            ]
        );

        const row = result.rows[0];
        return {
            id: row.id,
            agentId: row.agent_id,
            userId: row.user_id,
            threadId: row.thread_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        };
    }

    /**
     * Update working memory (upsert)
     * Uses a unique index on (agent_id, user_id, COALESCE(thread_id, sentinel))
     */
    async update(input: UpdateWorkingMemoryInput): Promise<WorkingMemory> {
        // For upsert with nullable thread_id, we need to check existence first
        const existing = await this.get(input.agentId, input.userId, input.threadId);

        if (existing) {
            // Update existing record
            const result = await db.query<{
                id: string;
                agent_id: string;
                user_id: string;
                thread_id: string | null;
                working_memory: string;
                updated_at: Date;
                created_at: Date;
                metadata: JsonObject;
            }>(
                `
                UPDATE flowmaestro.agent_working_memory
                SET working_memory = $1,
                    metadata = $2,
                    updated_at = NOW()
                WHERE id = $3
                RETURNING id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
                `,
                [input.workingMemory, input.metadata || {}, existing.id]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                agentId: row.agent_id,
                userId: row.user_id,
                threadId: row.thread_id,
                workingMemory: row.working_memory,
                updatedAt: row.updated_at,
                createdAt: row.created_at,
                metadata: row.metadata
            };
        } else {
            // Create new record
            return this.create(input);
        }
    }

    /**
     * Delete working memory
     * @param threadId - Optional thread ID. null/undefined = delete global memory only
     */
    async delete(agentId: string, userId: string, threadId?: string | null): Promise<boolean> {
        const threadCondition = threadId ? "thread_id = $3" : "thread_id IS NULL";

        const params = threadId ? [agentId, userId, threadId] : [agentId, userId];

        const result = await db.query(
            `
            DELETE FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1 AND user_id = $2 AND ${threadCondition}
            `,
            params
        );

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * List all working memory for an agent
     * @param globalOnly - If true, only return global (non-thread-scoped) memories
     */
    async listByAgent(agentId: string, globalOnly: boolean = false): Promise<WorkingMemory[]> {
        const threadCondition = globalOnly ? "AND thread_id IS NULL" : "";

        const result = await db.query<{
            id: string;
            agent_id: string;
            user_id: string;
            thread_id: string | null;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1 ${threadCondition}
            ORDER BY updated_at DESC
            `,
            [agentId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            agentId: row.agent_id,
            userId: row.user_id,
            threadId: row.thread_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        }));
    }

    /**
     * List all working memory for a user (across agents)
     * @param globalOnly - If true, only return global (non-thread-scoped) memories
     */
    async listByUser(userId: string, globalOnly: boolean = false): Promise<WorkingMemory[]> {
        const threadCondition = globalOnly ? "AND thread_id IS NULL" : "";

        const result = await db.query<{
            id: string;
            agent_id: string;
            user_id: string;
            thread_id: string | null;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE user_id = $1 ${threadCondition}
            ORDER BY updated_at DESC
            `,
            [userId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            agentId: row.agent_id,
            userId: row.user_id,
            threadId: row.thread_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        }));
    }

    /**
     * List all working memory for a specific thread
     */
    async listByThread(threadId: string): Promise<WorkingMemory[]> {
        const result = await db.query<{
            id: string;
            agent_id: string;
            user_id: string;
            thread_id: string | null;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT id, agent_id, user_id, thread_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE thread_id = $1
            ORDER BY updated_at DESC
            `,
            [threadId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            agentId: row.agent_id,
            userId: row.user_id,
            threadId: row.thread_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        }));
    }

    /**
     * Delete all thread-scoped memories for a thread (called when thread is deleted)
     */
    async deleteByThread(threadId: string): Promise<number> {
        const result = await db.query(
            `
            DELETE FROM flowmaestro.agent_working_memory
            WHERE thread_id = $1
            `,
            [threadId]
        );

        return result.rowCount ?? 0;
    }

    /**
     * Delete all working memories for an agent
     */
    async deleteByAgent(agentId: string): Promise<number> {
        const result = await db.query(
            `
            DELETE FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1
            `,
            [agentId]
        );

        return result.rowCount ?? 0;
    }
}
