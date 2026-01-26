/**
 * PagerDuty Integration Provider
 *
 * Incident management and on-call scheduling platform with API Key authentication.
 * Supports incident management, service monitoring, escalation policies, on-call schedules, and users.
 *
 * Rate limit: 960 requests/minute per user
 */

import { BaseProvider } from "../../core/BaseProvider";
import { PagerDutyClient } from "./client/PagerDutyClient";
import { PagerDutyMCPAdapter } from "./mcp/PagerDutyMCPAdapter";
import {
    // Incident Operations
    listIncidentsOperation,
    executeListIncidents,
    getIncidentOperation,
    executeGetIncident,
    createIncidentOperation,
    executeCreateIncident,
    updateIncidentOperation,
    executeUpdateIncident,
    // Service Operations
    listServicesOperation,
    executeListServices,
    getServiceOperation,
    executeGetService,
    // Escalation Policy Operations
    listEscalationPoliciesOperation,
    executeListEscalationPolicies,
    // On-Call Operations
    listOnCallsOperation,
    executeListOnCalls,
    // User Operations
    listUsersOperation,
    executeListUsers,
    // Schedule Operations
    listSchedulesOperation,
    executeListSchedules
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class PagerDutyProvider extends BaseProvider {
    readonly name = "pagerduty";
    readonly displayName = "PagerDuty";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 960,
            burstSize: 100
        }
    };

    private clientPool: Map<string, PagerDutyClient> = new Map();
    private mcpAdapter: PagerDutyMCPAdapter;

    constructor() {
        super();

        // Register Incident Operations (4 operations)
        this.registerOperation(listIncidentsOperation);
        this.registerOperation(getIncidentOperation);
        this.registerOperation(createIncidentOperation);
        this.registerOperation(updateIncidentOperation);

        // Register Service Operations (2 operations)
        this.registerOperation(listServicesOperation);
        this.registerOperation(getServiceOperation);

        // Register Escalation Policy Operations (1 operation)
        this.registerOperation(listEscalationPoliciesOperation);

        // Register On-Call Operations (1 operation)
        this.registerOperation(listOnCallsOperation);

        // Register User Operations (1 operation)
        this.registerOperation(listUsersOperation);

        // Register Schedule Operations (1 operation)
        this.registerOperation(listSchedulesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PagerDutyMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * PagerDuty uses Token authentication: "Token token=YOUR_API_KEY"
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Token token={{api_key}}"
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
            // Incident Operations
            case "listIncidents":
                return executeListIncidents(client, params as never);
            case "getIncident":
                return executeGetIncident(client, params as never);
            case "createIncident":
                return executeCreateIncident(client, params as never);
            case "updateIncident":
                return executeUpdateIncident(client, params as never);

            // Service Operations
            case "listServices":
                return executeListServices(client, params as never);
            case "getService":
                return executeGetService(client, params as never);

            // Escalation Policy Operations
            case "listEscalationPolicies":
                return executeListEscalationPolicies(client, params as never);

            // On-Call Operations
            case "listOnCalls":
                return executeListOnCalls(client, params as never);

            // User Operations
            case "listUsers":
                return executeListUsers(client, params as never);

            // Schedule Operations
            case "listSchedules":
                return executeListSchedules(client, params as never);

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
     */
    private getOrCreateClient(connection: ConnectionWithData): PagerDutyClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("PagerDuty API key is required");
        }

        const client = new PagerDutyClient({
            apiKey: data.api_key,
            connectionId: connection.id
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
