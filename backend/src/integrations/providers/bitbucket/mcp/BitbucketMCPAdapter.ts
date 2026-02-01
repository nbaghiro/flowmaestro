import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { BitbucketClient } from "../client/BitbucketClient";
import {
    // Repository executors
    executeListRepositories,
    executeGetRepository,
    executeCreateRepository,
    executeDeleteRepository,
    // Pull request executors
    executeListPullRequests,
    executeGetPullRequest,
    executeCreatePullRequest,
    executeUpdatePullRequest,
    executeMergePullRequest,
    // Issue executors
    executeListIssues,
    executeCreateIssue,
    // Pipeline executors
    executeListPipelines,
    executeGetPipeline,
    executeTriggerPipeline
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Bitbucket MCP Adapter - wraps operations as MCP tools for agent use
 */
export class BitbucketMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `bitbucket_${op.id}`,
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
        client: BitbucketClient
    ): Promise<unknown> {
        // Remove "bitbucket_" prefix to get operation ID
        const operationId = toolName.replace(/^bitbucket_/, "");

        // Route to operation executor
        switch (operationId) {
            // Repository operations
            case "listRepositories":
                return await executeListRepositories(client, params as never);
            case "getRepository":
                return await executeGetRepository(client, params as never);
            case "createRepository":
                return await executeCreateRepository(client, params as never);
            case "deleteRepository":
                return await executeDeleteRepository(client, params as never);

            // Pull request operations
            case "listPullRequests":
                return await executeListPullRequests(client, params as never);
            case "getPullRequest":
                return await executeGetPullRequest(client, params as never);
            case "createPullRequest":
                return await executeCreatePullRequest(client, params as never);
            case "updatePullRequest":
                return await executeUpdatePullRequest(client, params as never);
            case "mergePullRequest":
                return await executeMergePullRequest(client, params as never);

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, params as never);
            case "createIssue":
                return await executeCreateIssue(client, params as never);

            // Pipeline operations
            case "listPipelines":
                return await executeListPipelines(client, params as never);
            case "getPipeline":
                return await executeGetPipeline(client, params as never);
            case "triggerPipeline":
                return await executeTriggerPipeline(client, params as never);

            default:
                throw new Error(`Unknown Bitbucket operation: ${operationId}`);
        }
    }
}
