import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ADPClient } from "../client/ADPClient";
import { executeCreateTimeOffRequest } from "../operations/createTimeOffRequest";
import { executeGetCompanyInfo } from "../operations/getCompanyInfo";
import { executeGetTimeOffBalances } from "../operations/getTimeOffBalances";
import { executeGetWorker } from "../operations/getWorker";
import { executeListDepartments } from "../operations/listDepartments";
import { executeListPayStatements } from "../operations/listPayStatements";
import { executeListTimeOffRequests } from "../operations/listTimeOffRequests";
import { executeListWorkers } from "../operations/listWorkers";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * ADP MCP Adapter - wraps operations as MCP tools
 */
export class ADPMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `adp_${op.id}`,
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
        client: ADPClient
    ): Promise<unknown> {
        // Remove "adp_" prefix to get operation ID
        const operationId = toolName.replace(/^adp_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listWorkers":
                return await executeListWorkers(client, params as never);
            case "getWorker":
                return await executeGetWorker(client, params as never);
            case "listDepartments":
                return await executeListDepartments(client, params as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, params as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, params as never);
            case "getTimeOffBalances":
                return await executeGetTimeOffBalances(client, params as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, params as never);
            case "listPayStatements":
                return await executeListPayStatements(client, params as never);
            default:
                throw new Error(`Unknown ADP operation: ${operationId}`);
        }
    }
}
