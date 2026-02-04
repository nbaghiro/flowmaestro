import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { BambooHRClient } from "../client/BambooHRClient";
import { executeCreateTimeOffRequest } from "../operations/createTimeOffRequest";
import { executeGetCompanyInfo } from "../operations/getCompanyInfo";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeGetEmployeeDirectory } from "../operations/getEmployeeDirectory";
import { executeGetWhosOut } from "../operations/getWhosOut";
import { executeListEmployees } from "../operations/listEmployees";
import { executeListTimeOffPolicies } from "../operations/listTimeOffPolicies";
import { executeListTimeOffRequests } from "../operations/listTimeOffRequests";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * BambooHR MCP Adapter - wraps operations as MCP tools
 */
export class BambooHRMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `bamboohr_${op.id}`,
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
        client: BambooHRClient
    ): Promise<unknown> {
        // Remove "bamboohr_" prefix to get operation ID
        const operationId = toolName.replace(/^bamboohr_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "getEmployeeDirectory":
                return await executeGetEmployeeDirectory(client, params as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, params as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, params as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, params as never);
            case "getWhosOut":
                return await executeGetWhosOut(client, params as never);
            case "listTimeOffPolicies":
                return await executeListTimeOffPolicies(client, params as never);
            default:
                throw new Error(`Unknown BambooHR operation: ${operationId}`);
        }
    }
}
