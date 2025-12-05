/**
 * WorkingMemoryService - Manages agent working memory with mutex protection
 * Implements Mastra-inspired working memory with concurrent update safety
 */

import { Mutex } from "async-mutex";
import { WorkingMemoryRepository } from "../../storage/repositories/WorkingMemoryRepository";

export interface UpdateWorkingMemoryInput {
    agentId: string;
    userId: string;
    newMemory: string;
    searchString?: string; // Optional: for search and replace
}

export interface UpdateWorkingMemoryResult {
    success: boolean;
    reason: "created" | "appended" | "replaced" | "duplicate";
    workingMemory: string;
}

/**
 * WorkingMemoryService - Thread-safe working memory management
 */
export class WorkingMemoryService {
    private repository: WorkingMemoryRepository;
    private mutexes: Map<string, Mutex>;

    constructor() {
        this.repository = new WorkingMemoryRepository();
        this.mutexes = new Map();
    }

    /**
     * Get or create mutex for an agent-user pair
     */
    private getMutex(agentId: string, userId: string): Mutex {
        const key = `${agentId}:${userId}`;

        if (!this.mutexes.has(key)) {
            this.mutexes.set(key, new Mutex());
        }

        return this.mutexes.get(key)!;
    }

    /**
     * Get working memory for an agent-user pair
     */
    async get(agentId: string, userId: string): Promise<string | null> {
        const memory = await this.repository.get(agentId, userId);
        return memory?.workingMemory || null;
    }

    /**
     * Update working memory with mutex protection
     * Supports: create, append, replace, duplicate detection
     */
    async update(input: UpdateWorkingMemoryInput): Promise<UpdateWorkingMemoryResult> {
        const { agentId, userId, newMemory, searchString } = input;

        // Get mutex for this agent-user pair
        const mutex = this.getMutex(agentId, userId);

        // Acquire lock
        const release = await mutex.acquire();

        try {
            // Read current memory
            const existing = await this.repository.get(agentId, userId);
            const currentMemory = existing?.workingMemory || "";

            // If no existing memory, create new
            if (!currentMemory) {
                await this.repository.create({
                    agentId,
                    userId,
                    workingMemory: newMemory
                });

                return {
                    success: true,
                    reason: "created",
                    workingMemory: newMemory
                };
            }

            // Search and replace if searchString provided
            if (searchString && currentMemory.includes(searchString)) {
                const updatedMemory = currentMemory.replace(searchString, newMemory);

                await this.repository.update({
                    agentId,
                    userId,
                    workingMemory: updatedMemory
                });

                return {
                    success: true,
                    reason: "replaced",
                    workingMemory: updatedMemory
                };
            }

            // Duplicate detection
            if (currentMemory.includes(newMemory)) {
                return {
                    success: false,
                    reason: "duplicate",
                    workingMemory: currentMemory
                };
            }

            // Append new memory
            const updatedMemory = currentMemory + "\n" + newMemory;

            await this.repository.update({
                agentId,
                userId,
                workingMemory: updatedMemory
            });

            return {
                success: true,
                reason: "appended",
                workingMemory: updatedMemory
            };
        } finally {
            // Always release lock
            release();
        }
    }

    /**
     * Replace entire working memory (dangerous - use with caution)
     */
    async replace(agentId: string, userId: string, newMemory: string): Promise<void> {
        const mutex = this.getMutex(agentId, userId);
        const release = await mutex.acquire();

        try {
            await this.repository.update({
                agentId,
                userId,
                workingMemory: newMemory
            });
        } finally {
            release();
        }
    }

    /**
     * Delete working memory
     */
    async delete(agentId: string, userId: string): Promise<boolean> {
        const mutex = this.getMutex(agentId, userId);
        const release = await mutex.acquire();

        try {
            const deleted = await this.repository.delete(agentId, userId);

            // Clean up mutex if memory deleted
            if (deleted) {
                const key = `${agentId}:${userId}`;
                this.mutexes.delete(key);
            }

            return deleted;
        } finally {
            release();
        }
    }

    /**
     * List all working memory for an agent
     */
    async listByAgent(agentId: string): Promise<
        Array<{
            userId: string;
            workingMemory: string;
            updatedAt: Date;
        }>
    > {
        const memories = await this.repository.listByAgent(agentId);

        return memories.map((m) => ({
            userId: m.userId,
            workingMemory: m.workingMemory,
            updatedAt: m.updatedAt
        }));
    }

    /**
     * List all working memory for a user (across agents)
     */
    async listByUser(userId: string): Promise<
        Array<{
            agentId: string;
            workingMemory: string;
            updatedAt: Date;
        }>
    > {
        const memories = await this.repository.listByUser(userId);

        return memories.map((m) => ({
            agentId: m.agentId,
            workingMemory: m.workingMemory,
            updatedAt: m.updatedAt
        }));
    }

    /**
     * Cleanup unused mutexes (call periodically)
     */
    cleanupMutexes(): void {
        // Remove mutexes that are not locked
        const keysToRemove: string[] = [];

        this.mutexes.forEach((mutex, key) => {
            if (!mutex.isLocked()) {
                keysToRemove.push(key);
            }
        });

        keysToRemove.forEach((key) => this.mutexes.delete(key));
    }
}

/**
 * Singleton instance
 */
let workingMemoryServiceInstance: WorkingMemoryService | null = null;

export function getWorkingMemoryService(): WorkingMemoryService {
    if (!workingMemoryServiceInstance) {
        workingMemoryServiceInstance = new WorkingMemoryService();
    }
    return workingMemoryServiceInstance;
}
