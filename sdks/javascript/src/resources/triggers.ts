/**
 * Triggers Resource
 */

import type { HttpClient } from "../http/base-client";
import type {
    Trigger,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    ExecuteTriggerOptions,
    ExecuteTriggerResponse
} from "../types";

export class Triggers {
    constructor(private readonly http: HttpClient) {}

    /**
     * List all triggers
     *
     * @param options - Pagination options
     * @returns Paginated list of triggers
     *
     * @example
     * ```typescript
     * const { data: triggers } = await client.triggers.list();
     * for (const trigger of triggers) {
     *     console.log(`- ${trigger.name} (${trigger.trigger_type})`);
     *     console.log(`  Enabled: ${trigger.enabled}`);
     *     console.log(`  Triggered ${trigger.trigger_count} times`);
     * }
     * ```
     */
    async list(options: PaginationParams = {}): Promise<PaginatedResponse<Trigger>> {
        return this.http.getPaginated<Trigger>("/api/v1/triggers", {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Execute a trigger manually
     *
     * @param id - Trigger ID
     * @param options - Execution options including inputs
     * @returns Execution details
     *
     * @example
     * ```typescript
     * const { data } = await client.triggers.execute("trigger_123", {
     *     inputs: {
     *         webhook_payload: { event: "user.created", user_id: "123" }
     *     }
     * });
     * console.log(`Started execution: ${data.execution_id}`);
     *
     * // Wait for completion
     * const result = await client.executions.waitForCompletion(data.execution_id);
     * console.log("Result:", result.outputs);
     * ```
     */
    async execute(
        id: string,
        options: ExecuteTriggerOptions = {}
    ): Promise<ApiResponse<ExecuteTriggerResponse>> {
        return this.http.post<ExecuteTriggerResponse>(`/api/v1/triggers/${id}/execute`, {
            inputs: options.inputs || {}
        });
    }
}
