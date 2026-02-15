/**
 * ClickUp Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Task operations
import {
    executeCreateTaskComment,
    createTaskCommentSchema
} from "../operations/comments/createTaskComment";
import {
    executeGetTaskComments,
    getTaskCommentsSchema
} from "../operations/comments/getTaskComments";
import { executeGetLists, getListsSchema } from "../operations/hierarchy/getLists";
import { executeGetSpaces, getSpacesSchema } from "../operations/hierarchy/getSpaces";
import { executeGetWorkspaces, getWorkspacesSchema } from "../operations/hierarchy/getWorkspaces";
import { executeCreateTask, createTaskSchema } from "../operations/tasks/createTask";
import { executeDeleteTask, deleteTaskSchema } from "../operations/tasks/deleteTask";
import { executeGetTask, getTaskSchema } from "../operations/tasks/getTask";
import { executeGetTasks, getTasksSchema } from "../operations/tasks/getTasks";
import { executeUpdateTask, updateTaskSchema } from "../operations/tasks/updateTask";

// Comment operations

// Hierarchy operations

import type { ClickUpClient } from "../client/ClickUpClient";
import type {
    ClickUpTask,
    ClickUpTasksResponse,
    ClickUpCommentsResponse,
    ClickUpComment,
    ClickUpListsResponse,
    ClickUpSpacesResponse,
    ClickUpTeamsResponse
} from "../operations/types";

// Mock ClickUpClient factory
function createMockClickUpClient(): jest.Mocked<ClickUpClient> {
    return {
        // Task methods
        createTask: jest.fn(),
        deleteTask: jest.fn(),
        getTask: jest.fn(),
        getTasks: jest.fn(),
        updateTask: jest.fn(),
        // Comment methods
        createTaskComment: jest.fn(),
        getTaskComments: jest.fn(),
        // Hierarchy methods
        getWorkspaces: jest.fn(),
        getSpaces: jest.fn(),
        getFolderlessLists: jest.fn(),
        getListsInFolder: jest.fn(),
        // User methods
        getCurrentUser: jest.fn(),
        // Base HTTP methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ClickUpClient>;
}

// Helper to create a mock ClickUp task
function createMockTask(overrides: Partial<ClickUpTask> = {}): ClickUpTask {
    return {
        id: "abc123xyz",
        custom_id: "PROJ-142",
        name: "Implement user authentication",
        text_content: "Add OAuth2 authentication flow",
        description: "Add OAuth2 authentication flow with Google and GitHub support.",
        status: {
            status: "in progress",
            type: "custom",
            orderindex: 1,
            color: "#4194f6"
        },
        orderindex: "1",
        date_created: "1706540000000",
        date_updated: "1706640000000",
        archived: false,
        creator: {
            id: 12345678,
            username: "sarah.chen",
            email: "sarah.chen@acmecorp.com",
            color: "#7B68EE"
        },
        assignees: [
            {
                id: 12345678,
                username: "sarah.chen",
                email: "sarah.chen@acmecorp.com",
                color: "#7B68EE"
            }
        ],
        watchers: [],
        checklists: [],
        tags: [{ name: "backend", tag_fg: "#fff", tag_bg: "#000" }],
        priority: {
            id: "2",
            priority: "high",
            color: "#f9d900",
            orderindex: "1"
        },
        due_date: "1707436800000",
        start_date: "1706832000000",
        team_id: "workspace-9001",
        url: "https://app.clickup.com/t/abc123xyz",
        list: { id: "list-90030001", name: "Sprint 23 - API Development", access: true },
        folder: { id: "folder-90020001", name: "Sprints", access: true },
        space: { id: "space-90010001" },
        ...overrides
    };
}

// Helper to create a mock ClickUp comment
function createMockComment(overrides: Partial<ClickUpComment> = {}): ClickUpComment {
    return {
        id: "comment-90080001",
        comment: [{ text: "Great progress!", type: "text" }],
        comment_text: "Great progress!",
        user: {
            id: 12345678,
            username: "sarah.chen",
            email: "sarah.chen@acmecorp.com",
            color: "#7B68EE"
        },
        resolved: false,
        reactions: [],
        date: "1706640000000",
        ...overrides
    };
}

describe("ClickUp Operation Executors", () => {
    let mockClient: jest.Mocked<ClickUpClient>;

    beforeEach(() => {
        mockClient = createMockClickUpClient();
    });

    // =========================================================================
    // Task Operations
    // =========================================================================

    describe("executeCreateTask", () => {
        it("calls client with correct params for minimal input", async () => {
            const mockTask = createMockTask();
            mockClient.createTask.mockResolvedValueOnce(mockTask);

            await executeCreateTask(mockClient, {
                listId: "list-90030001",
                name: "Implement user authentication"
            });

            expect(mockClient.createTask).toHaveBeenCalledWith("list-90030001", {
                name: "Implement user authentication"
            });
        });

        it("calls client with all optional params", async () => {
            const mockTask = createMockTask();
            mockClient.createTask.mockResolvedValueOnce(mockTask);

            await executeCreateTask(mockClient, {
                listId: "list-90030001",
                name: "Implement user authentication",
                description: "Add OAuth2 authentication",
                assignees: [12345678],
                priority: 2,
                dueDate: 1707436800000,
                startDate: 1706832000000,
                status: "to do",
                tags: ["backend", "security"]
            });

            expect(mockClient.createTask).toHaveBeenCalledWith("list-90030001", {
                name: "Implement user authentication",
                description: "Add OAuth2 authentication",
                assignees: [12345678],
                priority: 2,
                due_date: 1707436800000,
                start_date: 1706832000000,
                status: "to do",
                tags: ["backend", "security"]
            });
        });

        it("returns normalized output on success", async () => {
            const mockTask = createMockTask();
            mockClient.createTask.mockResolvedValueOnce(mockTask);

            const result = await executeCreateTask(mockClient, {
                listId: "list-90030001",
                name: "Implement user authentication"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "abc123xyz",
                name: "Implement user authentication",
                status: "in progress",
                url: "https://app.clickup.com/t/abc123xyz",
                dateCreated: "1706540000000",
                creator: "sarah.chen",
                list: "Sprint 23 - API Development"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createTask.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeCreateTask(mockClient, {
                listId: "nonexistent-list",
                name: "Test task"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("List not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createTask.mockRejectedValueOnce("string error");

            const result = await executeCreateTask(mockClient, {
                listId: "list-90030001",
                name: "Test task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create task");
        });
    });

    describe("executeDeleteTask", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteTask.mockResolvedValueOnce();

            await executeDeleteTask(mockClient, {
                taskId: "abc123xyz"
            });

            expect(mockClient.deleteTask).toHaveBeenCalledWith("abc123xyz");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteTask.mockResolvedValueOnce();

            const result = await executeDeleteTask(mockClient, {
                taskId: "abc123xyz"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                taskId: "abc123xyz"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteTask.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeDeleteTask(mockClient, {
                taskId: "nonexistent-task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeGetTask", () => {
        it("calls client with correct params", async () => {
            const mockTask = createMockTask();
            mockClient.getTask.mockResolvedValueOnce(mockTask);

            await executeGetTask(mockClient, {
                taskId: "abc123xyz"
            });

            expect(mockClient.getTask).toHaveBeenCalledWith("abc123xyz");
        });

        it("returns normalized output on success", async () => {
            const mockTask = createMockTask();
            mockClient.getTask.mockResolvedValueOnce(mockTask);

            const result = await executeGetTask(mockClient, {
                taskId: "abc123xyz"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "abc123xyz",
                customId: "PROJ-142",
                name: "Implement user authentication",
                status: "in progress",
                statusColor: "#4194f6",
                priority: {
                    id: "2",
                    priority: "high",
                    color: "#f9d900"
                },
                creator: {
                    id: 12345678,
                    username: "sarah.chen",
                    email: "sarah.chen@acmecorp.com"
                },
                assignees: [
                    {
                        id: 12345678,
                        username: "sarah.chen",
                        email: "sarah.chen@acmecorp.com"
                    }
                ],
                tags: ["backend"],
                dueDate: "1707436800000",
                startDate: "1706832000000",
                dateCreated: "1706540000000",
                dateUpdated: "1706640000000",
                archived: false,
                url: "https://app.clickup.com/t/abc123xyz",
                list: {
                    id: "list-90030001",
                    name: "Sprint 23 - API Development"
                },
                folder: {
                    id: "folder-90020001",
                    name: "Sprints"
                },
                space: {
                    id: "space-90010001"
                }
            });
        });

        it("handles task without optional fields", async () => {
            const mockTask = createMockTask({
                priority: undefined,
                creator: undefined,
                assignees: [],
                tags: [],
                list: undefined,
                folder: undefined,
                space: undefined
            } as unknown as Partial<ClickUpTask>);
            mockClient.getTask.mockResolvedValueOnce(mockTask);

            const result = await executeGetTask(mockClient, {
                taskId: "abc123xyz"
            });

            expect(result.success).toBe(true);
            expect(result.data?.priority).toBeNull();
            expect(result.data?.creator).toBeNull();
            expect(result.data?.assignees).toEqual([]);
            expect(result.data?.tags).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.getTask.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeGetTask(mockClient, {
                taskId: "nonexistent-task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetTasks", () => {
        it("calls client with minimal params", async () => {
            const mockResponse: ClickUpTasksResponse = {
                tasks: [createMockTask()],
                last_page: true
            };
            mockClient.getTasks.mockResolvedValueOnce(mockResponse);

            await executeGetTasks(mockClient, {
                listId: "list-90030001"
            });

            expect(mockClient.getTasks).toHaveBeenCalledWith("list-90030001", {
                archived: undefined,
                page: undefined,
                subtasks: undefined,
                statuses: undefined,
                assignees: undefined
            });
        });

        it("calls client with all optional params", async () => {
            const mockResponse: ClickUpTasksResponse = {
                tasks: [createMockTask()],
                last_page: false
            };
            mockClient.getTasks.mockResolvedValueOnce(mockResponse);

            await executeGetTasks(mockClient, {
                listId: "list-90030001",
                archived: true,
                page: 1,
                subtasks: true,
                statuses: ["in progress", "review"],
                assignees: ["12345678"]
            });

            expect(mockClient.getTasks).toHaveBeenCalledWith("list-90030001", {
                archived: true,
                page: 1,
                subtasks: true,
                statuses: ["in progress", "review"],
                assignees: ["12345678"]
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: ClickUpTasksResponse = {
                tasks: [createMockTask(), createMockTask({ id: "def456", name: "Second task" })],
                last_page: true
            };
            mockClient.getTasks.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTasks(mockClient, {
                listId: "list-90030001"
            });

            expect(result.success).toBe(true);
            expect(result.data?.tasks).toHaveLength(2);
            expect(result.data?.lastPage).toBe(true);
            expect(result.data?.count).toBe(2);
            expect(result.data?.tasks[0]).toMatchObject({
                id: "abc123xyz",
                customId: "PROJ-142",
                name: "Implement user authentication",
                status: "in progress",
                priority: "high"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getTasks.mockRejectedValueOnce(new Error("List not found"));

            const result = await executeGetTasks(mockClient, {
                listId: "nonexistent-list"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("List not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateTask", () => {
        it("calls client with name update", async () => {
            const mockTask = createMockTask({ name: "Updated task name" });
            mockClient.updateTask.mockResolvedValueOnce(mockTask);

            await executeUpdateTask(mockClient, {
                taskId: "abc123xyz",
                name: "Updated task name"
            });

            expect(mockClient.updateTask).toHaveBeenCalledWith("abc123xyz", {
                name: "Updated task name"
            });
        });

        it("calls client with all optional params", async () => {
            const mockTask = createMockTask();
            mockClient.updateTask.mockResolvedValueOnce(mockTask);

            await executeUpdateTask(mockClient, {
                taskId: "abc123xyz",
                name: "Updated name",
                description: "Updated description",
                assignees: { add: [12345678], rem: [87654321] },
                priority: 1,
                dueDate: 1707523200000,
                startDate: 1706918400000,
                status: "complete"
            });

            expect(mockClient.updateTask).toHaveBeenCalledWith("abc123xyz", {
                name: "Updated name",
                description: "Updated description",
                assignees: { add: [12345678], rem: [87654321] },
                priority: 1,
                due_date: 1707523200000,
                start_date: 1706918400000,
                status: "complete"
            });
        });

        it("returns normalized output on success", async () => {
            const mockTask = createMockTask({
                name: "Updated task name",
                date_updated: "1706730000000"
            });
            mockClient.updateTask.mockResolvedValueOnce(mockTask);

            const result = await executeUpdateTask(mockClient, {
                taskId: "abc123xyz",
                name: "Updated task name"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "abc123xyz",
                name: "Updated task name",
                status: "in progress",
                priority: "high",
                url: "https://app.clickup.com/t/abc123xyz",
                dateUpdated: "1706730000000",
                assignees: [{ id: 12345678, username: "sarah.chen" }]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateTask.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeUpdateTask(mockClient, {
                taskId: "nonexistent-task",
                name: "Updated name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // =========================================================================
    // Comment Operations
    // =========================================================================

    describe("executeCreateTaskComment", () => {
        it("calls client with correct params", async () => {
            const mockComment = createMockComment();
            mockClient.createTaskComment.mockResolvedValueOnce(mockComment);

            await executeCreateTaskComment(mockClient, {
                taskId: "abc123xyz",
                commentText: "Great progress!"
            });

            expect(mockClient.createTaskComment).toHaveBeenCalledWith("abc123xyz", {
                comment_text: "Great progress!"
            });
        });

        it("calls client with optional assignee", async () => {
            const mockComment = createMockComment({
                assignee: {
                    id: 87654321,
                    username: "mike.johnson",
                    email: "mike.johnson@acmecorp.com",
                    color: "#FF6B6B"
                }
            });
            mockClient.createTaskComment.mockResolvedValueOnce(mockComment);

            await executeCreateTaskComment(mockClient, {
                taskId: "abc123xyz",
                commentText: "Please review this",
                assignee: 87654321
            });

            expect(mockClient.createTaskComment).toHaveBeenCalledWith("abc123xyz", {
                comment_text: "Please review this",
                assignee: 87654321
            });
        });

        it("returns normalized output on success", async () => {
            const mockComment = createMockComment();
            mockClient.createTaskComment.mockResolvedValueOnce(mockComment);

            const result = await executeCreateTaskComment(mockClient, {
                taskId: "abc123xyz",
                commentText: "Great progress!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "comment-90080001",
                commentText: "Great progress!",
                user: {
                    id: 12345678,
                    username: "sarah.chen",
                    email: "sarah.chen@acmecorp.com"
                },
                date: "1706640000000",
                resolved: false,
                assignee: null
            });
        });

        it("handles comment with assignee", async () => {
            const mockComment = createMockComment({
                assignee: {
                    id: 87654321,
                    username: "mike.johnson",
                    email: "mike.johnson@acmecorp.com",
                    color: "#FF6B6B"
                }
            });
            mockClient.createTaskComment.mockResolvedValueOnce(mockComment);

            const result = await executeCreateTaskComment(mockClient, {
                taskId: "abc123xyz",
                commentText: "Please review",
                assignee: 87654321
            });

            expect(result.success).toBe(true);
            expect(result.data?.assignee).toEqual({
                id: 87654321,
                username: "mike.johnson"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createTaskComment.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeCreateTaskComment(mockClient, {
                taskId: "nonexistent-task",
                commentText: "This will fail"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetTaskComments", () => {
        it("calls client with correct params", async () => {
            const mockResponse: ClickUpCommentsResponse = {
                comments: [createMockComment()]
            };
            mockClient.getTaskComments.mockResolvedValueOnce(mockResponse);

            await executeGetTaskComments(mockClient, {
                taskId: "abc123xyz"
            });

            expect(mockClient.getTaskComments).toHaveBeenCalledWith("abc123xyz");
        });

        it("returns normalized output on success", async () => {
            const mockResponse: ClickUpCommentsResponse = {
                comments: [
                    createMockComment(),
                    createMockComment({
                        id: "comment-90080002",
                        comment_text: "Second comment",
                        resolved: true,
                        reactions: [
                            {
                                reaction: "thumbsup",
                                date: "1706650000000",
                                user: {
                                    id: 87654321,
                                    username: "mike.johnson",
                                    email: "mike@test.com",
                                    color: "#FF6B6B"
                                }
                            }
                        ]
                    })
                ]
            };
            mockClient.getTaskComments.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTaskComments(mockClient, {
                taskId: "abc123xyz"
            });

            expect(result.success).toBe(true);
            expect(result.data?.comments).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.comments[0]).toMatchObject({
                id: "comment-90080001",
                commentText: "Great progress!",
                resolved: false
            });
            expect(result.data?.comments[1].reactions).toEqual([
                { reaction: "thumbsup", user: "mike.johnson" }
            ]);
        });

        it("handles empty comments array", async () => {
            const mockResponse: ClickUpCommentsResponse = {
                comments: []
            };
            mockClient.getTaskComments.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTaskComments(mockClient, {
                taskId: "abc123xyz"
            });

            expect(result.success).toBe(true);
            expect(result.data?.comments).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.getTaskComments.mockRejectedValueOnce(new Error("Task not found"));

            const result = await executeGetTaskComments(mockClient, {
                taskId: "nonexistent-task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Task not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // =========================================================================
    // Hierarchy Operations
    // =========================================================================

    describe("executeGetWorkspaces", () => {
        it("calls client with no params", async () => {
            const mockResponse: ClickUpTeamsResponse = {
                teams: [
                    {
                        id: "workspace-9001",
                        name: "Acme Corporation",
                        color: "#7B68EE",
                        avatar: "https://attachments.clickup.com/avatar/acme.png",
                        members: [
                            {
                                user: {
                                    id: 12345678,
                                    username: "sarah.chen",
                                    email: "sarah@test.com",
                                    color: "#7B68EE"
                                }
                            }
                        ]
                    }
                ]
            };
            mockClient.getWorkspaces.mockResolvedValueOnce(mockResponse);

            await executeGetWorkspaces(mockClient, {});

            expect(mockClient.getWorkspaces).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            const mockResponse: ClickUpTeamsResponse = {
                teams: [
                    {
                        id: "workspace-9001",
                        name: "Acme Corporation",
                        color: "#7B68EE",
                        avatar: "https://attachments.clickup.com/avatar/acme.png",
                        members: [
                            {
                                user: {
                                    id: 1,
                                    username: "user1",
                                    email: "user1@test.com",
                                    color: "#7B68EE"
                                }
                            },
                            {
                                user: {
                                    id: 2,
                                    username: "user2",
                                    email: "user2@test.com",
                                    color: "#FF6B6B"
                                }
                            }
                        ]
                    },
                    {
                        id: "workspace-9002",
                        name: "Side Project",
                        color: "#FF6B6B",
                        members: []
                    }
                ]
            };
            mockClient.getWorkspaces.mockResolvedValueOnce(mockResponse);

            const result = await executeGetWorkspaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.workspaces).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.workspaces[0]).toEqual({
                id: "workspace-9001",
                name: "Acme Corporation",
                color: "#7B68EE",
                avatar: "https://attachments.clickup.com/avatar/acme.png",
                memberCount: 2
            });
            expect(result.data?.workspaces[1]).toEqual({
                id: "workspace-9002",
                name: "Side Project",
                color: "#FF6B6B",
                avatar: undefined,
                memberCount: 0
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getWorkspaces.mockRejectedValueOnce(
                new Error("Invalid or expired API token")
            );

            const result = await executeGetWorkspaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid or expired API token");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetSpaces", () => {
        it("calls client with correct params", async () => {
            const mockResponse: ClickUpSpacesResponse = {
                spaces: []
            };
            mockClient.getSpaces.mockResolvedValueOnce(mockResponse);

            await executeGetSpaces(mockClient, {
                workspaceId: "workspace-9001"
            });

            expect(mockClient.getSpaces).toHaveBeenCalledWith("workspace-9001", undefined);
        });

        it("calls client with archived param", async () => {
            const mockResponse: ClickUpSpacesResponse = {
                spaces: []
            };
            mockClient.getSpaces.mockResolvedValueOnce(mockResponse);

            await executeGetSpaces(mockClient, {
                workspaceId: "workspace-9001",
                archived: true
            });

            expect(mockClient.getSpaces).toHaveBeenCalledWith("workspace-9001", true);
        });

        it("returns normalized output on success", async () => {
            const mockResponse: ClickUpSpacesResponse = {
                spaces: [
                    {
                        id: "space-90010001",
                        name: "Engineering",
                        private: false,
                        archived: false,
                        multiple_assignees: true,
                        statuses: [
                            { status: "to do", type: "open", orderindex: 0, color: "#d3d3d3" },
                            {
                                status: "in progress",
                                type: "custom",
                                orderindex: 1,
                                color: "#4194f6"
                            },
                            {
                                status: "complete",
                                type: "closed",
                                orderindex: 2,
                                color: "#6bc950"
                            }
                        ],
                        features: {
                            due_dates: { enabled: true },
                            sprints: { enabled: true },
                            time_tracking: { enabled: true },
                            points: { enabled: true },
                            custom_items: { enabled: false },
                            priorities: { enabled: true },
                            tags: { enabled: true },
                            time_estimates: { enabled: false },
                            check_unresolved: { enabled: false },
                            zoom: { enabled: false },
                            milestones: { enabled: true },
                            remap_dependencies: { enabled: false },
                            dependency_warning: { enabled: false },
                            portfolios: { enabled: false }
                        }
                    }
                ]
            };
            mockClient.getSpaces.mockResolvedValueOnce(mockResponse);

            const result = await executeGetSpaces(mockClient, {
                workspaceId: "workspace-9001"
            });

            expect(result.success).toBe(true);
            expect(result.data?.spaces).toHaveLength(1);
            expect(result.data?.count).toBe(1);
            expect(result.data?.spaces[0]).toEqual({
                id: "space-90010001",
                name: "Engineering",
                private: false,
                archived: false,
                statuses: [
                    { status: "to do", type: "open", color: "#d3d3d3" },
                    { status: "in progress", type: "custom", color: "#4194f6" },
                    { status: "complete", type: "closed", color: "#6bc950" }
                ],
                features: {
                    dueDates: true,
                    sprints: true,
                    timeTracking: true,
                    points: true,
                    priorities: true,
                    tags: true,
                    milestones: true
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getSpaces.mockRejectedValueOnce(new Error("Workspace not found"));

            const result = await executeGetSpaces(mockClient, {
                workspaceId: "nonexistent-workspace"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workspace not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetLists", () => {
        it("returns validation error when neither folderId nor spaceId provided", async () => {
            const result = await executeGetLists(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("Either folderId or spaceId must be provided");
            expect(result.error?.retryable).toBe(false);
        });

        it("calls getListsInFolder when folderId provided", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: []
            };
            mockClient.getListsInFolder.mockResolvedValueOnce(mockResponse);

            await executeGetLists(mockClient, {
                folderId: "folder-90020001"
            });

            expect(mockClient.getListsInFolder).toHaveBeenCalledWith("folder-90020001", undefined);
            expect(mockClient.getFolderlessLists).not.toHaveBeenCalled();
        });

        it("calls getFolderlessLists when spaceId provided", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: []
            };
            mockClient.getFolderlessLists.mockResolvedValueOnce(mockResponse);

            await executeGetLists(mockClient, {
                spaceId: "space-90010001"
            });

            expect(mockClient.getFolderlessLists).toHaveBeenCalledWith("space-90010001", undefined);
            expect(mockClient.getListsInFolder).not.toHaveBeenCalled();
        });

        it("prefers folderId over spaceId when both provided", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: []
            };
            mockClient.getListsInFolder.mockResolvedValueOnce(mockResponse);

            await executeGetLists(mockClient, {
                folderId: "folder-90020001",
                spaceId: "space-90010001"
            });

            expect(mockClient.getListsInFolder).toHaveBeenCalledWith("folder-90020001", undefined);
            expect(mockClient.getFolderlessLists).not.toHaveBeenCalled();
        });

        it("passes archived param correctly", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: []
            };
            mockClient.getListsInFolder.mockResolvedValueOnce(mockResponse);

            await executeGetLists(mockClient, {
                folderId: "folder-90020001",
                archived: true
            });

            expect(mockClient.getListsInFolder).toHaveBeenCalledWith("folder-90020001", true);
        });

        it("returns normalized output on success", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: [
                    {
                        id: "list-90030001",
                        name: "Sprint 23 - API Development",
                        orderindex: 0,
                        content: "Tasks for API development",
                        status: { status: "green", color: "#6bc950" },
                        priority: { priority: "high", color: "#f9d900" },
                        task_count: 12,
                        due_date: "1707436800000",
                        start_date: "1706832000000",
                        archived: false,
                        folder: {
                            id: "folder-90020001",
                            name: "Sprints",
                            hidden: false,
                            access: true
                        },
                        space: { id: "space-90010001", name: "Engineering", access: true },
                        statuses: [
                            { status: "to do", type: "open", orderindex: 0, color: "#d3d3d3" },
                            {
                                status: "complete",
                                type: "closed",
                                orderindex: 1,
                                color: "#6bc950"
                            }
                        ]
                    }
                ]
            };
            mockClient.getListsInFolder.mockResolvedValueOnce(mockResponse);

            const result = await executeGetLists(mockClient, {
                folderId: "folder-90020001"
            });

            expect(result.success).toBe(true);
            expect(result.data?.lists).toHaveLength(1);
            expect(result.data?.count).toBe(1);
            expect(result.data?.lists[0]).toMatchObject({
                id: "list-90030001",
                name: "Sprint 23 - API Development",
                orderindex: 0,
                content: "Tasks for API development",
                status: { status: "green", color: "#6bc950" },
                priority: { priority: "high", color: "#f9d900" },
                taskCount: 12,
                dueDate: "1707436800000",
                startDate: "1706832000000",
                archived: false,
                folder: { id: "folder-90020001", name: "Sprints" },
                space: { id: "space-90010001", name: "Engineering" },
                statuses: [
                    { status: "to do", type: "open", color: "#d3d3d3" },
                    { status: "complete", type: "closed", color: "#6bc950" }
                ]
            });
        });

        it("handles lists without optional fields", async () => {
            const mockResponse: ClickUpListsResponse = {
                lists: [
                    {
                        id: "list-90030001",
                        name: "Basic List",
                        orderindex: 0,
                        archived: false
                    }
                ]
            };
            mockClient.getFolderlessLists.mockResolvedValueOnce(mockResponse);

            const result = await executeGetLists(mockClient, {
                spaceId: "space-90010001"
            });

            expect(result.success).toBe(true);
            expect(result.data?.lists[0].status).toBeNull();
            expect(result.data?.lists[0].priority).toBeNull();
            expect(result.data?.lists[0].folder).toBeNull();
            expect(result.data?.lists[0].space).toBeNull();
        });

        it("returns error on client failure", async () => {
            mockClient.getListsInFolder.mockRejectedValueOnce(new Error("Folder not found"));

            const result = await executeGetLists(mockClient, {
                folderId: "nonexistent-folder"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Folder not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // =========================================================================
    // Schema Validation Tests
    // =========================================================================

    describe("schema validation", () => {
        describe("createTaskSchema", () => {
            it("validates minimal input", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: "Test task"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: "Test task",
                    description: "Task description",
                    assignees: [12345678],
                    priority: 2,
                    dueDate: 1707436800000,
                    startDate: 1706832000000,
                    status: "to do",
                    tags: ["backend", "security"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing listId", () => {
                const result = createTaskSchema.safeParse({
                    name: "Test task"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing name", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty name", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects name exceeding 255 characters", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: "A".repeat(256)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid priority (too low)", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: "Test task",
                    priority: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid priority (too high)", () => {
                const result = createTaskSchema.safeParse({
                    listId: "list-123",
                    name: "Test task",
                    priority: 5
                });
                expect(result.success).toBe(false);
            });

            it("accepts valid priority values (1-4)", () => {
                for (const priority of [1, 2, 3, 4]) {
                    const result = createTaskSchema.safeParse({
                        listId: "list-123",
                        name: "Test task",
                        priority
                    });
                    expect(result.success).toBe(true);
                }
            });
        });

        describe("deleteTaskSchema", () => {
            it("validates input with taskId", () => {
                const result = deleteTaskSchema.safeParse({
                    taskId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = deleteTaskSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getTaskSchema", () => {
            it("validates input with taskId", () => {
                const result = getTaskSchema.safeParse({
                    taskId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = getTaskSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getTasksSchema", () => {
            it("validates minimal input", () => {
                const result = getTasksSchema.safeParse({
                    listId: "list-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getTasksSchema.safeParse({
                    listId: "list-123",
                    archived: true,
                    page: 0,
                    subtasks: true,
                    statuses: ["in progress", "review"],
                    assignees: ["12345678"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing listId", () => {
                const result = getTasksSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects negative page number", () => {
                const result = getTasksSchema.safeParse({
                    listId: "list-123",
                    page: -1
                });
                expect(result.success).toBe(false);
            });

            it("accepts page 0", () => {
                const result = getTasksSchema.safeParse({
                    listId: "list-123",
                    page: 0
                });
                expect(result.success).toBe(true);
            });
        });

        describe("updateTaskSchema", () => {
            it("validates minimal input with taskId only", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "abc123xyz",
                    name: "Updated name",
                    description: "Updated description",
                    assignees: { add: [12345678], rem: [87654321] },
                    priority: 1,
                    dueDate: 1707436800000,
                    startDate: 1706832000000,
                    status: "complete"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = updateTaskSchema.safeParse({
                    name: "Updated name"
                });
                expect(result.success).toBe(false);
            });

            it("validates assignees with only add", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "abc123xyz",
                    assignees: { add: [12345678] }
                });
                expect(result.success).toBe(true);
            });

            it("validates assignees with only rem", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "abc123xyz",
                    assignees: { rem: [87654321] }
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid priority", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "abc123xyz",
                    priority: 10
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createTaskCommentSchema", () => {
            it("validates minimal input", () => {
                const result = createTaskCommentSchema.safeParse({
                    taskId: "abc123xyz",
                    commentText: "Great progress!"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with assignee", () => {
                const result = createTaskCommentSchema.safeParse({
                    taskId: "abc123xyz",
                    commentText: "Please review",
                    assignee: 87654321
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = createTaskCommentSchema.safeParse({
                    commentText: "Comment text"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing commentText", () => {
                const result = createTaskCommentSchema.safeParse({
                    taskId: "abc123xyz"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty commentText", () => {
                const result = createTaskCommentSchema.safeParse({
                    taskId: "abc123xyz",
                    commentText: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTaskCommentsSchema", () => {
            it("validates input with taskId", () => {
                const result = getTaskCommentsSchema.safeParse({
                    taskId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = getTaskCommentsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getWorkspacesSchema", () => {
            it("validates empty input (no params required)", () => {
                const result = getWorkspacesSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getSpacesSchema", () => {
            it("validates minimal input", () => {
                const result = getSpacesSchema.safeParse({
                    workspaceId: "workspace-9001"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with archived", () => {
                const result = getSpacesSchema.safeParse({
                    workspaceId: "workspace-9001",
                    archived: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspaceId", () => {
                const result = getSpacesSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getListsSchema", () => {
            it("validates input with folderId", () => {
                const result = getListsSchema.safeParse({
                    folderId: "folder-90020001"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with spaceId", () => {
                const result = getListsSchema.safeParse({
                    spaceId: "space-90010001"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with both folderId and spaceId", () => {
                const result = getListsSchema.safeParse({
                    folderId: "folder-90020001",
                    spaceId: "space-90010001"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with archived", () => {
                const result = getListsSchema.safeParse({
                    folderId: "folder-90020001",
                    archived: true
                });
                expect(result.success).toBe(true);
            });

            it("validates empty input (runtime validation happens in executor)", () => {
                // Note: The schema allows empty input, but the executor validates
                // that at least one of folderId or spaceId is provided
                const result = getListsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });
    });
});
