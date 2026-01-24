import { LookerClient } from "../client/LookerClient";
import { executeCreateQuery } from "../operations/createQuery";
import { executeGetDashboard } from "../operations/getDashboard";
import { executeGetLook } from "../operations/getLook";
import { executeListDashboards } from "../operations/listDashboards";
import { executeListExplores } from "../operations/listExplores";
import { executeListFolders } from "../operations/listFolders";
import { executeListLooks } from "../operations/listLooks";
import { executeRunExplore } from "../operations/runExplore";
import { executeRunLook } from "../operations/runLook";
import { executeRunQuery } from "../operations/runQuery";
import { executeSearchContent } from "../operations/searchContent";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Looker MCP Adapter - wraps operations as MCP tools
 */
export class LookerMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `looker_${op.id}`,
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
        client: LookerClient
    ): Promise<unknown> {
        // Remove "looker_" prefix to get operation ID
        const operationId = toolName.replace(/^looker_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listDashboards":
                return await executeListDashboards(client, params as never);
            case "getDashboard":
                return await executeGetDashboard(client, params as never);
            case "listLooks":
                return await executeListLooks(client, params as never);
            case "getLook":
                return await executeGetLook(client, params as never);
            case "runLook":
                return await executeRunLook(client, params as never);
            case "runQuery":
                return await executeRunQuery(client, params as never);
            case "createQuery":
                return await executeCreateQuery(client, params as never);
            case "listExplores":
                return await executeListExplores(client, params as never);
            case "runExplore":
                return await executeRunExplore(client, params as never);
            case "listFolders":
                return await executeListFolders(client, params as never);
            case "searchContent":
                return await executeSearchContent(client, params as never);
            default:
                throw new Error(`Unknown Looker operation: ${operationId}`);
        }
    }
}
