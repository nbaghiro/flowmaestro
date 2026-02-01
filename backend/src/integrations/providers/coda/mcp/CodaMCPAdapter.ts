import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { CodaClient } from "../client/CodaClient";
import { executeAddRow } from "../operations/addRow";
import { executeGetTables } from "../operations/getTables";
import { executeListDocs } from "../operations/listDocs";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Coda MCP Adapter - wraps operations as MCP tools
 */
export class CodaMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `coda_${op.id}`,
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
        client: CodaClient
    ): Promise<unknown> {
        // Remove "coda_" prefix to get operation ID
        const operationId = toolName.replace(/^coda_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listDocs":
                return await executeListDocs(client, params as never);
            case "getTables":
                return await executeGetTables(client, params as never);
            case "addRow":
                return await executeAddRow(client, params as never);
            default:
                throw new Error(`Unknown Coda operation: ${operationId}`);
        }
    }
}
