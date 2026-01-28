import {
    // Customer Operations
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    // Invoice Operations
    executeListInvoices,
    executeGetInvoice,
    executeCreateInvoice,
    // Company Operations
    executeGetCompanyInfo
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

/**
 * QuickBooks MCP Adapter
 *
 * Converts QuickBooks operations into MCP tools for AI agents
 */
export class QuickBooksMCPAdapter {
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
                name: `quickbooks_${id}`,
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
        client: QuickBooksClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("quickbooks_", "");

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
            // Customer Operations
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(client, params as never);
            case "getInvoice":
                return executeGetInvoice(client, params as never);
            case "createInvoice":
                return executeCreateInvoice(client, params as never);

            // Company Operations
            case "getCompanyInfo":
                return executeGetCompanyInfo(client, params as never);

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
