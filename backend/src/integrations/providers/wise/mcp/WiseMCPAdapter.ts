import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { WiseClient } from "../client/WiseClient";
// Profile operations
import { executeGetBalance } from "../operations/balances/getBalance";
import { executeListBalances } from "../operations/balances/listBalances";
import { executeGetProfile } from "../operations/profiles/getProfile";
import { executeListProfiles } from "../operations/profiles/listProfiles";
// Balance operations
// Quote operations
import { executeCreateQuote } from "../operations/quotes/createQuote";
// Recipient operations
import { executeCreateRecipient } from "../operations/recipients/createRecipient";
import { executeListRecipients } from "../operations/recipients/listRecipients";
// Transfer operations
import { executeCreateTransfer } from "../operations/transfers/createTransfer";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Wise MCP Adapter - wraps operations as MCP tools
 */
export class WiseMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `wise_${op.id}`,
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
        client: WiseClient
    ): Promise<unknown> {
        // Remove "wise_" prefix to get operation ID
        const operationId = toolName.replace(/^wise_/, "");

        // Route to operation executor
        switch (operationId) {
            // Profile operations
            case "listProfiles":
                return await executeListProfiles(client, params as never);
            case "getProfile":
                return await executeGetProfile(client, params as never);
            // Balance operations
            case "listBalances":
                return await executeListBalances(client, params as never);
            case "getBalance":
                return await executeGetBalance(client, params as never);
            // Quote operations
            case "createQuote":
                return await executeCreateQuote(client, params as never);
            // Recipient operations
            case "listRecipients":
                return await executeListRecipients(client, params as never);
            case "createRecipient":
                return await executeCreateRecipient(client, params as never);
            // Transfer operations
            case "createTransfer":
                return await executeCreateTransfer(client, params as never);
            default:
                throw new Error(`Unknown Wise operation: ${operationId}`);
        }
    }
}
