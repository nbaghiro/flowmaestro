import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { TwitterClient } from "../client/TwitterClient";
import { executeDeleteTweet } from "../operations/deleteTweet";
import { executeGetUser } from "../operations/getUser";
import { executeGetUserTimeline } from "../operations/getUserTimeline";
import { executePostTweet } from "../operations/postTweet";
import { executeReplyToTweet } from "../operations/replyToTweet";
import { executeSearchTweets } from "../operations/searchTweets";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * X (Twitter) MCP Adapter - wraps operations as MCP tools
 */
export class TwitterMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `twitter_${op.id}`,
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
        client: TwitterClient
    ): Promise<unknown> {
        // Remove "twitter_" prefix to get operation ID
        const operationId = toolName.replace(/^twitter_/, "");

        // Route to operation executor
        switch (operationId) {
            case "postTweet":
                return await executePostTweet(client, params as never);
            case "deleteTweet":
                return await executeDeleteTweet(client, params as never);
            case "getUser":
                return await executeGetUser(client, params as never);
            case "getUserTimeline":
                return await executeGetUserTimeline(client, params as never);
            case "searchTweets":
                return await executeSearchTweets(client, params as never);
            case "replyToTweet":
                return await executeReplyToTweet(client, params as never);
            default:
                throw new Error(`Unknown Twitter operation: ${operationId}`);
        }
    }
}
