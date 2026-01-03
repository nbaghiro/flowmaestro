import { getLogger } from "../../core/logging";
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
 * Execution Router - intelligently routes requests to direct API or MCP
 */
export class ExecutionRouter {
    constructor(private providerRegistry: ProviderRegistry) {}

    /**
     * Execute operation (direct API or MCP based on context)
     */
    async execute(
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
                if (!op.inputSchemaJSON) {
                    logger.error(
                        { component: "ExecutionRouter", operationId: op.id },
                        "Operation is missing inputSchemaJSON"
                    );
                    throw new Error(`Operation ${op.id} is missing inputSchemaJSON`);
                }

                const parameters = this.extractParametersFromSchema(op.inputSchemaJSON);

                return {
                    id: op.id,
                    name: op.name,
                    description: op.description,
                    category: op.category,
                    actionType: op.actionType ?? inferActionType(op.id),
                    inputSchema: op.inputSchemaJSON,
                    inputSchemaJSON: op.inputSchemaJSON,
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
