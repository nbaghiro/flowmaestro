import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { RedditClient } from "../client/RedditClient";
import { executeGetMe } from "../operations/getMe";
import { executeGetPost } from "../operations/getPost";
import { executeGetPosts } from "../operations/getPosts";
import { executeSave, executeUnsave } from "../operations/save";
import { executeSubmitComment } from "../operations/submitComment";
import { executeSubmitTextPost, executeSubmitLinkPost } from "../operations/submitPost";
import { executeVote } from "../operations/vote";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Reddit MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class RedditMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `reddit_${op.id}`,
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
        client: RedditClient
    ): Promise<unknown> {
        // Remove "reddit_" prefix to get operation ID
        const operationId = toolName.replace(/^reddit_/, "");

        // Route to operation executor
        switch (operationId) {
            case "getPosts":
                return await executeGetPosts(client, params as never);
            case "getPost":
                return await executeGetPost(client, params as never);
            case "submitTextPost":
                return await executeSubmitTextPost(client, params as never);
            case "submitLinkPost":
                return await executeSubmitLinkPost(client, params as never);
            case "submitComment":
                return await executeSubmitComment(client, params as never);
            case "vote":
                return await executeVote(client, params as never);
            case "save":
                return await executeSave(client, params as never);
            case "unsave":
                return await executeUnsave(client, params as never);
            case "getMe":
                return await executeGetMe(client, params as never);
            default:
                throw new Error(`Unknown Reddit operation: ${operationId}`);
        }
    }
}
