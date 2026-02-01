import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ClickUpClient } from "../client/ClickUpClient";
import { executeCreateTaskComment } from "../operations/comments/createTaskComment";
import { executeGetTaskComments } from "../operations/comments/getTaskComments";
import { executeGetLists } from "../operations/hierarchy/getLists";
import { executeGetSpaces } from "../operations/hierarchy/getSpaces";
import { executeGetWorkspaces } from "../operations/hierarchy/getWorkspaces";
import { executeCreateTask } from "../operations/tasks/createTask";
import { executeDeleteTask } from "../operations/tasks/deleteTask";
import { executeGetTask } from "../operations/tasks/getTask";
import { executeGetTasks } from "../operations/tasks/getTasks";
import { executeUpdateTask } from "../operations/tasks/updateTask";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * ClickUp MCP Adapter - wraps operations as MCP tools
 */
export class ClickUpMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `clickup_${op.id}`,
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
        client: ClickUpClient
    ): Promise<unknown> {
        // Remove "clickup_" prefix to get operation ID
        const operationId = toolName.replace(/^clickup_/, "");

        // Route to operation executor
        switch (operationId) {
            // Task operations
            case "createTask":
                return await executeCreateTask(client, params as never);
            case "getTask":
                return await executeGetTask(client, params as never);
            case "updateTask":
                return await executeUpdateTask(client, params as never);
            case "deleteTask":
                return await executeDeleteTask(client, params as never);
            case "getTasks":
                return await executeGetTasks(client, params as never);

            // Comment operations
            case "createTaskComment":
                return await executeCreateTaskComment(client, params as never);
            case "getTaskComments":
                return await executeGetTaskComments(client, params as never);

            // Hierarchy operations
            case "getWorkspaces":
                return await executeGetWorkspaces(client, params as never);
            case "getSpaces":
                return await executeGetSpaces(client, params as never);
            case "getLists":
                return await executeGetLists(client, params as never);

            default:
                throw new Error(`Unknown ClickUp operation: ${operationId}`);
        }
    }
}
