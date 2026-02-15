/**
 * Asana Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Task Operations
import { executeAddCommentToTask } from "../operations/tasks/addCommentToTask";
import { executeGetTaskComments } from "../operations/tasks/getTaskComments";
import { executeAddTagToTask } from "../operations/tasks/addTagToTask";
import { executeRemoveTagFromTask } from "../operations/tasks/removeTagFromTask";

// Project Operations
import { executeCreateProject } from "../operations/projects/createProject";
import { executeGetProject } from "../operations/projects/getProject";
import { executeUpdateProject } from "../operations/projects/updateProject";
import { executeDeleteProject } from "../operations/projects/deleteProject";
import { executeListProjects } from "../operations/projects/listProjects";

// Section Operations
import { executeCreateSection } from "../operations/sections/createSection";
import { executeGetSection } from "../operations/sections/getSection";
import { executeUpdateSection } from "../operations/sections/updateSection";
import { executeDeleteSection } from "../operations/sections/deleteSection";
import { executeListSections } from "../operations/sections/listSections";
import { executeAddTaskToSection } from "../operations/sections/addTaskToSection";
import { executeAddTaskToProject } from "../operations/tasks/addTaskToProject";
import { executeCreateSubtask } from "../operations/tasks/createSubtask";
import { executeCreateTask } from "../operations/tasks/createTask";
import { executeDeleteTask } from "../operations/tasks/deleteTask";
import { executeGetSubtasks } from "../operations/tasks/getSubtasks";
import { executeGetTask } from "../operations/tasks/getTask";
import { executeListTasks } from "../operations/tasks/listTasks";
import { executeRemoveTaskFromProject } from "../operations/tasks/removeTaskFromProject";
import { executeSearchTasks } from "../operations/tasks/searchTasks";
import { executeUpdateTask } from "../operations/tasks/updateTask";

// User Operations
import { executeGetCurrentUser } from "../operations/users/getCurrentUser";
import { executeGetUser } from "../operations/users/getUser";
import { executeGetWorkspace } from "../operations/users/getWorkspace";
import { executeListTags } from "../operations/users/listTags";
import { executeListTeams } from "../operations/users/listTeams";
import { executeListUsers } from "../operations/users/listUsers";
import { executeListWorkspaces } from "../operations/users/listWorkspaces";

// Schemas
import {
    createTaskInputSchema,
    getTaskInputSchema,
    updateTaskInputSchema,
    deleteTaskInputSchema,
    listTasksInputSchema,
    searchTasksInputSchema,
    addTaskToProjectInputSchema,
    removeTaskFromProjectInputSchema,
    createSubtaskInputSchema,
    getSubtasksInputSchema,
    addCommentToTaskInputSchema,
    getTaskCommentsInputSchema,
    addTagToTaskInputSchema,
    removeTagFromTaskInputSchema,
    createProjectInputSchema,
    getProjectInputSchema,
    updateProjectInputSchema,
    deleteProjectInputSchema,
    listProjectsInputSchema,
    createSectionInputSchema,
    getSectionInputSchema,
    updateSectionInputSchema,
    deleteSectionInputSchema,
    listSectionsInputSchema,
    addTaskToSectionInputSchema,
    getCurrentUserInputSchema,
    getUserInputSchema,
    listUsersInputSchema,
    listWorkspacesInputSchema,
    getWorkspaceInputSchema,
    listTeamsInputSchema,
    listTagsInputSchema
} from "../schemas";

import type { AsanaClient } from "../client/AsanaClient";

// Common GIDs used across tests for consistency
const WORKSPACE_GID = "1205678901234567";
const PROJECT_GID = "1207890123456789";
const SECTION_GID = "1208901234567890";
const TASK_GID = "1209012345678901";
const SUBTASK_GID = "1210123456789012";
const USER_GID = "1201234567890123";
const TAG_GID = "1211234567890123";
const COMMENT_GID = "1212345678901234";

// Mock AsanaClient factory
function createMockAsanaClient(): jest.Mocked<AsanaClient> {
    return {
        getAsana: jest.fn(),
        postAsana: jest.fn(),
        putAsana: jest.fn(),
        deleteAsana: jest.fn(),
        getPaginated: jest.fn(),
        buildOptFields: jest.fn((fields?: string[]) =>
            fields && fields.length > 0 ? fields.join(",") : undefined
        ),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<AsanaClient>;
}

describe("Asana Operation Executors", () => {
    let mockClient: jest.Mocked<AsanaClient>;

    beforeEach(() => {
        mockClient = createMockAsanaClient();
    });

    // ============================================================================
    // TASK OPERATIONS
    // ============================================================================

    describe("executeCreateTask", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            await executeCreateTask(mockClient, {
                workspace: WORKSPACE_GID,
                name: "Test Task"
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith("/tasks", {
                workspace: WORKSPACE_GID,
                name: "Test Task"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            const result = await executeCreateTask(mockClient, {
                workspace: WORKSPACE_GID,
                name: "Test Task"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });
        });

        it("passes optional fields correctly", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            await executeCreateTask(mockClient, {
                workspace: WORKSPACE_GID,
                name: "Test Task",
                notes: "Task description",
                assignee: USER_GID,
                due_on: "2024-03-15",
                projects: [PROJECT_GID],
                tags: [TAG_GID]
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith("/tasks", {
                workspace: WORKSPACE_GID,
                name: "Test Task",
                notes: "Task description",
                assignee: USER_GID,
                due_on: "2024-03-15",
                projects: [PROJECT_GID],
                tags: [TAG_GID]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeCreateTask(mockClient, {
                workspace: "invalid",
                name: "Test Task"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workspace not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postAsana.mockRejectedValueOnce("string error");

            const result = await executeCreateTask(mockClient, {
                workspace: WORKSPACE_GID,
                name: "Test Task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create task");
        });
    });

    describe("executeGetTask", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task"
            });

            await executeGetTask(mockClient, {
                task_gid: TASK_GID
            });

            expect(mockClient.getAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}`, {});
        });

        it("returns normalized output on success", async () => {
            const taskResponse = {
                gid: TASK_GID,
                name: "Test Task",
                resource_type: "task",
                notes: "Description",
                completed: false
            };
            mockClient.getAsana.mockResolvedValueOnce(taskResponse);

            const result = await executeGetTask(mockClient, {
                task_gid: TASK_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(taskResponse);
        });

        it("passes opt_fields to client", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Test Task"
            });

            await executeGetTask(mockClient, {
                task_gid: TASK_GID,
                opt_fields: ["name", "notes", "assignee"]
            });

            expect(mockClient.buildOptFields).toHaveBeenCalledWith(["name", "notes", "assignee"]);
            expect(mockClient.getAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}`, {
                opt_fields: "name,notes,assignee"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeGetTask(mockClient, {
                task_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeUpdateTask", () => {
        it("calls client with correct params", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Updated Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            await executeUpdateTask(mockClient, {
                task_gid: TASK_GID,
                name: "Updated Task"
            });

            expect(mockClient.putAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}`, {
                name: "Updated Task"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Updated Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            const result = await executeUpdateTask(mockClient, {
                task_gid: TASK_GID,
                name: "Updated Task",
                completed: true
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: TASK_GID,
                name: "Updated Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });
        });

        it("passes null values for clearing fields", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: TASK_GID,
                name: "Task",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${TASK_GID}`
            });

            await executeUpdateTask(mockClient, {
                task_gid: TASK_GID,
                assignee: null,
                due_on: null
            });

            expect(mockClient.putAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}`, {
                assignee: null,
                due_on: null
            });
        });

        it("returns error on client failure", async () => {
            mockClient.putAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeUpdateTask(mockClient, {
                task_gid: "invalid",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeDeleteTask", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            await executeDeleteTask(mockClient, {
                task_gid: TASK_GID
            });

            expect(mockClient.deleteAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}`);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            const result = await executeDeleteTask(mockClient, {
                task_gid: TASK_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                task_gid: TASK_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeDeleteTask(mockClient, {
                task_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListTasks", () => {
        it("calls client with project filter", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([
                { gid: TASK_GID, name: "Task 1", resource_type: "task" }
            ]);

            await executeListTasks(mockClient, {
                project: PROJECT_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/projects/${PROJECT_GID}/tasks`,
                {},
                50
            );
        });

        it("calls client with section filter", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListTasks(mockClient, {
                section: SECTION_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/sections/${SECTION_GID}/tasks`,
                {},
                50
            );
        });

        it("calls client with assignee and workspace filter", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListTasks(mockClient, {
                assignee: USER_GID,
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                "/tasks",
                { assignee: USER_GID, workspace: WORKSPACE_GID },
                50
            );
        });

        it("returns normalized output on success", async () => {
            const tasks = [
                { gid: TASK_GID, name: "Task 1", resource_type: "task" },
                { gid: "task2", name: "Task 2", resource_type: "task" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(tasks);

            const result = await executeListTasks(mockClient, {
                project: PROJECT_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tasks,
                count: 2
            });
        });

        it("returns validation error when no filter provided", async () => {
            const result = await executeListTasks(mockClient, {
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("At least one filter is required");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeListTasks(mockClient, {
                project: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeSearchTasks", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeSearchTasks(mockClient, {
                workspace: WORKSPACE_GID,
                text: "authentication",
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/tasks/search`,
                { text: "authentication" },
                50
            );
        });

        it("returns normalized output on success", async () => {
            const tasks = [{ gid: TASK_GID, name: "Auth Task", resource_type: "task" }];
            mockClient.getPaginated.mockResolvedValueOnce(tasks);

            const result = await executeSearchTasks(mockClient, {
                workspace: WORKSPACE_GID,
                text: "auth",
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tasks,
                count: 1
            });
        });

        it("passes multiple search filters", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeSearchTasks(mockClient, {
                workspace: WORKSPACE_GID,
                text: "bug",
                completed: false,
                assignee: USER_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/tasks/search`,
                { text: "bug", completed: false, assignee: USER_GID },
                50
            );
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeSearchTasks(mockClient, {
                workspace: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    describe("executeAddTaskToProject", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            await executeAddTaskToProject(mockClient, {
                task_gid: TASK_GID,
                project: PROJECT_GID
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/addProject`, {
                project: PROJECT_GID
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            const result = await executeAddTaskToProject(mockClient, {
                task_gid: TASK_GID,
                project: PROJECT_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                added: true,
                task_gid: TASK_GID,
                project_gid: PROJECT_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeAddTaskToProject(mockClient, {
                task_gid: "invalid",
                project: PROJECT_GID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeRemoveTaskFromProject", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            await executeRemoveTaskFromProject(mockClient, {
                task_gid: TASK_GID,
                project: PROJECT_GID
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/removeProject`, {
                project: PROJECT_GID
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            const result = await executeRemoveTaskFromProject(mockClient, {
                task_gid: TASK_GID,
                project: PROJECT_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                removed: true,
                task_gid: TASK_GID,
                project_gid: PROJECT_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeRemoveTaskFromProject(mockClient, {
                task_gid: "invalid",
                project: PROJECT_GID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeCreateSubtask", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: SUBTASK_GID,
                name: "Subtask",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${SUBTASK_GID}`
            });

            await executeCreateSubtask(mockClient, {
                parent_task_gid: TASK_GID,
                name: "Subtask"
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/subtasks`, {
                name: "Subtask"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: SUBTASK_GID,
                name: "Subtask",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${SUBTASK_GID}`
            });

            const result = await executeCreateSubtask(mockClient, {
                parent_task_gid: TASK_GID,
                name: "Subtask"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: SUBTASK_GID,
                name: "Subtask",
                resource_type: "task",
                permalink_url: `https://app.asana.com/0/0/${SUBTASK_GID}`,
                parent_gid: TASK_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Parent task not found"));

            const result = await executeCreateSubtask(mockClient, {
                parent_task_gid: "invalid",
                name: "Subtask"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Parent task not found");
        });
    });

    describe("executeGetSubtasks", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeGetSubtasks(mockClient, {
                task_gid: TASK_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/tasks/${TASK_GID}/subtasks`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const subtasks = [
                { gid: SUBTASK_GID, name: "Subtask 1", resource_type: "task" },
                { gid: "subtask2", name: "Subtask 2", resource_type: "task" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(subtasks);

            const result = await executeGetSubtasks(mockClient, {
                task_gid: TASK_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                subtasks,
                count: 2,
                parent_gid: TASK_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeGetSubtasks(mockClient, {
                task_gid: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeAddCommentToTask", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: COMMENT_GID,
                text: "Comment text",
                resource_type: "story",
                created_at: "2024-02-20T14:30:00.000Z"
            });

            await executeAddCommentToTask(mockClient, {
                task_gid: TASK_GID,
                text: "Comment text"
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/stories`, {
                text: "Comment text"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: COMMENT_GID,
                text: "Comment text",
                resource_type: "story",
                created_at: "2024-02-20T14:30:00.000Z"
            });

            const result = await executeAddCommentToTask(mockClient, {
                task_gid: TASK_GID,
                text: "Comment text"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: COMMENT_GID,
                text: "Comment text",
                resource_type: "story",
                created_at: "2024-02-20T14:30:00.000Z",
                task_gid: TASK_GID
            });
        });

        it("passes optional html_text and is_pinned", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: COMMENT_GID,
                text: "Comment",
                resource_type: "story",
                created_at: "2024-02-20T14:30:00.000Z"
            });

            await executeAddCommentToTask(mockClient, {
                task_gid: TASK_GID,
                text: "Comment",
                html_text: "<p>Comment</p>",
                is_pinned: true
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/stories`, {
                text: "Comment",
                html_text: "<p>Comment</p>",
                is_pinned: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeAddCommentToTask(mockClient, {
                task_gid: "invalid",
                text: "Comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeGetTaskComments", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeGetTaskComments(mockClient, {
                task_gid: TASK_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/tasks/${TASK_GID}/stories`,
                {},
                50
            );
        });

        it("filters to only comment_added stories", async () => {
            const stories = [
                { gid: COMMENT_GID, text: "Comment 1", resource_subtype: "comment_added" },
                { gid: "story2", text: "System event", resource_subtype: "system" },
                { gid: "story3", text: "Comment 2", resource_subtype: "comment_added" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(stories);

            const result = await executeGetTaskComments(mockClient, {
                task_gid: TASK_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            const data = result.data as { comments: unknown[]; count: number; task_gid: string };
            expect(data.comments).toHaveLength(2);
            expect(data.count).toBe(2);
        });

        it("returns normalized output on success", async () => {
            const comments = [
                { gid: COMMENT_GID, text: "Comment 1", resource_subtype: "comment_added" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(comments);

            const result = await executeGetTaskComments(mockClient, {
                task_gid: TASK_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                comments,
                count: 1,
                task_gid: TASK_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeGetTaskComments(mockClient, {
                task_gid: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeAddTagToTask", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            await executeAddTagToTask(mockClient, {
                task_gid: TASK_GID,
                tag: TAG_GID
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/addTag`, {
                tag: TAG_GID
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            const result = await executeAddTagToTask(mockClient, {
                task_gid: TASK_GID,
                tag: TAG_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                added: true,
                task_gid: TASK_GID,
                tag_gid: TAG_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeAddTagToTask(mockClient, {
                task_gid: "invalid",
                tag: TAG_GID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    describe("executeRemoveTagFromTask", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            await executeRemoveTagFromTask(mockClient, {
                task_gid: TASK_GID,
                tag: TAG_GID
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/tasks/${TASK_GID}/removeTag`, {
                tag: TAG_GID
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            const result = await executeRemoveTagFromTask(mockClient, {
                task_gid: TASK_GID,
                tag: TAG_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                removed: true,
                task_gid: TASK_GID,
                tag_gid: TAG_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeRemoveTagFromTask(mockClient, {
                task_gid: "invalid",
                tag: TAG_GID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Task not found");
        });
    });

    // ============================================================================
    // PROJECT OPERATIONS
    // ============================================================================

    describe("executeCreateProject", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "New Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });

            await executeCreateProject(mockClient, {
                workspace: WORKSPACE_GID,
                name: "New Project"
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith("/projects", {
                workspace: WORKSPACE_GID,
                name: "New Project"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "New Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });

            const result = await executeCreateProject(mockClient, {
                workspace: WORKSPACE_GID,
                name: "New Project"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: PROJECT_GID,
                name: "New Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });
        });

        it("passes optional fields correctly", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "New Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });

            await executeCreateProject(mockClient, {
                workspace: WORKSPACE_GID,
                name: "New Project",
                notes: "Project description",
                color: "dark-blue",
                default_view: "board",
                public: true
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith("/projects", {
                workspace: WORKSPACE_GID,
                name: "New Project",
                notes: "Project description",
                color: "dark-blue",
                default_view: "board",
                public: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeCreateProject(mockClient, {
                workspace: "invalid",
                name: "Project"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    describe("executeGetProject", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "Project",
                resource_type: "project"
            });

            await executeGetProject(mockClient, {
                project_gid: PROJECT_GID
            });

            expect(mockClient.getAsana).toHaveBeenCalledWith(`/projects/${PROJECT_GID}`, {});
        });

        it("returns normalized output on success", async () => {
            const projectResponse = {
                gid: PROJECT_GID,
                name: "Project",
                resource_type: "project",
                notes: "Description"
            };
            mockClient.getAsana.mockResolvedValueOnce(projectResponse);

            const result = await executeGetProject(mockClient, {
                project_gid: PROJECT_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(projectResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeGetProject(mockClient, {
                project_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeUpdateProject", () => {
        it("calls client with correct params", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "Updated Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });

            await executeUpdateProject(mockClient, {
                project_gid: PROJECT_GID,
                name: "Updated Project"
            });

            expect(mockClient.putAsana).toHaveBeenCalledWith(`/projects/${PROJECT_GID}`, {
                name: "Updated Project"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: PROJECT_GID,
                name: "Updated Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });

            const result = await executeUpdateProject(mockClient, {
                project_gid: PROJECT_GID,
                name: "Updated Project"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: PROJECT_GID,
                name: "Updated Project",
                resource_type: "project",
                permalink_url: `https://app.asana.com/0/${PROJECT_GID}`
            });
        });

        it("returns error on client failure", async () => {
            mockClient.putAsana.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeUpdateProject(mockClient, {
                project_gid: "invalid",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeDeleteProject", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            await executeDeleteProject(mockClient, {
                project_gid: PROJECT_GID
            });

            expect(mockClient.deleteAsana).toHaveBeenCalledWith(`/projects/${PROJECT_GID}`);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            const result = await executeDeleteProject(mockClient, {
                project_gid: PROJECT_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                project_gid: PROJECT_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteAsana.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeDeleteProject(mockClient, {
                project_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeListProjects", () => {
        it("calls client with workspace filter", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListProjects(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/projects`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const projects = [
                { gid: PROJECT_GID, name: "Project 1", resource_type: "project" },
                { gid: "project2", name: "Project 2", resource_type: "project" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(projects);

            const result = await executeListProjects(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                projects,
                count: 2
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeListProjects(mockClient, {
                workspace: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    // ============================================================================
    // SECTION OPERATIONS
    // ============================================================================

    describe("executeCreateSection", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: SECTION_GID,
                name: "New Section",
                resource_type: "section"
            });

            await executeCreateSection(mockClient, {
                project: PROJECT_GID,
                name: "New Section"
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/projects/${PROJECT_GID}/sections`, {
                name: "New Section"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({
                gid: SECTION_GID,
                name: "New Section",
                resource_type: "section"
            });

            const result = await executeCreateSection(mockClient, {
                project: PROJECT_GID,
                name: "New Section"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: SECTION_GID,
                name: "New Section",
                resource_type: "section",
                project_gid: PROJECT_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeCreateSection(mockClient, {
                project: "invalid",
                name: "Section"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeGetSection", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: SECTION_GID,
                name: "Section",
                resource_type: "section"
            });

            await executeGetSection(mockClient, {
                section_gid: SECTION_GID
            });

            expect(mockClient.getAsana).toHaveBeenCalledWith(`/sections/${SECTION_GID}`, {});
        });

        it("returns normalized output on success", async () => {
            const sectionResponse = {
                gid: SECTION_GID,
                name: "Section",
                resource_type: "section"
            };
            mockClient.getAsana.mockResolvedValueOnce(sectionResponse);

            const result = await executeGetSection(mockClient, {
                section_gid: SECTION_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sectionResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("Section not found"));

            const result = await executeGetSection(mockClient, {
                section_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Section not found");
        });
    });

    describe("executeUpdateSection", () => {
        it("calls client with correct params", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: SECTION_GID,
                name: "Updated Section",
                resource_type: "section"
            });

            await executeUpdateSection(mockClient, {
                section_gid: SECTION_GID,
                name: "Updated Section"
            });

            expect(mockClient.putAsana).toHaveBeenCalledWith(`/sections/${SECTION_GID}`, {
                name: "Updated Section"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.putAsana.mockResolvedValueOnce({
                gid: SECTION_GID,
                name: "Updated Section",
                resource_type: "section"
            });

            const result = await executeUpdateSection(mockClient, {
                section_gid: SECTION_GID,
                name: "Updated Section"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                gid: SECTION_GID,
                name: "Updated Section",
                resource_type: "section"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.putAsana.mockRejectedValueOnce(new Error("Section not found"));

            const result = await executeUpdateSection(mockClient, {
                section_gid: "invalid",
                name: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Section not found");
        });
    });

    describe("executeDeleteSection", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            await executeDeleteSection(mockClient, {
                section_gid: SECTION_GID
            });

            expect(mockClient.deleteAsana).toHaveBeenCalledWith(`/sections/${SECTION_GID}`);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteAsana.mockResolvedValueOnce(undefined);

            const result = await executeDeleteSection(mockClient, {
                section_gid: SECTION_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                section_gid: SECTION_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteAsana.mockRejectedValueOnce(new Error("Section not found"));

            const result = await executeDeleteSection(mockClient, {
                section_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Section not found");
        });
    });

    describe("executeListSections", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListSections(mockClient, {
                project: PROJECT_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/projects/${PROJECT_GID}/sections`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const sections = [
                { gid: SECTION_GID, name: "Section 1", resource_type: "section" },
                { gid: "section2", name: "Section 2", resource_type: "section" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(sections);

            const result = await executeListSections(mockClient, {
                project: PROJECT_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sections,
                count: 2,
                project_gid: PROJECT_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeListSections(mockClient, {
                project: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    describe("executeAddTaskToSection", () => {
        it("calls client with correct params", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            await executeAddTaskToSection(mockClient, {
                section_gid: SECTION_GID,
                task: TASK_GID
            });

            expect(mockClient.postAsana).toHaveBeenCalledWith(`/sections/${SECTION_GID}/addTask`, {
                task: TASK_GID
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postAsana.mockResolvedValueOnce({});

            const result = await executeAddTaskToSection(mockClient, {
                section_gid: SECTION_GID,
                task: TASK_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                added: true,
                task_gid: TASK_GID,
                section_gid: SECTION_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postAsana.mockRejectedValueOnce(new Error("Section not found"));

            const result = await executeAddTaskToSection(mockClient, {
                section_gid: "invalid",
                task: TASK_GID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Section not found");
        });
    });

    // ============================================================================
    // USER OPERATIONS
    // ============================================================================

    describe("executeGetCurrentUser", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: USER_GID,
                name: "Test User",
                email: "test@example.com"
            });

            await executeGetCurrentUser(mockClient, {});

            expect(mockClient.getAsana).toHaveBeenCalledWith("/users/me", {});
        });

        it("returns normalized output on success", async () => {
            const userResponse = {
                gid: USER_GID,
                name: "Test User",
                email: "test@example.com",
                resource_type: "user"
            };
            mockClient.getAsana.mockResolvedValueOnce(userResponse);

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(userResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("Invalid access token"));

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid access token");
        });
    });

    describe("executeGetUser", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: USER_GID,
                name: "Test User",
                resource_type: "user"
            });

            await executeGetUser(mockClient, {
                user_gid: USER_GID
            });

            expect(mockClient.getAsana).toHaveBeenCalledWith(`/users/${USER_GID}`, {});
        });

        it("returns normalized output on success", async () => {
            const userResponse = {
                gid: USER_GID,
                name: "Test User",
                email: "test@example.com",
                resource_type: "user"
            };
            mockClient.getAsana.mockResolvedValueOnce(userResponse);

            const result = await executeGetUser(mockClient, {
                user_gid: USER_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(userResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("User not found"));

            const result = await executeGetUser(mockClient, {
                user_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("User not found");
        });
    });

    describe("executeListUsers", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListUsers(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/users`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const users = [
                { gid: USER_GID, name: "User 1", resource_type: "user" },
                { gid: "user2", name: "User 2", resource_type: "user" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(users);

            const result = await executeListUsers(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                users,
                count: 2,
                workspace_gid: WORKSPACE_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeListUsers(mockClient, {
                workspace: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    describe("executeListWorkspaces", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListWorkspaces(mockClient, {
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith("/workspaces", {}, 50);
        });

        it("returns normalized output on success", async () => {
            const workspaces = [
                { gid: WORKSPACE_GID, name: "Workspace 1", resource_type: "workspace" },
                { gid: "workspace2", name: "Workspace 2", resource_type: "workspace" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(workspaces);

            const result = await executeListWorkspaces(mockClient, {
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                workspaces,
                count: 2
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Invalid access token"));

            const result = await executeListWorkspaces(mockClient, {
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid access token");
        });
    });

    describe("executeGetWorkspace", () => {
        it("calls client with correct params", async () => {
            mockClient.getAsana.mockResolvedValueOnce({
                gid: WORKSPACE_GID,
                name: "Workspace",
                resource_type: "workspace"
            });

            await executeGetWorkspace(mockClient, {
                workspace_gid: WORKSPACE_GID
            });

            expect(mockClient.getAsana).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_GID}`, {});
        });

        it("returns normalized output on success", async () => {
            const workspaceResponse = {
                gid: WORKSPACE_GID,
                name: "Workspace",
                resource_type: "workspace",
                is_organization: true
            };
            mockClient.getAsana.mockResolvedValueOnce(workspaceResponse);

            const result = await executeGetWorkspace(mockClient, {
                workspace_gid: WORKSPACE_GID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(workspaceResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getAsana.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeGetWorkspace(mockClient, {
                workspace_gid: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    describe("executeListTeams", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListTeams(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/teams`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const teams = [
                { gid: "team1", name: "Engineering", resource_type: "team" },
                { gid: "team2", name: "Product", resource_type: "team" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(teams);

            const result = await executeListTeams(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                teams,
                count: 2,
                workspace_gid: WORKSPACE_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(
                new Error("Workspace not found or not an organization")
            );

            const result = await executeListTeams(mockClient, {
                workspace: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found or not an organization");
        });
    });

    describe("executeListTags", () => {
        it("calls client with correct params", async () => {
            mockClient.getPaginated.mockResolvedValueOnce([]);

            await executeListTags(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(mockClient.getPaginated).toHaveBeenCalledWith(
                `/workspaces/${WORKSPACE_GID}/tags`,
                {},
                50
            );
        });

        it("returns normalized output on success", async () => {
            const tags = [
                { gid: TAG_GID, name: "Backend", resource_type: "tag" },
                { gid: "tag2", name: "Frontend", resource_type: "tag" }
            ];
            mockClient.getPaginated.mockResolvedValueOnce(tags);

            const result = await executeListTags(mockClient, {
                workspace: WORKSPACE_GID,
                limit: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tags,
                count: 2,
                workspace_gid: WORKSPACE_GID
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPaginated.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeListTags(mockClient, {
                workspace: "invalid",
                limit: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Workspace not found");
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION
    // ============================================================================

    describe("schema validation", () => {
        describe("createTaskInputSchema", () => {
            it("validates minimal input", () => {
                const result = createTaskInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: "Test Task"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createTaskInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: "Test Task",
                    notes: "Description",
                    assignee: USER_GID,
                    due_on: "2024-03-15",
                    projects: [PROJECT_GID],
                    tags: [TAG_GID]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = createTaskInputSchema.safeParse({
                    name: "Test Task"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing name", () => {
                const result = createTaskInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty name", () => {
                const result = createTaskInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTaskInputSchema", () => {
            it("validates minimal input", () => {
                const result = getTaskInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with opt_fields", () => {
                const result = getTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    opt_fields: ["name", "notes"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing task_gid", () => {
                const result = getTaskInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateTaskInputSchema", () => {
            it("validates minimal input", () => {
                const result = updateTaskInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with update fields", () => {
                const result = updateTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    name: "Updated",
                    completed: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with null values for clearing", () => {
                const result = updateTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    assignee: null,
                    due_on: null
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing task_gid", () => {
                const result = updateTaskInputSchema.safeParse({
                    name: "Updated"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteTaskInputSchema", () => {
            it("validates correct input", () => {
                const result = deleteTaskInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing task_gid", () => {
                const result = deleteTaskInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listTasksInputSchema", () => {
            it("validates with project filter", () => {
                const result = listTasksInputSchema.safeParse({
                    project: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = listTasksInputSchema.safeParse({
                    project: PROJECT_GID,
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = listTasksInputSchema.parse({
                    project: PROJECT_GID
                });
                expect(result.limit).toBe(50);
            });

            it("rejects limit above max", () => {
                const result = listTasksInputSchema.safeParse({
                    project: PROJECT_GID,
                    limit: 200
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative limit", () => {
                const result = listTasksInputSchema.safeParse({
                    project: PROJECT_GID,
                    limit: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchTasksInputSchema", () => {
            it("validates minimal input", () => {
                const result = searchTasksInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with search filters", () => {
                const result = searchTasksInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    text: "bug",
                    completed: false,
                    assignee: USER_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with date filters", () => {
                const result = searchTasksInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    "due_on.before": "2024-03-15",
                    "due_on.after": "2024-01-01"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = searchTasksInputSchema.safeParse({
                    text: "search"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addTaskToProjectInputSchema", () => {
            it("validates correct input", () => {
                const result = addTaskToProjectInputSchema.safeParse({
                    task_gid: TASK_GID,
                    project: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional section", () => {
                const result = addTaskToProjectInputSchema.safeParse({
                    task_gid: TASK_GID,
                    project: PROJECT_GID,
                    section: SECTION_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing task_gid", () => {
                const result = addTaskToProjectInputSchema.safeParse({
                    project: PROJECT_GID
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing project", () => {
                const result = addTaskToProjectInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("removeTaskFromProjectInputSchema", () => {
            it("validates correct input", () => {
                const result = removeTaskFromProjectInputSchema.safeParse({
                    task_gid: TASK_GID,
                    project: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = removeTaskFromProjectInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createSubtaskInputSchema", () => {
            it("validates minimal input", () => {
                const result = createSubtaskInputSchema.safeParse({
                    parent_task_gid: TASK_GID,
                    name: "Subtask"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = createSubtaskInputSchema.safeParse({
                    parent_task_gid: TASK_GID,
                    name: "Subtask",
                    notes: "Description",
                    assignee: USER_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createSubtaskInputSchema.safeParse({
                    parent_task_gid: TASK_GID,
                    name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getSubtasksInputSchema", () => {
            it("validates correct input", () => {
                const result = getSubtasksInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = getSubtasksInputSchema.parse({
                    task_gid: TASK_GID
                });
                expect(result.limit).toBe(50);
            });
        });

        describe("addCommentToTaskInputSchema", () => {
            it("validates minimal input", () => {
                const result = addCommentToTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    text: "Comment"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = addCommentToTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    text: "Comment",
                    html_text: "<p>Comment</p>",
                    is_pinned: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty text", () => {
                const result = addCommentToTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    text: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTaskCommentsInputSchema", () => {
            it("validates correct input", () => {
                const result = getTaskCommentsInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = getTaskCommentsInputSchema.parse({
                    task_gid: TASK_GID
                });
                expect(result.limit).toBe(50);
            });
        });

        describe("addTagToTaskInputSchema", () => {
            it("validates correct input", () => {
                const result = addTagToTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    tag: TAG_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing tag", () => {
                const result = addTagToTaskInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("removeTagFromTaskInputSchema", () => {
            it("validates correct input", () => {
                const result = removeTagFromTaskInputSchema.safeParse({
                    task_gid: TASK_GID,
                    tag: TAG_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = removeTagFromTaskInputSchema.safeParse({
                    task_gid: TASK_GID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createProjectInputSchema", () => {
            it("validates minimal input", () => {
                const result = createProjectInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: "Project"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = createProjectInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: "Project",
                    color: "dark-blue",
                    default_view: "board",
                    public: true
                });
                expect(result.success).toBe(true);
            });

            it("validates valid color values", () => {
                const validColors = [
                    "dark-pink",
                    "dark-green",
                    "dark-blue",
                    "light-pink",
                    "light-green"
                ];
                for (const color of validColors) {
                    const result = createProjectInputSchema.safeParse({
                        workspace: WORKSPACE_GID,
                        name: "Project",
                        color
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid color", () => {
                const result = createProjectInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: "Project",
                    color: "invalid-color"
                });
                expect(result.success).toBe(false);
            });

            it("validates valid default_view values", () => {
                const validViews = ["list", "board", "calendar", "timeline"];
                for (const view of validViews) {
                    const result = createProjectInputSchema.safeParse({
                        workspace: WORKSPACE_GID,
                        name: "Project",
                        default_view: view
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects empty name", () => {
                const result = createProjectInputSchema.safeParse({
                    workspace: WORKSPACE_GID,
                    name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getProjectInputSchema", () => {
            it("validates correct input", () => {
                const result = getProjectInputSchema.safeParse({
                    project_gid: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing project_gid", () => {
                const result = getProjectInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateProjectInputSchema", () => {
            it("validates minimal input", () => {
                const result = updateProjectInputSchema.safeParse({
                    project_gid: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with null values for clearing", () => {
                const result = updateProjectInputSchema.safeParse({
                    project_gid: PROJECT_GID,
                    color: null,
                    due_on: null
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteProjectInputSchema", () => {
            it("validates correct input", () => {
                const result = deleteProjectInputSchema.safeParse({
                    project_gid: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing project_gid", () => {
                const result = deleteProjectInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listProjectsInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listProjectsInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with workspace", () => {
                const result = listProjectsInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = listProjectsInputSchema.parse({});
                expect(result.limit).toBe(50);
            });
        });

        describe("createSectionInputSchema", () => {
            it("validates minimal input", () => {
                const result = createSectionInputSchema.safeParse({
                    project: PROJECT_GID,
                    name: "Section"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createSectionInputSchema.safeParse({
                    project: PROJECT_GID,
                    name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getSectionInputSchema", () => {
            it("validates correct input", () => {
                const result = getSectionInputSchema.safeParse({
                    section_gid: SECTION_GID
                });
                expect(result.success).toBe(true);
            });
        });

        describe("updateSectionInputSchema", () => {
            it("validates minimal input", () => {
                const result = updateSectionInputSchema.safeParse({
                    section_gid: SECTION_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with name update", () => {
                const result = updateSectionInputSchema.safeParse({
                    section_gid: SECTION_GID,
                    name: "New Name"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteSectionInputSchema", () => {
            it("validates correct input", () => {
                const result = deleteSectionInputSchema.safeParse({
                    section_gid: SECTION_GID
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listSectionsInputSchema", () => {
            it("validates correct input", () => {
                const result = listSectionsInputSchema.safeParse({
                    project: PROJECT_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing project", () => {
                const result = listSectionsInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listSectionsInputSchema.parse({
                    project: PROJECT_GID
                });
                expect(result.limit).toBe(50);
            });
        });

        describe("addTaskToSectionInputSchema", () => {
            it("validates correct input", () => {
                const result = addTaskToSectionInputSchema.safeParse({
                    section_gid: SECTION_GID,
                    task: TASK_GID
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional insert_before", () => {
                const result = addTaskToSectionInputSchema.safeParse({
                    section_gid: SECTION_GID,
                    task: TASK_GID,
                    insert_before: "other_task"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getCurrentUserInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getCurrentUserInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with opt_fields", () => {
                const result = getCurrentUserInputSchema.safeParse({
                    opt_fields: ["email", "name"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getUserInputSchema", () => {
            it("validates correct input", () => {
                const result = getUserInputSchema.safeParse({
                    user_gid: USER_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing user_gid", () => {
                const result = getUserInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listUsersInputSchema", () => {
            it("validates correct input", () => {
                const result = listUsersInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = listUsersInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listUsersInputSchema.parse({
                    workspace: WORKSPACE_GID
                });
                expect(result.limit).toBe(50);
            });
        });

        describe("listWorkspacesInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listWorkspacesInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = listWorkspacesInputSchema.parse({});
                expect(result.limit).toBe(50);
            });
        });

        describe("getWorkspaceInputSchema", () => {
            it("validates correct input", () => {
                const result = getWorkspaceInputSchema.safeParse({
                    workspace_gid: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace_gid", () => {
                const result = getWorkspaceInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listTeamsInputSchema", () => {
            it("validates correct input", () => {
                const result = listTeamsInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = listTeamsInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listTeamsInputSchema.parse({
                    workspace: WORKSPACE_GID
                });
                expect(result.limit).toBe(50);
            });
        });

        describe("listTagsInputSchema", () => {
            it("validates correct input", () => {
                const result = listTagsInputSchema.safeParse({
                    workspace: WORKSPACE_GID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = listTagsInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("applies default limit", () => {
                const result = listTagsInputSchema.parse({
                    workspace: WORKSPACE_GID
                });
                expect(result.limit).toBe(50);
            });
        });
    });
});
