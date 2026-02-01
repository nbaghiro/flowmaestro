import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { RipplingClient } from "../client/RipplingClient";
import { executeGetCompany } from "../operations/getCompany";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeGetLeaveBalances } from "../operations/getLeaveBalances";
import { executeListAllEmployees } from "../operations/listAllEmployees";
import { executeListDepartments } from "../operations/listDepartments";
import { executeListEmployees } from "../operations/listEmployees";
import { executeListLeaveRequests } from "../operations/listLeaveRequests";
import { executeListTeams } from "../operations/listTeams";
import { executeListWorkLocations } from "../operations/listWorkLocations";
import { executeProcessLeaveRequest } from "../operations/processLeaveRequest";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Rippling MCP Adapter - wraps operations as MCP tools
 */
export class RipplingMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `rippling_${op.id}`,
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
        client: RipplingClient
    ): Promise<unknown> {
        // Remove "rippling_" prefix to get operation ID
        const operationId = toolName.replace(/^rippling_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "listAllEmployees":
                return await executeListAllEmployees(client, params as never);
            case "listDepartments":
                return await executeListDepartments(client, params as never);
            case "listTeams":
                return await executeListTeams(client, params as never);
            case "listWorkLocations":
                return await executeListWorkLocations(client, params as never);
            case "getCompany":
                return await executeGetCompany(client, params as never);
            case "listLeaveRequests":
                return await executeListLeaveRequests(client, params as never);
            case "getLeaveBalances":
                return await executeGetLeaveBalances(client, params as never);
            case "processLeaveRequest":
                return await executeProcessLeaveRequest(client, params as never);
            default:
                throw new Error(`Unknown Rippling operation: ${operationId}`);
        }
    }
}
