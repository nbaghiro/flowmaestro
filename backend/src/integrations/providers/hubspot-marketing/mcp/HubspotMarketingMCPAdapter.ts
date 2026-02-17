import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // List Operations
    executeGetLists,
    executeGetList,
    executeCreateList,
    executeAddToList,
    executeRemoveFromList,
    // Contact Operations
    executeGetContacts,
    executeGetContact,
    executeCreateContact,
    executeUpdateContact,
    executeDeleteContact,
    executeSearchContacts,
    // Campaign Operations
    executeGetCampaigns,
    executeGetCampaign,
    // Form Operations
    executeGetForms,
    executeGetFormSubmissions,
    // Email Operations
    executeGetMarketingEmails,
    executeGetEmailStats,
    // Workflow Operations
    executeGetWorkflows
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

/**
 * HubSpot Marketing MCP Adapter
 *
 * Converts HubSpot Marketing operations into MCP tools for AI agents
 */
export class HubspotMarketingMCPAdapter {
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
                name: `hubspot_marketing_${id}`,
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
        client: HubspotMarketingClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("hubspot_marketing_", "");

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
            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);

            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContact":
                return executeDeleteContact(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);

            // Form Operations
            case "getForms":
                return executeGetForms(client, params as never);
            case "getFormSubmissions":
                return executeGetFormSubmissions(client, params as never);

            // Email Operations
            case "getMarketingEmails":
                return executeGetMarketingEmails(client, params as never);
            case "getEmailStats":
                return executeGetEmailStats(client, params as never);

            // Workflow Operations
            case "getWorkflows":
                return executeGetWorkflows(client, params as never);

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
