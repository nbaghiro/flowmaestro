/**
 * CircleCI Integration Provider
 *
 * Continuous integration platform for managing pipelines, workflows, and jobs.
 * Uses Circle-Token header authentication.
 *
 * Rate limit: 300 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { CircleCIClient } from "./client/CircleCIClient";
import { CircleCIMCPAdapter } from "./mcp/CircleCIMCPAdapter";
import {
    // Pipeline Operations
    listPipelinesOperation,
    executeListPipelines,
    getPipelineOperation,
    executeGetPipeline,
    triggerPipelineOperation,
    executeTriggerPipeline,
    // Workflow Operations
    listWorkflowsOperation,
    executeListWorkflows,
    getWorkflowOperation,
    executeGetWorkflow,
    cancelWorkflowOperation,
    executeCancelWorkflow,
    rerunWorkflowOperation,
    executeRerunWorkflow,
    // Job Operations
    listJobsOperation,
    executeListJobs,
    getJobArtifactsOperation,
    executeGetJobArtifacts
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class CircleCIProvider extends BaseProvider {
    readonly name = "circleci";
    readonly displayName = "CircleCI";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300,
            burstSize: 50
        }
    };

    private clientPool: Map<string, CircleCIClient> = new Map();
    private mcpAdapter: CircleCIMCPAdapter;

    constructor() {
        super();

        // Register Pipeline Operations (3 operations)
        this.registerOperation(listPipelinesOperation);
        this.registerOperation(getPipelineOperation);
        this.registerOperation(triggerPipelineOperation);

        // Register Workflow Operations (4 operations)
        this.registerOperation(listWorkflowsOperation);
        this.registerOperation(getWorkflowOperation);
        this.registerOperation(cancelWorkflowOperation);
        this.registerOperation(rerunWorkflowOperation);

        // Register Job Operations (2 operations)
        this.registerOperation(listJobsOperation);
        this.registerOperation(getJobArtifactsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CircleCIMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Circle-Token",
            headerTemplate: "{{api_key}}"
        };
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Pipeline Operations
            case "listPipelines":
                return executeListPipelines(client, params as never);
            case "getPipeline":
                return executeGetPipeline(client, params as never);
            case "triggerPipeline":
                return executeTriggerPipeline(client, params as never);

            // Workflow Operations
            case "listWorkflows":
                return executeListWorkflows(client, params as never);
            case "getWorkflow":
                return executeGetWorkflow(client, params as never);
            case "cancelWorkflow":
                return executeCancelWorkflow(client, params as never);
            case "rerunWorkflow":
                return executeRerunWorkflow(client, params as never);

            // Job Operations
            case "listJobs":
                return executeListJobs(client, params as never);
            case "getJobArtifacts":
                return executeGetJobArtifacts(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     *
     * For CircleCI:
     * - api_key field = API Token (Personal or Project)
     */
    private getOrCreateClient(connection: ConnectionWithData): CircleCIClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get credentials from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("CircleCI API Token is required");
        }

        const client = new CircleCIClient({
            apiToken: data.api_key
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
