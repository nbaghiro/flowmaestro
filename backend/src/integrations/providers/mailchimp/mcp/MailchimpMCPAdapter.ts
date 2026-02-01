import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // List Operations
    executeGetLists,
    executeGetList,
    executeCreateList,
    executeUpdateList,
    // Member Operations
    executeGetMembers,
    executeGetMember,
    executeAddMember,
    executeUpdateMember,
    executeArchiveMember,
    executeDeleteMemberPermanently,
    // Tag Operations
    executeGetTags,
    executeAddTagsToMember,
    executeRemoveTagsFromMember,
    // Segment Operations
    executeGetSegments,
    executeGetSegmentMembers,
    // Campaign Operations
    executeGetCampaigns,
    executeGetCampaign,
    executeCreateCampaign,
    executeUpdateCampaign,
    executeSendCampaign,
    executeScheduleCampaign,
    executeUnscheduleCampaign,
    // Template Operations
    executeGetTemplates,
    executeGetTemplate
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

/**
 * Mailchimp MCP Adapter
 *
 * Converts Mailchimp operations into MCP tools for AI agents
 */
export class MailchimpMCPAdapter {
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
                name: `mailchimp_${id}`,
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
        client: MailchimpClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("mailchimp_", "");

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
            case "updateList":
                return executeUpdateList(client, params as never);

            // Member Operations
            case "getMembers":
                return executeGetMembers(client, params as never);
            case "getMember":
                return executeGetMember(client, params as never);
            case "addMember":
                return executeAddMember(client, params as never);
            case "updateMember":
                return executeUpdateMember(client, params as never);
            case "archiveMember":
                return executeArchiveMember(client, params as never);
            case "deleteMemberPermanently":
                return executeDeleteMemberPermanently(client, params as never);

            // Tag Operations
            case "getTags":
                return executeGetTags(client, params as never);
            case "addTagsToMember":
                return executeAddTagsToMember(client, params as never);
            case "removeTagsFromMember":
                return executeRemoveTagsFromMember(client, params as never);

            // Segment Operations
            case "getSegments":
                return executeGetSegments(client, params as never);
            case "getSegmentMembers":
                return executeGetSegmentMembers(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);
            case "createCampaign":
                return executeCreateCampaign(client, params as never);
            case "updateCampaign":
                return executeUpdateCampaign(client, params as never);
            case "sendCampaign":
                return executeSendCampaign(client, params as never);
            case "scheduleCampaign":
                return executeScheduleCampaign(client, params as never);
            case "unscheduleCampaign":
                return executeUnscheduleCampaign(client, params as never);

            // Template Operations
            case "getTemplates":
                return executeGetTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

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
