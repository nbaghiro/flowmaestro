/**
 * Datadog Integration Provider
 *
 * Monitoring and analytics platform for cloud-scale applications.
 * Uses dual-key API authentication: DD-API-KEY and DD-APPLICATION-KEY headers.
 *
 * Rate limit: 600 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { DatadogClient } from "./client/DatadogClient";
import { DatadogMCPAdapter } from "./mcp/DatadogMCPAdapter";
import {
    // Metrics Operations
    queryMetricsOperation,
    executeQueryMetrics,
    submitMetricsOperation,
    executeSubmitMetrics,
    // Monitor Operations
    listMonitorsOperation,
    executeListMonitors,
    getMonitorOperation,
    executeGetMonitor,
    createMonitorOperation,
    executeCreateMonitor,
    muteMonitorOperation,
    executeMuteMonitor,
    // Event Operations
    listEventsOperation,
    executeListEvents,
    createEventOperation,
    executeCreateEvent,
    // Incident Operations
    listIncidentsOperation,
    executeListIncidents,
    createIncidentOperation,
    executeCreateIncident
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

interface DatadogConnectionData extends ApiKeyData {
    site?: string; // Datadog site (e.g., "datadoghq.com", "datadoghq.eu")
}

export class DatadogProvider extends BaseProvider {
    readonly name = "datadog";
    readonly displayName = "Datadog";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private clientPool: Map<string, DatadogClient> = new Map();
    private mcpAdapter: DatadogMCPAdapter;

    constructor() {
        super();

        // Register Metrics Operations (2 operations)
        this.registerOperation(queryMetricsOperation);
        this.registerOperation(submitMetricsOperation);

        // Register Monitor Operations (4 operations)
        this.registerOperation(listMonitorsOperation);
        this.registerOperation(getMonitorOperation);
        this.registerOperation(createMonitorOperation);
        this.registerOperation(muteMonitorOperation);

        // Register Event Operations (2 operations)
        this.registerOperation(listEventsOperation);
        this.registerOperation(createEventOperation);

        // Register Incident Operations (2 operations)
        this.registerOperation(listIncidentsOperation);
        this.registerOperation(createIncidentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new DatadogMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Datadog uses custom headers, not Bearer token.
     * The DatadogClient handles the actual authentication.
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "DD-API-KEY",
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
            // Metrics Operations
            case "queryMetrics":
                return executeQueryMetrics(client, params as never);
            case "submitMetrics":
                return executeSubmitMetrics(client, params as never);

            // Monitor Operations
            case "listMonitors":
                return executeListMonitors(client, params as never);
            case "getMonitor":
                return executeGetMonitor(client, params as never);
            case "createMonitor":
                return executeCreateMonitor(client, params as never);
            case "muteMonitor":
                return executeMuteMonitor(client, params as never);

            // Event Operations
            case "listEvents":
                return executeListEvents(client, params as never);
            case "createEvent":
                return executeCreateEvent(client, params as never);

            // Incident Operations
            case "listIncidents":
                return executeListIncidents(client, params as never);
            case "createIncident":
                return executeCreateIncident(client, params as never);

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
     * For Datadog:
     * - api_key field = DD-API-KEY
     * - api_secret field = DD-APPLICATION-KEY
     * - site field (from metadata) = Datadog site region
     */
    private getOrCreateClient(connection: ConnectionWithData): DatadogClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get credentials from connection data
        const data = connection.data as DatadogConnectionData;

        if (!data.api_key) {
            throw new Error("Datadog API Key is required");
        }

        if (!data.api_secret) {
            throw new Error("Datadog Application Key is required");
        }

        // Get site from connection metadata or default to US1
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const site = metadata?.site as string | undefined;

        const client = new DatadogClient({
            apiKey: data.api_key,
            applicationKey: data.api_secret,
            site: site || "datadoghq.com"
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
