/**
 * Agents Resource
 */

import type { HttpClient } from "../http/base-client";
import type {
    Agent,
    Thread,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    CreateThreadOptions
} from "../types";

export class Agents {
    constructor(private readonly http: HttpClient) {}

    /**
     * List all agents
     *
     * @param options - Pagination options
     * @returns Paginated list of agents
     *
     * @example
     * ```typescript
     * const { data: agents } = await client.agents.list();
     * for (const agent of agents) {
     *     console.log(`- ${agent.name} (${agent.model})`);
     * }
     * ```
     */
    async list(options: PaginationParams = {}): Promise<PaginatedResponse<Agent>> {
        return this.http.getPaginated<Agent>("/api/v1/agents", {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Get an agent by ID
     *
     * @param id - Agent ID
     * @returns Agent details
     *
     * @example
     * ```typescript
     * const { data: agent } = await client.agents.get("agent_123");
     * console.log(`Agent: ${agent.name}`);
     * console.log(`Model: ${agent.model}`);
     * ```
     */
    async get(id: string): Promise<ApiResponse<Agent>> {
        return this.http.get<Agent>(`/api/v1/agents/${id}`);
    }

    /**
     * Create a new conversation thread for an agent
     *
     * @param agentId - Agent ID
     * @param options - Thread options
     * @returns Created thread
     *
     * @example
     * ```typescript
     * const { data: thread } = await client.agents.createThread("agent_123", {
     *     metadata: { user_id: "user_456" }
     * });
     * console.log(`Created thread: ${thread.id}`);
     *
     * // Now you can send messages to this thread
     * await client.threads.sendMessage(thread.id, { content: "Hello!" });
     * ```
     */
    async createThread(
        agentId: string,
        options: CreateThreadOptions = {}
    ): Promise<ApiResponse<Thread>> {
        return this.http.post<Thread>(`/api/v1/agents/${agentId}/threads`, {
            metadata: options.metadata
        });
    }
}
