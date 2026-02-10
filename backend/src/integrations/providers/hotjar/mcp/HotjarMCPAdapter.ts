import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { HotjarClient } from "../client/HotjarClient";
import { executeGetSurveyResponses } from "../operations/getSurveyResponses";
import { executeListSurveys } from "../operations/listSurveys";
import { executeUserLookup } from "../operations/userLookup";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Hotjar MCP Adapter - wraps operations as MCP tools
 */
export class HotjarMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `hotjar_${op.id}`,
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
        client: HotjarClient
    ): Promise<unknown> {
        // Remove "hotjar_" prefix to get operation ID
        const operationId = toolName.replace(/^hotjar_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listSurveys":
                return await executeListSurveys(client, params as never);
            case "getSurveyResponses":
                return await executeGetSurveyResponses(client, params as never);
            case "userLookup":
                return await executeUserLookup(client, params as never);
            default:
                throw new Error(`Unknown Hotjar operation: ${operationId}`);
        }
    }
}
