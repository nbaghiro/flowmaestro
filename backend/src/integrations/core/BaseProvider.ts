import type {
    IProvider,
    OperationDefinition,
    OperationResult,
    MCPTool,
    AuthConfig,
    ProviderCapabilities,
    ExecutionContext
} from "./types";
import type { ConnectionWithData, ConnectionMethod } from "../../storage/models/Connection";
import type { z } from "zod";

/**
 * Abstract base class for all providers
 *
 * Providers should extend this class and implement the required methods.
 * The base class handles operation registration and provides common utilities.
 */
export abstract class BaseProvider implements IProvider {
    abstract readonly name: string;
    abstract readonly displayName: string;
    abstract readonly authMethod: ConnectionMethod;
    abstract readonly capabilities: ProviderCapabilities;

    protected operations: Map<string, OperationDefinition> = new Map();

    /**
     * Get authentication configuration
     */
    abstract getAuthConfig(): AuthConfig;

    /**
     * Refresh credentials (optional, for OAuth)
     */
    refreshCredentials?(connection: ConnectionWithData): Promise<unknown>;

    /**
     * Execute operation via direct API
     */
    abstract executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult>;

    /**
     * Get MCP tools
     */
    abstract getMCPTools(): MCPTool[];

    /**
     * Execute MCP tool
     */
    abstract executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown>;

    /**
     * Register an operation
     */
    protected registerOperation(operation: OperationDefinition): void {
        this.operations.set(operation.id, operation);
    }

    /**
     * Get all operations
     */
    getOperations(): OperationDefinition[] {
        return Array.from(this.operations.values());
    }

    /**
     * Get operation schema by ID
     */
    getOperationSchema(operationId: string): z.ZodSchema | null {
        const operation = this.operations.get(operationId);
        return operation ? operation.inputSchema : null;
    }

    /**
     * Get operation by ID
     */
    protected getOperation(operationId: string): OperationDefinition | null {
        return this.operations.get(operationId) || null;
    }

    /**
     * Validate operation parameters
     */
    protected validateParams<T = Record<string, unknown>>(
        operationId: string,
        params: Record<string, unknown>
    ): T {
        const operation = this.getOperation(operationId);
        if (!operation) {
            throw new Error(`Operation ${operationId} not found in provider ${this.name}`);
        }

        try {
            return operation.inputSchema.parse(params) as T;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid parameters for ${operationId}: ${error.message}`);
            }
            throw error;
        }
    }
}
