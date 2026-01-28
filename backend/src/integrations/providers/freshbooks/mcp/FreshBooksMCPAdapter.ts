import {
    // User Operations
    executeGetMe,
    // Client Operations
    executeListClients,
    executeCreateClient,
    // Invoice Operations
    executeListInvoices,
    executeGetInvoice,
    executeCreateInvoice,
    // Expense Operations
    executeListExpenses
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

/**
 * FreshBooks MCP Adapter
 *
 * Converts FreshBooks operations into MCP tools for AI agents
 */
export class FreshBooksMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `freshbooks_${id}`,
                description: operation.description,
                inputSchema: operation.inputSchemaJSON
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: FreshBooksHttpClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("freshbooks_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // User Operations
            case "getMe":
                return executeGetMe(client, params as never);

            // Client Operations
            case "listClients":
                return executeListClients(client, params as never);
            case "createClient":
                return executeCreateClient(client, params as never);

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(client, params as never);
            case "getInvoice":
                return executeGetInvoice(client, params as never);
            case "createInvoice":
                return executeCreateInvoice(client, params as never);

            // Expense Operations
            case "listExpenses":
                return executeListExpenses(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
