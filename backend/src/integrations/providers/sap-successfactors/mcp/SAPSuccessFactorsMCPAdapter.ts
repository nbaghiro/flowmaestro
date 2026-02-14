import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeGetTimeOffBalance } from "../operations/getTimeOffBalance";
import { executeListDepartments } from "../operations/listDepartments";
import { executeListEmployees } from "../operations/listEmployees";
import { executeListJobs } from "../operations/listJobs";
import { executeListTimeOffRequests } from "../operations/listTimeOffRequests";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * SAP SuccessFactors MCP Adapter - wraps operations as MCP tools
 */
export class SAPSuccessFactorsMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `sap_successfactors_${op.id}`,
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
        client: SAPSuccessFactorsClient
    ): Promise<unknown> {
        // Remove "sap_successfactors_" prefix to get operation ID
        const operationId = toolName.replace(/^sap_successfactors_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "listDepartments":
                return await executeListDepartments(client, params as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, params as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, params as never);
            case "listJobs":
                return await executeListJobs(client, params as never);
            default:
                throw new Error(`Unknown SAP SuccessFactors operation: ${operationId}`);
        }
    }
}
