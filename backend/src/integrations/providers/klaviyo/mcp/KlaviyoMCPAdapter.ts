import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeGetProfiles,
    executeGetProfile,
    executeCreateProfile,
    executeUpdateProfile,
    executeSubscribeProfile,
    executeGetLists,
    executeGetListProfiles,
    executeAddProfilesToList,
    executeRemoveProfilesFromList,
    executeCreateEvent,
    executeGetCampaigns
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Klaviyo MCP Adapter
 *
 * Converts Klaviyo operations into MCP tools for AI agents
 */
export class KlaviyoMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        // Convert each operation to an MCP tool
        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `klaviyo_${id}`,
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
        client: KlaviyoClient
    ): Promise<OperationResult> {
        // Remove "klaviyo_" prefix to get operation ID
        const operationId = toolName.replace("klaviyo_", "");

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
            // Profile Operations
            case "getProfiles":
                return executeGetProfiles(client, params as never);
            case "getProfile":
                return executeGetProfile(client, params as never);
            case "createProfile":
                return executeCreateProfile(client, params as never);
            case "updateProfile":
                return executeUpdateProfile(client, params as never);
            case "subscribeProfile":
                return executeSubscribeProfile(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getListProfiles":
                return executeGetListProfiles(client, params as never);
            case "addProfilesToList":
                return executeAddProfilesToList(client, params as never);
            case "removeProfilesFromList":
                return executeRemoveProfilesFromList(client, params as never);

            // Event Operations
            case "createEvent":
                return executeCreateEvent(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);

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
