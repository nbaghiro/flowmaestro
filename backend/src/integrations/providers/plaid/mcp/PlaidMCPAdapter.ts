import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Account Operations
    executeGetAccounts,
    executeGetBalances,
    // Transaction Operations
    executeGetTransactions,
    // Institution Operations
    executeGetInstitution,
    // Identity Operations
    executeGetIdentity,
    // Link Operations
    executeCreateLinkToken
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

/**
 * Plaid MCP Adapter
 *
 * Converts Plaid operations into MCP tools for AI agents
 */
export class PlaidMCPAdapter {
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
                name: `plaid_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
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
        client: PlaidClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("plaid_", "");

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
            // Account Operations
            case "getAccounts":
                return executeGetAccounts(client, params as never);
            case "getBalances":
                return executeGetBalances(client, params as never);

            // Transaction Operations
            case "getTransactions":
                return executeGetTransactions(client, params as never);

            // Institution Operations
            case "getInstitution":
                return executeGetInstitution(client, params as never);

            // Identity Operations
            case "getIdentity":
                return executeGetIdentity(client, params as never);

            // Link Operations
            case "createLinkToken":
                return executeCreateLinkToken(client, params as never);

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
