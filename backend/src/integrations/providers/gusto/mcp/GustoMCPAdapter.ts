import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { GustoClient } from "../client/GustoClient";
import { executeGetCompany } from "../operations/getCompany";
import { executeGetEmployee } from "../operations/getEmployee";
import { executeListBenefits } from "../operations/listBenefits";
import { executeListDepartments } from "../operations/listDepartments";
import { executeListEmployees } from "../operations/listEmployees";
import { executeListLocations } from "../operations/listLocations";
import { executeListPayrolls } from "../operations/listPayrolls";
import { executeListTimeOffActivities } from "../operations/listTimeOffActivities";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Gusto MCP Adapter - wraps operations as MCP tools
 */
export class GustoMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `gusto_${op.id}`,
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
        client: GustoClient
    ): Promise<unknown> {
        // Remove "gusto_" prefix to get operation ID
        const operationId = toolName.replace(/^gusto_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listEmployees":
                return await executeListEmployees(client, params as never);
            case "getEmployee":
                return await executeGetEmployee(client, params as never);
            case "getCompany":
                return await executeGetCompany(client, params as never);
            case "listDepartments":
                return await executeListDepartments(client, params as never);
            case "listPayrolls":
                return await executeListPayrolls(client, params as never);
            case "listTimeOffActivities":
                return await executeListTimeOffActivities(client, params as never);
            case "listLocations":
                return await executeListLocations(client, params as never);
            case "listBenefits":
                return await executeListBenefits(client, params as never);
            default:
                throw new Error(`Unknown Gusto operation: ${operationId}`);
        }
    }
}
