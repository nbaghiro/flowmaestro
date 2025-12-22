import { LinkedInClient } from "../client/LinkedInClient";
import { executeAddComment } from "../operations/addComment";
import { executeAddReaction } from "../operations/addReaction";
import { executeCreateArticlePost } from "../operations/createArticlePost";
import { executeCreatePost } from "../operations/createPost";
import { executeDeletePost } from "../operations/deletePost";
import { executeGetComments } from "../operations/getComments";
import { executeGetOrganizations } from "../operations/getOrganizations";
import { executeGetPost } from "../operations/getPost";
import { executeGetProfile } from "../operations/getProfile";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * LinkedIn MCP Adapter - wraps operations as MCP tools
 */
export class LinkedInMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `linkedin_${op.id}`,
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
        client: LinkedInClient
    ): Promise<unknown> {
        // Remove "linkedin_" prefix to get operation ID
        const operationId = toolName.replace(/^linkedin_/, "");

        // Route to operation executor
        switch (operationId) {
            case "createPost":
                return await executeCreatePost(client, params as never);
            case "createArticlePost":
                return await executeCreateArticlePost(client, params as never);
            case "deletePost":
                return await executeDeletePost(client, params as never);
            case "getPost":
                return await executeGetPost(client, params as never);
            case "getProfile":
                return await executeGetProfile(client, params as never);
            case "getOrganizations":
                return await executeGetOrganizations(client, params as never);
            case "addComment":
                return await executeAddComment(client, params as never);
            case "getComments":
                return await executeGetComments(client, params as never);
            case "addReaction":
                return await executeAddReaction(client, params as never);
            default:
                throw new Error(`Unknown LinkedIn operation: ${operationId}`);
        }
    }
}
