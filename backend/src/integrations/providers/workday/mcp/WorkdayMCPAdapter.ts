import { WorkdayClient } from "../client/WorkdayClient";
import { executeGetCompanyInfo } from "../operations/getCompanyInfo";
import { executeGetEligibleAbsenceTypes } from "../operations/getEligibleAbsenceTypes";
import { executeGetWorker } from "../operations/getWorker";
import { executeListAbsenceBalances } from "../operations/listAbsenceBalances";
import { executeListPayGroups } from "../operations/listPayGroups";
import { executeListWorkers } from "../operations/listWorkers";
import { executeRequestTimeOff } from "../operations/requestTimeOff";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Workday MCP Adapter - wraps operations as MCP tools
 */
export class WorkdayMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `workday_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: WorkdayClient
    ): Promise<unknown> {
        // Remove "workday_" prefix to get operation ID
        const operationId = toolName.replace(/^workday_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listWorkers":
                return await executeListWorkers(client, params as never);
            case "getWorker":
                return await executeGetWorker(client, params as never);
            case "listAbsenceBalances":
                return await executeListAbsenceBalances(client, params as never);
            case "requestTimeOff":
                return await executeRequestTimeOff(client, params as never);
            case "getEligibleAbsenceTypes":
                return await executeGetEligibleAbsenceTypes(client, params as never);
            case "listPayGroups":
                return await executeListPayGroups(client, params as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, params as never);
            default:
                throw new Error(`Unknown Workday operation: ${operationId}`);
        }
    }
}
