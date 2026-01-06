/**
 * Webhooks Resource
 */

import type { HttpClient } from "../http/base-client";
import type {
    Webhook,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    CreateWebhookOptions,
    TestWebhookResponse
} from "../types";

export class Webhooks {
    constructor(private readonly http: HttpClient) {}

    /**
     * List all webhooks
     *
     * @param options - Pagination options
     * @returns Paginated list of webhooks
     *
     * @example
     * ```typescript
     * const { data: webhooks } = await client.webhooks.list();
     * for (const webhook of webhooks) {
     *     console.log(`- ${webhook.name}: ${webhook.url}`);
     *     console.log(`  Events: ${webhook.events.join(", ")}`);
     *     console.log(`  Active: ${webhook.is_active}`);
     * }
     * ```
     */
    async list(options: PaginationParams = {}): Promise<PaginatedResponse<Webhook>> {
        return this.http.getPaginated<Webhook>("/api/v1/webhooks", {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Get a webhook by ID
     *
     * @param id - Webhook ID
     * @returns Webhook details
     *
     * @example
     * ```typescript
     * const { data: webhook } = await client.webhooks.get("wh_123");
     * console.log(`Webhook: ${webhook.name}`);
     * console.log(`URL: ${webhook.url}`);
     * ```
     */
    async get(id: string): Promise<ApiResponse<Webhook>> {
        return this.http.get<Webhook>(`/api/v1/webhooks/${id}`);
    }

    /**
     * Create a new webhook
     *
     * @param options - Webhook configuration
     * @returns Created webhook
     *
     * @example
     * ```typescript
     * const { data: webhook } = await client.webhooks.create({
     *     name: "My Webhook",
     *     url: "https://my-app.com/webhook",
     *     events: ["execution.completed", "execution.failed"],
     *     headers: {
     *         "X-Custom-Header": "my-value"
     *     }
     * });
     * console.log(`Created webhook: ${webhook.id}`);
     * ```
     */
    async create(options: CreateWebhookOptions): Promise<ApiResponse<Webhook>> {
        return this.http.post<Webhook>("/api/v1/webhooks", {
            name: options.name,
            url: options.url,
            events: options.events,
            headers: options.headers
        });
    }

    /**
     * Delete a webhook
     *
     * @param id - Webhook ID
     *
     * @example
     * ```typescript
     * await client.webhooks.delete("wh_123");
     * console.log("Webhook deleted");
     * ```
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return this.http.delete<void>(`/api/v1/webhooks/${id}`);
    }

    /**
     * Test a webhook by sending a test event
     *
     * @param id - Webhook ID
     * @returns Test result
     *
     * @example
     * ```typescript
     * const { data: result } = await client.webhooks.test("wh_123");
     * if (result.success) {
     *     console.log(`Webhook responded in ${result.response_time_ms}ms`);
     * } else {
     *     console.error(`Webhook test failed: ${result.error}`);
     * }
     * ```
     */
    async test(id: string): Promise<ApiResponse<TestWebhookResponse>> {
        return this.http.post<TestWebhookResponse>(`/api/v1/webhooks/${id}/test`);
    }
}
