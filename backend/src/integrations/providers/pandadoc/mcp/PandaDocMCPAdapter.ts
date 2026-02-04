import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { PandaDocClient } from "../client/PandaDocClient";
import {
    executeListDocuments,
    executeGetDocument,
    executeGetDocumentStatus,
    executeCreateDocument,
    executeSendDocument,
    executeDownloadDocument,
    executeListTemplates,
    executeDeleteDocument
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * PandaDoc MCP Adapter - wraps operations as MCP tools
 */
export class PandaDocMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `pandadoc_${op.id}`,
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
        client: PandaDocClient
    ): Promise<unknown> {
        // Remove "pandadoc_" prefix to get operation ID
        const operationId = toolName.replace(/^pandadoc_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listDocuments":
                return await executeListDocuments(client, params as never);
            case "getDocument":
                return await executeGetDocument(client, params as never);
            case "getDocumentStatus":
                return await executeGetDocumentStatus(client, params as never);
            case "createDocument":
                return await executeCreateDocument(client, params as never);
            case "sendDocument":
                return await executeSendDocument(client, params as never);
            case "downloadDocument":
                return await executeDownloadDocument(client, params as never);
            case "listTemplates":
                return await executeListTemplates(client, params as never);
            case "deleteDocument":
                return await executeDeleteDocument(client, params as never);
            default:
                throw new Error(`Unknown PandaDoc operation: ${operationId}`);
        }
    }
}
