import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { DeelClient } from "../client/DeelClient";
import { executeCreateTimeOffRequest } from "../operations/createTimeOffRequest";
import { executeGetContract } from "../operations/getContract";
import { executeGetPerson } from "../operations/getPerson";
import { executeGetTimeOffBalance } from "../operations/getTimeOffBalance";
import { executeListContracts } from "../operations/listContracts";
import { executeListPeople } from "../operations/listPeople";
import { executeListTimeOffRequests } from "../operations/listTimeOffRequests";
import { executeListTimesheets } from "../operations/listTimesheets";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Deel MCP Adapter - wraps operations as MCP tools
 */
export class DeelMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `deel_${op.id}`,
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
        client: DeelClient
    ): Promise<unknown> {
        // Remove "deel_" prefix to get operation ID
        const operationId = toolName.replace(/^deel_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listPeople":
                return await executeListPeople(client, params as never);
            case "getPerson":
                return await executeGetPerson(client, params as never);
            case "listContracts":
                return await executeListContracts(client, params as never);
            case "getContract":
                return await executeGetContract(client, params as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, params as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, params as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, params as never);
            case "listTimesheets":
                return await executeListTimesheets(client, params as never);
            default:
                throw new Error(`Unknown Deel operation: ${operationId}`);
        }
    }
}
