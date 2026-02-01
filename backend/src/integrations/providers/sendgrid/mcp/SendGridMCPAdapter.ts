import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Email Operations
    executeSendEmail,
    executeSendTemplateEmail,
    executeSendBatchEmail,
    // Contact Operations
    executeGetContacts,
    executeGetContact,
    executeAddContacts,
    executeUpdateContact,
    executeDeleteContacts,
    executeSearchContacts,
    // List Operations
    executeGetLists,
    executeGetList,
    executeCreateList,
    executeUpdateList,
    executeDeleteList,
    executeAddContactsToList,
    executeRemoveContactsFromList,
    // Template Operations
    executeGetTemplates,
    executeGetTemplate,
    // Validation Operations
    executeValidateEmail,
    // Analytics Operations
    executeGetStats
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

/**
 * SendGrid MCP Adapter
 *
 * Converts SendGrid operations into MCP tools for AI agents
 */
export class SendGridMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `sendgrid_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: SendGridClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("sendgrid_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // Email Operations
            case "sendEmail":
                return executeSendEmail(client, params as never);
            case "sendTemplateEmail":
                return executeSendTemplateEmail(client, params as never);
            case "sendBatchEmail":
                return executeSendBatchEmail(client, params as never);

            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "addContacts":
                return executeAddContacts(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContacts":
                return executeDeleteContacts(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "updateList":
                return executeUpdateList(client, params as never);
            case "deleteList":
                return executeDeleteList(client, params as never);
            case "addContactsToList":
                return executeAddContactsToList(client, params as never);
            case "removeContactsFromList":
                return executeRemoveContactsFromList(client, params as never);

            // Template Operations
            case "getTemplates":
                return executeGetTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

            // Validation Operations
            case "validateEmail":
                return executeValidateEmail(client, params as never);

            // Analytics Operations
            case "getStats":
                return executeGetStats(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
