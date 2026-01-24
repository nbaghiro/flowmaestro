import { HelloSignClient } from "../client/HelloSignClient";
import {
    executeCreateSignatureRequest,
    executeGetSignatureRequest,
    executeListSignatureRequests,
    executeCancelSignatureRequest,
    executeDownloadDocument,
    executeListTemplates,
    executeCreateFromTemplate
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * HelloSign MCP Adapter - wraps operations as MCP tools
 */
export class HelloSignMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `hellosign_${op.id}`,
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
        client: HelloSignClient
    ): Promise<unknown> {
        // Remove "hellosign_" prefix to get operation ID
        const operationId = toolName.replace(/^hellosign_/, "");

        // Route to operation executor
        switch (operationId) {
            case "createSignatureRequest":
                return await executeCreateSignatureRequest(client, params as never);
            case "getSignatureRequest":
                return await executeGetSignatureRequest(client, params as never);
            case "listSignatureRequests":
                return await executeListSignatureRequests(client, params as never);
            case "cancelSignatureRequest":
                return await executeCancelSignatureRequest(client, params as never);
            case "downloadDocument":
                return await executeDownloadDocument(client, params as never);
            case "listTemplates":
                return await executeListTemplates(client, params as never);
            case "createFromTemplate":
                return await executeCreateFromTemplate(client, params as never);
            default:
                throw new Error(`Unknown HelloSign operation: ${operationId}`);
        }
    }
}
