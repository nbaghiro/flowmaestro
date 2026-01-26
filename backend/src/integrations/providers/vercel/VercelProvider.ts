/**
 * Vercel Integration Provider
 *
 * Frontend deployment platform for managing projects, deployments, domains, and environment variables.
 * Uses Bearer token authentication with Access Token.
 *
 * Rate limit: 100 requests/minute (per-endpoint limits vary)
 */

import { BaseProvider } from "../../core/BaseProvider";
import { VercelClient } from "./client/VercelClient";
import { VercelMCPAdapter } from "./mcp/VercelMCPAdapter";
import {
    // Project Operations
    listProjectsOperation,
    executeListProjects,
    getProjectOperation,
    executeGetProject,
    // Deployment Operations
    listDeploymentsOperation,
    executeListDeployments,
    getDeploymentOperation,
    executeGetDeployment,
    createDeploymentOperation,
    executeCreateDeployment,
    cancelDeploymentOperation,
    executeCancelDeployment,
    // Domain Operations
    listDomainsOperation,
    executeListDomains,
    addDomainOperation,
    executeAddDomain,
    // Environment Variable Operations
    getEnvironmentVariablesOperation,
    executeGetEnvironmentVariables,
    setEnvironmentVariableOperation,
    executeSetEnvironmentVariable
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

interface VercelConnectionData extends ApiKeyData {
    teamId?: string; // Optional team ID for team-scoped requests
}

export class VercelProvider extends BaseProvider {
    readonly name = "vercel";
    readonly displayName = "Vercel";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 20
        }
    };

    private clientPool: Map<string, VercelClient> = new Map();
    private mcpAdapter: VercelMCPAdapter;

    constructor() {
        super();

        // Register Project Operations (2 operations)
        this.registerOperation(listProjectsOperation);
        this.registerOperation(getProjectOperation);

        // Register Deployment Operations (4 operations)
        this.registerOperation(listDeploymentsOperation);
        this.registerOperation(getDeploymentOperation);
        this.registerOperation(createDeploymentOperation);
        this.registerOperation(cancelDeploymentOperation);

        // Register Domain Operations (2 operations)
        this.registerOperation(listDomainsOperation);
        this.registerOperation(addDomainOperation);

        // Register Environment Variable Operations (2 operations)
        this.registerOperation(getEnvironmentVariablesOperation);
        this.registerOperation(setEnvironmentVariableOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new VercelMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            // Project Operations
            case "listProjects":
                return executeListProjects(client, params as never);
            case "getProject":
                return executeGetProject(client, params as never);

            // Deployment Operations
            case "listDeployments":
                return executeListDeployments(client, params as never);
            case "getDeployment":
                return executeGetDeployment(client, params as never);
            case "createDeployment":
                return executeCreateDeployment(client, params as never);
            case "cancelDeployment":
                return executeCancelDeployment(client, params as never);

            // Domain Operations
            case "listDomains":
                return executeListDomains(client, params as never);
            case "addDomain":
                return executeAddDomain(client, params as never);

            // Environment Variable Operations
            case "getEnvironmentVariables":
                return executeGetEnvironmentVariables(client, params as never);
            case "setEnvironmentVariable":
                return executeSetEnvironmentVariable(client, params as never);

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
     * For Vercel:
     * - api_key field = Access Token
     * - teamId field (from metadata) = Team ID for team-scoped requests
     */
    private getOrCreateClient(connection: ConnectionWithData): VercelClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get credentials from connection data
        const data = connection.data as VercelConnectionData;

        if (!data.api_key) {
            throw new Error("Vercel Access Token is required");
        }

        // Get teamId from connection metadata
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const teamId = metadata?.teamId as string | undefined;

        const client = new VercelClient({
            accessToken: data.api_key,
            teamId: teamId
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
