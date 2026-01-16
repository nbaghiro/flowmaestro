import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { AsanaClient } from "./client/AsanaClient";
import { AsanaMCPAdapter } from "./mcp/AsanaMCPAdapter";
import {
    // Task Operations
    createTaskOperation,
    executeCreateTask,
    getTaskOperation,
    executeGetTask,
    updateTaskOperation,
    executeUpdateTask,
    deleteTaskOperation,
    executeDeleteTask,
    listTasksOperation,
    executeListTasks,
    searchTasksOperation,
    executeSearchTasks,
    addTaskToProjectOperation,
    executeAddTaskToProject,
    removeTaskFromProjectOperation,
    executeRemoveTaskFromProject,
    createSubtaskOperation,
    executeCreateSubtask,
    getSubtasksOperation,
    executeGetSubtasks,
    addCommentToTaskOperation,
    executeAddCommentToTask,
    getTaskCommentsOperation,
    executeGetTaskComments,
    addTagToTaskOperation,
    executeAddTagToTask,
    removeTagFromTaskOperation,
    executeRemoveTagFromTask,
    // Project Operations
    createProjectOperation,
    executeCreateProject,
    getProjectOperation,
    executeGetProject,
    updateProjectOperation,
    executeUpdateProject,
    deleteProjectOperation,
    executeDeleteProject,
    listProjectsOperation,
    executeListProjects,
    // Section Operations
    createSectionOperation,
    executeCreateSection,
    getSectionOperation,
    executeGetSection,
    updateSectionOperation,
    executeUpdateSection,
    deleteSectionOperation,
    executeDeleteSection,
    listSectionsOperation,
    executeListSections,
    addTaskToSectionOperation,
    executeAddTaskToSection,
    // User and Workspace Operations
    getCurrentUserOperation,
    executeGetCurrentUser,
    getUserOperation,
    executeGetUser,
    listUsersOperation,
    executeListUsers,
    listWorkspacesOperation,
    executeListWorkspaces,
    getWorkspaceOperation,
    executeGetWorkspace,
    listTeamsOperation,
    executeListTeams,
    listTagsOperation,
    executeListTags
} from "./operations";
import type {
    CreateTaskInput,
    GetTaskInput,
    UpdateTaskInput,
    DeleteTaskInput,
    ListTasksInput,
    SearchTasksInput,
    AddTaskToProjectInput,
    RemoveTaskFromProjectInput,
    CreateSubtaskInput,
    GetSubtasksInput,
    AddCommentToTaskInput,
    GetTaskCommentsInput,
    AddTagToTaskInput,
    RemoveTagFromTaskInput,
    CreateProjectInput,
    GetProjectInput,
    UpdateProjectInput,
    DeleteProjectInput,
    ListProjectsInput,
    CreateSectionInput,
    GetSectionInput,
    UpdateSectionInput,
    DeleteSectionInput,
    ListSectionsInput,
    AddTaskToSectionInput,
    GetCurrentUserInput,
    GetUserInput,
    ListUsersInput,
    ListWorkspacesInput,
    GetWorkspaceInput,
    ListTeamsInput,
    ListTagsInput
} from "./schemas";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Asana Provider
 * Provides integration with Asana for task and project management
 */
export class AsanaProvider extends BaseProvider {
    readonly name = "asana";
    readonly displayName = "Asana";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1500,
            burstSize: 50
        }
    };

    private clientPool: Map<string, AsanaClient> = new Map();
    private mcpAdapter: AsanaMCPAdapter;

    constructor() {
        super();

        // Register all operations

        // Task Operations (14)
        this.registerOperation(createTaskOperation);
        this.registerOperation(getTaskOperation);
        this.registerOperation(updateTaskOperation);
        this.registerOperation(deleteTaskOperation);
        this.registerOperation(listTasksOperation);
        this.registerOperation(searchTasksOperation);
        this.registerOperation(addTaskToProjectOperation);
        this.registerOperation(removeTaskFromProjectOperation);
        this.registerOperation(createSubtaskOperation);
        this.registerOperation(getSubtasksOperation);
        this.registerOperation(addCommentToTaskOperation);
        this.registerOperation(getTaskCommentsOperation);
        this.registerOperation(addTagToTaskOperation);
        this.registerOperation(removeTagFromTaskOperation);

        // Project Operations (5)
        this.registerOperation(createProjectOperation);
        this.registerOperation(getProjectOperation);
        this.registerOperation(updateProjectOperation);
        this.registerOperation(deleteProjectOperation);
        this.registerOperation(listProjectsOperation);

        // Section Operations (6)
        this.registerOperation(createSectionOperation);
        this.registerOperation(getSectionOperation);
        this.registerOperation(updateSectionOperation);
        this.registerOperation(deleteSectionOperation);
        this.registerOperation(listSectionsOperation);
        this.registerOperation(addTaskToSectionOperation);

        // User and Workspace Operations (7)
        this.registerOperation(getCurrentUserOperation);
        this.registerOperation(getUserOperation);
        this.registerOperation(listUsersOperation);
        this.registerOperation(listWorkspacesOperation);
        this.registerOperation(getWorkspaceOperation);
        this.registerOperation(listTeamsOperation);
        this.registerOperation(listTagsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new AsanaMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.asana.com/-/oauth_authorize",
            tokenUrl: "https://app.asana.com/-/oauth_token",
            scopes: ["default"],
            clientId: appConfig.oauth.asana.clientId,
            clientSecret: appConfig.oauth.asana.clientSecret,
            redirectUri: getOAuthRedirectUri("asana"),
            refreshable: true
        };
        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            // Task Operations
            case "createTask":
                return await executeCreateTask(client, validatedParams as CreateTaskInput);
            case "getTask":
                return await executeGetTask(client, validatedParams as GetTaskInput);
            case "updateTask":
                return await executeUpdateTask(client, validatedParams as UpdateTaskInput);
            case "deleteTask":
                return await executeDeleteTask(client, validatedParams as DeleteTaskInput);
            case "listTasks":
                return await executeListTasks(client, validatedParams as ListTasksInput);
            case "searchTasks":
                return await executeSearchTasks(client, validatedParams as SearchTasksInput);
            case "addTaskToProject":
                return await executeAddTaskToProject(
                    client,
                    validatedParams as AddTaskToProjectInput
                );
            case "removeTaskFromProject":
                return await executeRemoveTaskFromProject(
                    client,
                    validatedParams as RemoveTaskFromProjectInput
                );
            case "createSubtask":
                return await executeCreateSubtask(client, validatedParams as CreateSubtaskInput);
            case "getSubtasks":
                return await executeGetSubtasks(client, validatedParams as GetSubtasksInput);
            case "addCommentToTask":
                return await executeAddCommentToTask(
                    client,
                    validatedParams as AddCommentToTaskInput
                );
            case "getTaskComments":
                return await executeGetTaskComments(
                    client,
                    validatedParams as GetTaskCommentsInput
                );
            case "addTagToTask":
                return await executeAddTagToTask(client, validatedParams as AddTagToTaskInput);
            case "removeTagFromTask":
                return await executeRemoveTagFromTask(
                    client,
                    validatedParams as RemoveTagFromTaskInput
                );

            // Project Operations
            case "createProject":
                return await executeCreateProject(client, validatedParams as CreateProjectInput);
            case "getProject":
                return await executeGetProject(client, validatedParams as GetProjectInput);
            case "updateProject":
                return await executeUpdateProject(client, validatedParams as UpdateProjectInput);
            case "deleteProject":
                return await executeDeleteProject(client, validatedParams as DeleteProjectInput);
            case "listProjects":
                return await executeListProjects(client, validatedParams as ListProjectsInput);

            // Section Operations
            case "createSection":
                return await executeCreateSection(client, validatedParams as CreateSectionInput);
            case "getSection":
                return await executeGetSection(client, validatedParams as GetSectionInput);
            case "updateSection":
                return await executeUpdateSection(client, validatedParams as UpdateSectionInput);
            case "deleteSection":
                return await executeDeleteSection(client, validatedParams as DeleteSectionInput);
            case "listSections":
                return await executeListSections(client, validatedParams as ListSectionsInput);
            case "addTaskToSection":
                return await executeAddTaskToSection(
                    client,
                    validatedParams as AddTaskToSectionInput
                );

            // User and Workspace Operations
            case "getCurrentUser":
                return await executeGetCurrentUser(client, validatedParams as GetCurrentUserInput);
            case "getUser":
                return await executeGetUser(client, validatedParams as GetUserInput);
            case "listUsers":
                return await executeListUsers(client, validatedParams as ListUsersInput);
            case "listWorkspaces":
                return await executeListWorkspaces(client, validatedParams as ListWorkspacesInput);
            case "getWorkspace":
                return await executeGetWorkspace(client, validatedParams as GetWorkspaceInput);
            case "listTeams":
                return await executeListTeams(client, validatedParams as ListTeamsInput);
            case "listTags":
                return await executeListTags(client, validatedParams as ListTagsInput);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Asana client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): AsanaClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Extract OAuth tokens
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new AsanaClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
