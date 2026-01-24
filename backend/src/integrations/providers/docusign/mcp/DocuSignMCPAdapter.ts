import { DocuSignClient } from "../client/DocuSignClient";
import {
    executeCreateEnvelope,
    executeGetEnvelope,
    executeListEnvelopes,
    executeVoidEnvelope,
    executeDownloadDocuments,
    executeListTemplates,
    executeCreateFromTemplate,
    executeGetRecipients
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * DocuSign MCP Adapter - wraps operations as MCP tools
 */
export class DocuSignMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `docusign_${op.id}`,
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
        client: DocuSignClient
    ): Promise<unknown> {
        // Remove "docusign_" prefix to get operation ID
        const operationId = toolName.replace(/^docusign_/, "");

        // Route to operation executor
        switch (operationId) {
            case "createEnvelope":
                return await executeCreateEnvelope(client, params as never);
            case "getEnvelope":
                return await executeGetEnvelope(client, params as never);
            case "listEnvelopes":
                return await executeListEnvelopes(client, params as never);
            case "voidEnvelope":
                return await executeVoidEnvelope(client, params as never);
            case "downloadDocuments":
                return await executeDownloadDocuments(client, params as never);
            case "listTemplates":
                return await executeListTemplates(client, params as never);
            case "createFromTemplate":
                return await executeCreateFromTemplate(client, params as never);
            case "getRecipients":
                return await executeGetRecipients(client, params as never);
            default:
                throw new Error(`Unknown DocuSign operation: ${operationId}`);
        }
    }
}
