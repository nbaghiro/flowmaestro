import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { HiBobClient } from "../client/HiBobClient";
import { executeCreateTimeOffRequest } from "../operations/createTimeOffRequest";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeGetTimeOffBalance } from "../operations/getTimeOffBalance";
import { executeGetWhosOut } from "../operations/getWhosOut";
import { executeListEmployees } from "../operations/listEmployees";
import { executeListTimeOffPolicies } from "../operations/listTimeOffPolicies";
import { executeListTimeOffRequests } from "../operations/listTimeOffRequests";
import { executeSearchEmployees } from "../operations/searchEmployees";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * HiBob MCP Adapter - wraps operations as MCP tools
 */
export class HiBobMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `hibob_${op.id}`,
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
        client: HiBobClient
    ): Promise<unknown> {
        // Remove "hibob_" prefix to get operation ID
        const operationId = toolName.replace(/^hibob_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "searchEmployees":
                return await executeSearchEmployees(client, params as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, params as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, params as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, params as never);
            case "getWhosOut":
                return await executeGetWhosOut(client, params as never);
            case "listTimeOffPolicies":
                return await executeListTimeOffPolicies(client, params as never);
            default:
                throw new Error(`Unknown HiBob operation: ${operationId}`);
        }
    }
}
