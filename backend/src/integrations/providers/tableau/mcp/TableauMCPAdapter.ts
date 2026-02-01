import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { TableauClient } from "../client/TableauClient";
import { executeDownloadWorkbook } from "../operations/downloadWorkbook";
import { executeGetDataSource } from "../operations/getDataSource";
import { executeGetView } from "../operations/getView";
import { executeGetWorkbook } from "../operations/getWorkbook";
import { executeListDataSources } from "../operations/listDataSources";
import { executeListProjects } from "../operations/listProjects";
import { executeListSites } from "../operations/listSites";
import { executeListViews } from "../operations/listViews";
import { executeListWorkbooks } from "../operations/listWorkbooks";
import { executeQueryViewData } from "../operations/queryViewData";
import { executeQueryViewImage } from "../operations/queryViewImage";
import { executeRefreshDataSource } from "../operations/refreshDataSource";
import { executeSignIn } from "../operations/signIn";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Tableau MCP Adapter - wraps operations as MCP tools
 */
export class TableauMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `tableau_${op.id}`,
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
        client: TableauClient
    ): Promise<unknown> {
        // Remove "tableau_" prefix to get operation ID
        const operationId = toolName.replace(/^tableau_/, "");

        // Route to operation executor
        switch (operationId) {
            case "signIn":
                return await executeSignIn(client, params as never);
            case "listSites":
                return await executeListSites(client, params as never);
            case "listWorkbooks":
                return await executeListWorkbooks(client, params as never);
            case "getWorkbook":
                return await executeGetWorkbook(client, params as never);
            case "listViews":
                return await executeListViews(client, params as never);
            case "getView":
                return await executeGetView(client, params as never);
            case "queryViewData":
                return await executeQueryViewData(client, params as never);
            case "queryViewImage":
                return await executeQueryViewImage(client, params as never);
            case "listDataSources":
                return await executeListDataSources(client, params as never);
            case "getDataSource":
                return await executeGetDataSource(client, params as never);
            case "refreshDataSource":
                return await executeRefreshDataSource(client, params as never);
            case "listProjects":
                return await executeListProjects(client, params as never);
            case "downloadWorkbook":
                return await executeDownloadWorkbook(client, params as never);
            default:
                throw new Error(`Unknown Tableau operation: ${operationId}`);
        }
    }
}
