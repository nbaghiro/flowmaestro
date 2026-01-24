import { PostHogClient } from "../client/PostHogClient";
import { executeCaptureEvent } from "../operations/captureEvent";
import { executeCaptureEvents } from "../operations/captureEvents";
import { executeIdentifyGroup } from "../operations/identifyGroup";
import { executeIdentifyUser } from "../operations/identifyUser";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * PostHog MCP Adapter - wraps operations as MCP tools
 */
export class PostHogMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `posthog_${op.id}`,
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
        client: PostHogClient
    ): Promise<unknown> {
        // Remove "posthog_" prefix to get operation ID
        const operationId = toolName.replace(/^posthog_/, "");

        // Route to operation executor
        switch (operationId) {
            case "captureEvent":
                return await executeCaptureEvent(client, params as never);
            case "captureEvents":
                return await executeCaptureEvents(client, params as never);
            case "identifyUser":
                return await executeIdentifyUser(client, params as never);
            case "identifyGroup":
                return await executeIdentifyGroup(client, params as never);
            default:
                throw new Error(`Unknown PostHog operation: ${operationId}`);
        }
    }
}
