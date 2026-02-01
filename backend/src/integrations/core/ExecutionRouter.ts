import { getLogger } from "../../core/logging";
import { toJSONSchema } from "../../core/utils/zod-to-json-schema";
import { getSandboxConfig, type SandboxConfig } from "../sandbox/SandboxConfig";
import { sandboxDataService } from "../sandbox/SandboxDataService";
import { ProviderRegistry } from "./ProviderRegistry";
import {
    inferActionType,
    type IProvider,
    type OperationResult,
    type MCPTool,
    type ExecutionContext,
    type OperationSummary
} from "./types";
import type { ConnectionWithData } from "../../storage/models/Connection";

const logger = getLogger();

/**
 * Extended connection metadata that includes test connection flag
 */
interface ConnectionMetadataWithTestFlag {
    isTestConnection?: boolean;
    [key: string]: unknown;
}

/**
 * Execution Router - intelligently routes requests to direct API or MCP
 *
 * Handles routing to sandbox for test connections automatically.
 */
export class ExecutionRouter {
    private sandboxConfig: SandboxConfig;

    constructor(private providerRegistry: ProviderRegistry) {
        this.sandboxConfig = getSandboxConfig();
    }

    /**
     * Execute operation (direct API or MCP based on context)
     *
     * Automatically routes to sandbox for test connections.
     */
    async execute(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        // Check if sandbox mode applies to this operation
        if (this.shouldUseSandbox(providerName, operationId, connection)) {
            return this.executeSandbox(providerName, operationId, params, connection, context);
        }

        // Normal execution path
        return this.executeReal(providerName, operationId, params, connection, context);
    }

    /**
     * Execute operation for real (not sandboxed)
     */
    private async executeReal(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        // Load provider
        const provider = await this.providerRegistry.loadProvider(providerName);

        // Decide routing strategy
        const shouldUseMCP = this.shouldUseMCP(provider, connection, context);

        if (shouldUseMCP) {
            return await this.executeMCP(provider, operationId, params, connection);
        } else {
            return await this.executeDirect(provider, operationId, params, connection, context);
        }
    }

    /**
     * Execute operation in sandbox mode
     */
    private async executeSandbox(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        logger.debug(
            {
                component: "ExecutionRouter",
                provider: providerName,
                operation: operationId,
                connectionId: connection.id
            },
            "Sandbox mode enabled for operation"
        );

        const sandboxResponse = await sandboxDataService.getSandboxResponse(
            providerName,
            operationId,
            params
        );

        if (sandboxResponse) {
            logger.debug(
                {
                    component: "ExecutionRouter",
                    provider: providerName,
                    operation: operationId,
                    success: sandboxResponse.success
                },
                "Returning sandbox response"
            );
            return sandboxResponse;
        }

        // Handle fallback behavior when no sandbox data exists
        return this.handleSandboxFallback(providerName, operationId, params, connection, context);
    }

    /**
     * Determine if sandbox mode should be used for this operation
     */
    private shouldUseSandbox(
        providerName: string,
        operationId: string,
        connection: ConnectionWithData
    ): boolean {
        // Check if connection is marked as test connection
        const metadata = connection.metadata as ConnectionMetadataWithTestFlag | undefined;
        if (metadata?.isTestConnection) {
            return true;
        }

        // Check operation-level override
        const operationKey = `${providerName}:${operationId}`;
        const opOverride = this.sandboxConfig.operationOverrides[operationKey];
        if (opOverride !== undefined) {
            return opOverride.enabled;
        }

        // Check provider-level override
        const providerOverride = this.sandboxConfig.providerOverrides[providerName];
        if (providerOverride !== undefined) {
            return providerOverride.enabled;
        }

        // Fall back to global setting
        return this.sandboxConfig.enabled;
    }

    /**
     * Handle fallback when no sandbox data exists
     */
    private async handleSandboxFallback(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        const fallbackBehavior = this.getSandboxFallbackBehavior(providerName, operationId);

        logger.debug(
            {
                component: "ExecutionRouter",
                provider: providerName,
                operation: operationId,
                fallbackBehavior
            },
            "No sandbox data found, using fallback behavior"
        );

        switch (fallbackBehavior) {
            case "passthrough":
                // Allow real API call
                return this.executeReal(providerName, operationId, params, connection, context);

            case "empty":
                // Return empty success response
                return {
                    success: true,
                    data: {}
                };

            case "error":
            default:
                // Return error indicating no sandbox data
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `No sandbox data found for ${providerName}:${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get fallback behavior for an operation in sandbox mode
     */
    private getSandboxFallbackBehavior(
        providerName: string,
        operationId: string
    ): SandboxConfig["fallbackBehavior"] {
        const operationKey = `${providerName}:${operationId}`;

        // Check operation-specific fallback
        if (this.sandboxConfig.operationOverrides[operationKey]?.fallbackBehavior) {
            return this.sandboxConfig.operationOverrides[operationKey].fallbackBehavior!;
        }

        // Check provider-specific fallback
        if (this.sandboxConfig.providerOverrides[providerName]?.fallbackBehavior) {
            return this.sandboxConfig.providerOverrides[providerName].fallbackBehavior!;
        }

        // Use global fallback
        return this.sandboxConfig.fallbackBehavior;
    }

    /**
     * Check if sandbox data exists for an operation
     */
    hasSandboxData(provider: string, operation: string): boolean {
        return sandboxDataService.hasSandboxData(provider, operation);
    }

    /**
     * Execute via direct API (high performance for workflows)
     */
    private async executeDirect(
        provider: IProvider,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        return await provider.executeOperation(operationId, params, connection, context);
    }

    /**
     * Execute via MCP (for agents using provider's MCP adapter)
     */
    private async executeMCP(
        provider: IProvider,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<OperationResult> {
        // Use provider's MCP adapter (in-process)
        const toolName = `${provider.name}_${operationId}`;
        const result = await provider.executeMCPTool(toolName, params, connection);

        return {
            success: true,
            data: result
        };
    }

    /**
     * Decide whether to use MCP or direct API
     */
    private shouldUseMCP(
        provider: IProvider,
        _connection: ConnectionWithData,
        context: ExecutionContext
    ): boolean {
        // Use MCP if context is agent-based
        if (context.mode === "agent") {
            return true;
        }

        // Use MCP if provider prefers it
        if (provider.capabilities.prefersMCP) {
            return true;
        }

        // Otherwise use direct API for performance
        return false;
    }

    /**
     * Get MCP tools for a provider
     */
    async getMCPTools(providerName: string): Promise<MCPTool[]> {
        const provider = await this.providerRegistry.loadProvider(providerName);
        return provider.getMCPTools();
    }

    /**
     * Execute MCP tool directly
     */
    async executeMCPTool(
        providerName: string,
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const provider = await this.providerRegistry.loadProvider(providerName);
        return await provider.executeMCPTool(toolName, params, connection);
    }

    /**
     * Discover operations for a provider
     */
    async discoverOperations(providerName: string): Promise<OperationSummary[]> {
        try {
            const provider = await this.providerRegistry.loadProvider(providerName);
            const operations = provider.getOperations();

            return operations.map((op) => {
                // Derive JSON Schema from Zod schema on-demand
                const inputSchemaJSON = toJSONSchema(op.inputSchema);
                const parameters = this.extractParametersFromSchema(inputSchemaJSON);

                return {
                    id: op.id,
                    name: op.name,
                    description: op.description,
                    category: op.category,
                    actionType: op.actionType ?? inferActionType(op.id),
                    inputSchema: inputSchemaJSON,
                    parameters,
                    retryable: op.retryable
                };
            });
        } catch (error) {
            logger.error(
                { component: "ExecutionRouter", providerName, err: error },
                "Error discovering operations for provider"
            );
            throw error;
        }
    }

    /**
     * Extract parameters from JSON Schema for frontend compatibility
     */
    private extractParametersFromSchema(schema: unknown): Array<{
        name: string;
        type: string;
        description?: string;
        required: boolean;
        default?: unknown;
    }> {
        const jsonSchema = schema as {
            type?: string;
            properties?: Record<
                string,
                {
                    type?: string;
                    description?: string;
                    default?: unknown;
                }
            >;
            required?: string[];
        };

        if (!jsonSchema.properties) {
            return [];
        }

        const required = jsonSchema.required || [];

        return Object.entries(jsonSchema.properties).map(([name, prop]) => ({
            name,
            type: prop.type || "string",
            description: prop.description,
            required: required.includes(name),
            default: prop.default
        }));
    }
}
