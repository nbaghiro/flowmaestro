import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { AirtableClient } from "../client/AirtableClient";
import {
    executeListRecords,
    executeGetRecord,
    executeCreateRecord,
    executeUpdateRecord,
    executeDeleteRecord,
    executeBatchCreateRecords,
    executeBatchUpdateRecords,
    executeBatchDeleteRecords,
    executeListBases,
    executeGetBaseSchema,
    executeListTables,
    executeListComments,
    executeCreateComment,
    executeUpdateComment
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Airtable MCP Adapter
 *
 * Wraps Airtable operations as MCP tools for agent use
 */
export class AirtableMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `airtable_${op.id}`,
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
        client: AirtableClient
    ): Promise<unknown> {
        // Remove "airtable_" prefix to get operation ID
        const operationId = toolName.replace(/^airtable_/, "");

        // Route to operation executor
        switch (operationId) {
            // Core Data Operations
            case "listRecords":
                return await executeListRecords(client, params as never);
            case "getRecord":
                return await executeGetRecord(client, params as never);
            case "createRecord":
                return await executeCreateRecord(client, params as never);
            case "updateRecord":
                return await executeUpdateRecord(client, params as never);
            case "deleteRecord":
                return await executeDeleteRecord(client, params as never);
            case "batchCreateRecords":
                return await executeBatchCreateRecords(client, params as never);
            case "batchUpdateRecords":
                return await executeBatchUpdateRecords(client, params as never);
            case "batchDeleteRecords":
                return await executeBatchDeleteRecords(client, params as never);

            // Schema Discovery
            case "listBases":
                return await executeListBases(client, params as never);
            case "getBaseSchema":
                return await executeGetBaseSchema(client, params as never);
            case "listTables":
                return await executeListTables(client, params as never);

            // Comments
            case "listComments":
                return await executeListComments(client, params as never);
            case "createComment":
                return await executeCreateComment(client, params as never);
            case "updateComment":
                return await executeUpdateComment(client, params as never);

            default:
                throw new Error(`Unknown Airtable operation: ${operationId}`);
        }
    }
}
