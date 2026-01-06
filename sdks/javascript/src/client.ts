/**
 * FlowMaestro Client
 *
 * The main entry point for the FlowMaestro SDK.
 */

import { HttpClient } from "./http/base-client";
import { Agents } from "./resources/agents";
import { Executions } from "./resources/executions";
import { KnowledgeBases } from "./resources/knowledge-bases";
import { Threads } from "./resources/threads";
import { Triggers } from "./resources/triggers";
import { Webhooks } from "./resources/webhooks";
import { Workflows } from "./resources/workflows";
import type { FlowMaestroClientOptions } from "./types";

/**
 * FlowMaestro API Client
 *
 * @example
 * ```typescript
 * import { FlowMaestroClient } from "@flowmaestro/sdk";
 *
 * const client = new FlowMaestroClient({
 *     apiKey: "fm_live_..."
 * });
 *
 * // Execute a workflow
 * const { data } = await client.workflows.execute("wf_123", {
 *     inputs: { name: "John" }
 * });
 *
 * // Wait for completion
 * const result = await client.executions.waitForCompletion(data.execution_id);
 * console.log("Result:", result.outputs);
 * ```
 */
export class FlowMaestroClient {
    private readonly http: HttpClient;

    /**
     * Workflows resource for listing, getting, and executing workflows
     */
    public readonly workflows: Workflows;

    /**
     * Executions resource for tracking and managing workflow executions
     */
    public readonly executions: Executions;

    /**
     * Agents resource for listing and interacting with AI agents
     */
    public readonly agents: Agents;

    /**
     * Threads resource for managing conversation threads
     */
    public readonly threads: Threads;

    /**
     * Triggers resource for listing and executing workflow triggers
     */
    public readonly triggers: Triggers;

    /**
     * Knowledge Bases resource for semantic search
     */
    public readonly knowledgeBases: KnowledgeBases;

    /**
     * Webhooks resource for managing outgoing webhooks
     */
    public readonly webhooks: Webhooks;

    /**
     * Create a new FlowMaestro client
     *
     * @param options - Client configuration options
     *
     * @example
     * ```typescript
     * // Basic usage
     * const client = new FlowMaestroClient({
     *     apiKey: process.env.FLOWMAESTRO_API_KEY!
     * });
     *
     * // With custom options
     * const client = new FlowMaestroClient({
     *     apiKey: "fm_live_...",
     *     baseUrl: "https://api.flowmaestro.io",
     *     timeout: 60000,
     *     maxRetries: 5
     * });
     * ```
     */
    constructor(options: FlowMaestroClientOptions) {
        if (!options.apiKey) {
            throw new Error("API key is required");
        }

        this.http = new HttpClient(options);

        // Initialize resources
        this.workflows = new Workflows(this.http);
        this.executions = new Executions(this.http);
        this.agents = new Agents(this.http);
        this.threads = new Threads(this.http);
        this.triggers = new Triggers(this.http);
        this.knowledgeBases = new KnowledgeBases(this.http);
        this.webhooks = new Webhooks(this.http);
    }
}
