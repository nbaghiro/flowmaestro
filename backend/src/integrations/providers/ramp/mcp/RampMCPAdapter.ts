import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { RampClient } from "../client/RampClient";
// Transaction operations
// Card operations
import { executeGetCard } from "../operations/cards/getCard";
import { executeListCards } from "../operations/cards/listCards";
// User operations
// Reimbursement operations
import { executeListReimbursements } from "../operations/reimbursements/listReimbursements";
// Statement operations
import { executeListStatements } from "../operations/statements/listStatements";
import { executeGetTransaction } from "../operations/transactions/getTransaction";
import { executeListTransactions } from "../operations/transactions/listTransactions";
import { executeListUsers } from "../operations/users/listUsers";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Ramp MCP Adapter - wraps operations as MCP tools
 */
export class RampMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `ramp_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: RampClient
    ): Promise<unknown> {
        // Remove "ramp_" prefix to get operation ID
        const operationId = toolName.replace(/^ramp_/, "");

        // Route to operation executor
        switch (operationId) {
            // Transaction operations
            case "listTransactions":
                return await executeListTransactions(client, params as never);
            case "getTransaction":
                return await executeGetTransaction(client, params as never);
            // Card operations
            case "listCards":
                return await executeListCards(client, params as never);
            case "getCard":
                return await executeGetCard(client, params as never);
            // User operations
            case "listUsers":
                return await executeListUsers(client, params as never);
            // Reimbursement operations
            case "listReimbursements":
                return await executeListReimbursements(client, params as never);
            // Statement operations
            case "listStatements":
                return await executeListStatements(client, params as never);
            default:
                throw new Error(`Unknown Ramp operation: ${operationId}`);
        }
    }
}
