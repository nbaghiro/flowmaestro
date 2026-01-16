import {
    executeCreateTask,
    executeGetTask,
    executeUpdateTask,
    executeDeleteTask,
    executeListTasks,
    executeSearchTasks,
    executeAddTaskToProject,
    executeRemoveTaskFromProject,
    executeCreateSubtask,
    executeGetSubtasks,
    executeAddCommentToTask,
    executeGetTaskComments,
    executeAddTagToTask,
    executeRemoveTagFromTask,
    executeCreateProject,
    executeGetProject,
    executeUpdateProject,
    executeDeleteProject,
    executeListProjects,
    executeCreateSection,
    executeGetSection,
    executeUpdateSection,
    executeDeleteSection,
    executeListSections,
    executeAddTaskToSection,
    executeGetCurrentUser,
    executeGetUser,
    executeListUsers,
    executeListWorkspaces,
    executeGetWorkspace,
    executeListTeams,
    executeListTags
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { AsanaClient } from "../client/AsanaClient";

/**
 * Asana MCP Adapter
 * Wraps Asana operations as MCP tools for AI agents
 */
export class AsanaMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `asana_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: AsanaClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^asana_/, "");
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

        // Execute the appropriate operation
        switch (operationId) {
            // Task Operations
            case "createTask":
                return await executeCreateTask(client, params as never);
            case "getTask":
                return await executeGetTask(client, params as never);
            case "updateTask":
                return await executeUpdateTask(client, params as never);
            case "deleteTask":
                return await executeDeleteTask(client, params as never);
            case "listTasks":
                return await executeListTasks(client, params as never);
            case "searchTasks":
                return await executeSearchTasks(client, params as never);
            case "addTaskToProject":
                return await executeAddTaskToProject(client, params as never);
            case "removeTaskFromProject":
                return await executeRemoveTaskFromProject(client, params as never);
            case "createSubtask":
                return await executeCreateSubtask(client, params as never);
            case "getSubtasks":
                return await executeGetSubtasks(client, params as never);
            case "addCommentToTask":
                return await executeAddCommentToTask(client, params as never);
            case "getTaskComments":
                return await executeGetTaskComments(client, params as never);
            case "addTagToTask":
                return await executeAddTagToTask(client, params as never);
            case "removeTagFromTask":
                return await executeRemoveTagFromTask(client, params as never);

            // Project Operations
            case "createProject":
                return await executeCreateProject(client, params as never);
            case "getProject":
                return await executeGetProject(client, params as never);
            case "updateProject":
                return await executeUpdateProject(client, params as never);
            case "deleteProject":
                return await executeDeleteProject(client, params as never);
            case "listProjects":
                return await executeListProjects(client, params as never);

            // Section Operations
            case "createSection":
                return await executeCreateSection(client, params as never);
            case "getSection":
                return await executeGetSection(client, params as never);
            case "updateSection":
                return await executeUpdateSection(client, params as never);
            case "deleteSection":
                return await executeDeleteSection(client, params as never);
            case "listSections":
                return await executeListSections(client, params as never);
            case "addTaskToSection":
                return await executeAddTaskToSection(client, params as never);

            // User and Workspace Operations
            case "getCurrentUser":
                return await executeGetCurrentUser(client, params as never);
            case "getUser":
                return await executeGetUser(client, params as never);
            case "listUsers":
                return await executeListUsers(client, params as never);
            case "listWorkspaces":
                return await executeListWorkspaces(client, params as never);
            case "getWorkspace":
                return await executeGetWorkspace(client, params as never);
            case "listTeams":
                return await executeListTeams(client, params as never);
            case "listTags":
                return await executeListTags(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unimplemented operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
