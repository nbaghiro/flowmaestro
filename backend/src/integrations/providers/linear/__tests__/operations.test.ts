/**
 * Linear Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateIssue, createIssueSchema } from "../operations/createIssue";
import { executeGetIssue, getIssueSchema } from "../operations/getIssue";
import { executeListIssues, listIssuesSchema } from "../operations/listIssues";
import { executeListTeams, listTeamsSchema } from "../operations/listTeams";
import { executeListUsers, listUsersSchema } from "../operations/listUsers";
import {
    executeListWorkflowStates,
    listWorkflowStatesSchema
} from "../operations/listWorkflowStates";
import { executeUpdateIssue, updateIssueSchema } from "../operations/updateIssue";
import type { LinearClient } from "../client/LinearClient";

// Mock LinearClient factory
function createMockLinearClient(): jest.Mocked<LinearClient> {
    return {
        createIssue: jest.fn(),
        updateIssue: jest.fn(),
        getIssue: jest.fn(),
        listIssues: jest.fn(),
        listTeams: jest.fn(),
        listUsers: jest.fn(),
        listWorkflowStates: jest.fn(),
        query: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<LinearClient>;
}

describe("Linear Operation Executors", () => {
    let mockClient: jest.Mocked<LinearClient>;

    beforeEach(() => {
        mockClient = createMockLinearClient();
    });

    describe("executeCreateIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.createIssue.mockResolvedValueOnce({
                issueCreate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Test Issue",
                        identifier: "ENG-42",
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        createdAt: "2024-01-15T10:00:00.000Z"
                    }
                }
            });

            await executeCreateIssue(mockClient, {
                teamId: "team-abc-123",
                title: "Test Issue"
            });

            expect(mockClient.createIssue).toHaveBeenCalledWith({
                teamId: "team-abc-123",
                title: "Test Issue"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createIssue.mockResolvedValueOnce({
                issueCreate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Test Issue",
                        identifier: "ENG-42",
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        createdAt: "2024-01-15T10:00:00.000Z"
                    }
                }
            });

            const result = await executeCreateIssue(mockClient, {
                teamId: "team-abc-123",
                title: "Test Issue"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "issue-uuid-789",
                title: "Test Issue",
                identifier: "ENG-42",
                url: "https://linear.app/demo-team/issue/ENG-42",
                createdAt: "2024-01-15T10:00:00.000Z"
            });
        });

        it("passes all optional params to client", async () => {
            mockClient.createIssue.mockResolvedValueOnce({
                issueCreate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Full Issue",
                        identifier: "ENG-43",
                        url: "https://linear.app/demo-team/issue/ENG-43",
                        createdAt: "2024-01-15T10:00:00.000Z"
                    }
                }
            });

            await executeCreateIssue(mockClient, {
                teamId: "team-abc-123",
                title: "Full Issue",
                description: "A detailed description",
                assigneeId: "user-456",
                priority: 2,
                stateId: "state-todo-123",
                labelIds: ["label-bug-123", "label-ui-456"]
            });

            expect(mockClient.createIssue).toHaveBeenCalledWith({
                teamId: "team-abc-123",
                title: "Full Issue",
                description: "A detailed description",
                assigneeId: "user-456",
                priority: 2,
                stateId: "state-todo-123",
                labelIds: ["label-bug-123", "label-ui-456"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createIssue.mockRejectedValueOnce(new Error("Team not found"));

            const result = await executeCreateIssue(mockClient, {
                teamId: "team-nonexistent",
                title: "Test Issue"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Team not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unexpected response format", async () => {
            mockClient.createIssue.mockResolvedValueOnce({
                issueCreate: {
                    success: false,
                    issue: null
                }
            });

            const result = await executeCreateIssue(mockClient, {
                teamId: "team-abc-123",
                title: "Test Issue"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Linear API returned unexpected response format");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createIssue.mockRejectedValueOnce("string error");

            const result = await executeCreateIssue(mockClient, {
                teamId: "team-abc-123",
                title: "Test Issue"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create Linear issue");
        });
    });

    describe("executeUpdateIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                issueUpdate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Updated Title",
                        identifier: "ENG-42",
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        updatedAt: "2024-01-20T15:30:00.000Z"
                    }
                }
            });

            await executeUpdateIssue(mockClient, {
                id: "issue-uuid-789",
                title: "Updated Title"
            });

            expect(mockClient.updateIssue).toHaveBeenCalledWith({
                id: "issue-uuid-789",
                title: "Updated Title"
            });
        });

        it("returns normalized output on success", async () => {
            const updateResponse = {
                issueUpdate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Updated Title",
                        identifier: "ENG-42",
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        updatedAt: "2024-01-20T15:30:00.000Z"
                    }
                }
            };
            mockClient.updateIssue.mockResolvedValueOnce(updateResponse);

            const result = await executeUpdateIssue(mockClient, {
                id: "issue-uuid-789",
                title: "Updated Title"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updateResponse);
        });

        it("passes all optional params to client", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                issueUpdate: {
                    success: true,
                    issue: {
                        id: "issue-uuid-789",
                        title: "Updated Issue",
                        identifier: "ENG-42",
                        url: "https://linear.app/demo-team/issue/ENG-42",
                        updatedAt: "2024-01-20T15:30:00.000Z"
                    }
                }
            });

            await executeUpdateIssue(mockClient, {
                id: "issue-uuid-789",
                title: "Updated Issue",
                description: "Updated description",
                assigneeId: "user-789",
                priority: 1,
                stateId: "state-done-123",
                labelIds: ["label-feature-123"]
            });

            expect(mockClient.updateIssue).toHaveBeenCalledWith({
                id: "issue-uuid-789",
                title: "Updated Issue",
                description: "Updated description",
                assigneeId: "user-789",
                priority: 1,
                stateId: "state-done-123",
                labelIds: ["label-feature-123"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateIssue.mockRejectedValueOnce(new Error("Issue not found"));

            const result = await executeUpdateIssue(mockClient, {
                id: "nonexistent-issue",
                title: "Updated Title"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Issue not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.updateIssue.mockRejectedValueOnce("string error");

            const result = await executeUpdateIssue(mockClient, {
                id: "issue-uuid-789",
                title: "Updated Title"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update Linear issue");
        });
    });

    describe("executeGetIssue", () => {
        it("calls client with correct params", async () => {
            const issueResponse = {
                issue: {
                    id: "issue-uuid-789",
                    title: "Test Issue",
                    description: "A test issue",
                    identifier: "ENG-42",
                    url: "https://linear.app/demo-team/issue/ENG-42",
                    createdAt: "2024-01-15T10:00:00.000Z",
                    updatedAt: "2024-01-20T15:30:00.000Z",
                    priority: 2,
                    state: {
                        id: "state-progress-123",
                        name: "In Progress",
                        color: "#f2c94c",
                        type: "started"
                    },
                    assignee: {
                        id: "user-456",
                        name: "Jane Developer",
                        email: "jane@example.com"
                    },
                    team: {
                        id: "team-abc-123",
                        name: "Engineering",
                        key: "ENG"
                    },
                    labels: {
                        nodes: []
                    }
                }
            };
            mockClient.getIssue.mockResolvedValueOnce(issueResponse);

            await executeGetIssue(mockClient, { id: "issue-uuid-789" });

            expect(mockClient.getIssue).toHaveBeenCalledWith("issue-uuid-789");
        });

        it("returns normalized output on success", async () => {
            const issueResponse = {
                issue: {
                    id: "issue-uuid-789",
                    title: "Test Issue",
                    description: "A test issue",
                    identifier: "ENG-42",
                    url: "https://linear.app/demo-team/issue/ENG-42",
                    createdAt: "2024-01-15T10:00:00.000Z",
                    updatedAt: "2024-01-20T15:30:00.000Z",
                    priority: 2,
                    state: {
                        id: "state-progress-123",
                        name: "In Progress",
                        color: "#f2c94c",
                        type: "started"
                    },
                    assignee: null,
                    team: {
                        id: "team-abc-123",
                        name: "Engineering",
                        key: "ENG"
                    },
                    labels: {
                        nodes: []
                    }
                }
            };
            mockClient.getIssue.mockResolvedValueOnce(issueResponse);

            const result = await executeGetIssue(mockClient, { id: "issue-uuid-789" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(issueResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getIssue.mockRejectedValueOnce(new Error("Issue not found"));

            const result = await executeGetIssue(mockClient, { id: "nonexistent-issue" });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Issue not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getIssue.mockRejectedValueOnce("string error");

            const result = await executeGetIssue(mockClient, { id: "issue-uuid-789" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get Linear issue");
        });
    });

    describe("executeListIssues", () => {
        it("calls client with default params", async () => {
            const listResponse = {
                issues: {
                    nodes: [],
                    pageInfo: {
                        hasNextPage: false,
                        endCursor: null
                    }
                }
            };
            mockClient.listIssues.mockResolvedValueOnce(listResponse);

            // Parse through schema to apply defaults
            const params = listIssuesSchema.parse({});
            await executeListIssues(mockClient, params);

            expect(mockClient.listIssues).toHaveBeenCalledWith({ first: 50 });
        });

        it("calls client with custom params", async () => {
            const listResponse = {
                issues: {
                    nodes: [],
                    pageInfo: {
                        hasNextPage: false,
                        endCursor: null
                    }
                }
            };
            mockClient.listIssues.mockResolvedValueOnce(listResponse);

            await executeListIssues(mockClient, {
                teamId: "team-abc-123",
                first: 100,
                after: "cursor-123"
            });

            expect(mockClient.listIssues).toHaveBeenCalledWith({
                teamId: "team-abc-123",
                first: 100,
                after: "cursor-123"
            });
        });

        it("returns normalized output on success", async () => {
            const listResponse = {
                issues: {
                    nodes: [
                        {
                            id: "issue-uuid-789",
                            title: "Issue 1",
                            identifier: "ENG-42",
                            url: "https://linear.app/demo-team/issue/ENG-42",
                            priority: 2,
                            createdAt: "2024-01-15T10:00:00.000Z",
                            state: {
                                id: "state-progress-123",
                                name: "In Progress",
                                color: "#f2c94c"
                            },
                            assignee: {
                                id: "user-456",
                                name: "Jane Developer",
                                email: "jane@example.com"
                            },
                            team: {
                                id: "team-abc-123",
                                name: "Engineering"
                            }
                        },
                        {
                            id: "issue-uuid-790",
                            title: "Issue 2",
                            identifier: "ENG-43",
                            url: "https://linear.app/demo-team/issue/ENG-43",
                            priority: 1,
                            createdAt: "2024-01-16T09:00:00.000Z",
                            state: {
                                id: "state-todo-123",
                                name: "Todo",
                                color: "#e2e2e2"
                            },
                            assignee: null,
                            team: {
                                id: "team-abc-123",
                                name: "Engineering"
                            }
                        }
                    ],
                    pageInfo: {
                        hasNextPage: true,
                        endCursor: "cursor-790"
                    }
                }
            };
            mockClient.listIssues.mockResolvedValueOnce(listResponse);

            const params = listIssuesSchema.parse({ teamId: "team-abc-123" });
            const result = await executeListIssues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(listResponse);
        });

        it("returns empty list when no issues", async () => {
            const listResponse = {
                issues: {
                    nodes: [],
                    pageInfo: {
                        hasNextPage: false,
                        endCursor: null
                    }
                }
            };
            mockClient.listIssues.mockResolvedValueOnce(listResponse);

            const params = listIssuesSchema.parse({});
            const result = await executeListIssues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(listResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.listIssues.mockRejectedValueOnce(new Error("Authentication failed"));

            const params = listIssuesSchema.parse({});
            const result = await executeListIssues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listIssues.mockRejectedValueOnce("string error");

            const params = listIssuesSchema.parse({});
            const result = await executeListIssues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list Linear issues");
        });
    });

    describe("executeListTeams", () => {
        it("calls client", async () => {
            const teamsResponse = {
                teams: {
                    nodes: []
                }
            };
            mockClient.listTeams.mockResolvedValueOnce(teamsResponse);

            await executeListTeams(mockClient, {});

            expect(mockClient.listTeams).toHaveBeenCalledWith();
        });

        it("returns normalized output on success", async () => {
            const teamsResponse = {
                teams: {
                    nodes: [
                        {
                            id: "team-abc-123",
                            name: "Engineering",
                            key: "ENG",
                            description: "Engineering team"
                        },
                        {
                            id: "team-def-456",
                            name: "Product",
                            key: "PRD",
                            description: "Product team"
                        }
                    ]
                }
            };
            mockClient.listTeams.mockResolvedValueOnce(teamsResponse);

            const result = await executeListTeams(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(teamsResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.listTeams.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeListTeams(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unauthorized");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listTeams.mockRejectedValueOnce("string error");

            const result = await executeListTeams(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list Linear teams");
        });
    });

    describe("executeListUsers", () => {
        it("calls client", async () => {
            const usersResponse = {
                users: {
                    nodes: []
                }
            };
            mockClient.listUsers.mockResolvedValueOnce(usersResponse);

            await executeListUsers(mockClient, {});

            expect(mockClient.listUsers).toHaveBeenCalledWith();
        });

        it("returns normalized output on success", async () => {
            const usersResponse = {
                users: {
                    nodes: [
                        {
                            id: "user-123",
                            name: "John Doe",
                            email: "john@example.com",
                            active: true
                        },
                        {
                            id: "user-456",
                            name: "Jane Developer",
                            email: "jane@example.com",
                            active: true
                        },
                        {
                            id: "user-789",
                            name: "Bob Inactive",
                            email: "bob@example.com",
                            active: false
                        }
                    ]
                }
            };
            mockClient.listUsers.mockResolvedValueOnce(usersResponse);

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(usersResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.listUsers.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listUsers.mockRejectedValueOnce("string error");

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list Linear users");
        });
    });

    describe("executeListWorkflowStates", () => {
        it("calls client with correct params", async () => {
            const statesResponse = {
                team: {
                    states: {
                        nodes: []
                    }
                }
            };
            mockClient.listWorkflowStates.mockResolvedValueOnce(statesResponse);

            await executeListWorkflowStates(mockClient, { teamId: "team-abc-123" });

            expect(mockClient.listWorkflowStates).toHaveBeenCalledWith("team-abc-123");
        });

        it("returns normalized output on success", async () => {
            const statesResponse = {
                team: {
                    states: {
                        nodes: [
                            {
                                id: "state-backlog-123",
                                name: "Backlog",
                                color: "#bec2c8",
                                type: "backlog",
                                position: 0
                            },
                            {
                                id: "state-todo-123",
                                name: "Todo",
                                color: "#e2e2e2",
                                type: "unstarted",
                                position: 1
                            },
                            {
                                id: "state-progress-123",
                                name: "In Progress",
                                color: "#f2c94c",
                                type: "started",
                                position: 2
                            },
                            {
                                id: "state-review-123",
                                name: "In Review",
                                color: "#bb87fc",
                                type: "started",
                                position: 3
                            },
                            {
                                id: "state-done-123",
                                name: "Done",
                                color: "#5e6ad2",
                                type: "completed",
                                position: 4
                            },
                            {
                                id: "state-cancelled-123",
                                name: "Cancelled",
                                color: "#95a2b3",
                                type: "canceled",
                                position: 5
                            }
                        ]
                    }
                }
            };
            mockClient.listWorkflowStates.mockResolvedValueOnce(statesResponse);

            const result = await executeListWorkflowStates(mockClient, { teamId: "team-abc-123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(statesResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.listWorkflowStates.mockRejectedValueOnce(new Error("Team not found"));

            const result = await executeListWorkflowStates(mockClient, {
                teamId: "nonexistent-team"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Team not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listWorkflowStates.mockRejectedValueOnce("string error");

            const result = await executeListWorkflowStates(mockClient, { teamId: "team-abc-123" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list Linear workflow states");
        });
    });

    describe("schema validation", () => {
        describe("createIssueSchema", () => {
            it("validates minimal input", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "Test Issue"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "Test Issue",
                    description: "A detailed description",
                    assigneeId: "user-456",
                    priority: 2,
                    stateId: "state-todo-123",
                    labelIds: ["label-bug-123"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing teamId", () => {
                const result = createIssueSchema.safeParse({
                    title: "Test Issue"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing title", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty title", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects title exceeding max length", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });

            it("rejects priority below 0", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "Test Issue",
                    priority: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects priority above 4", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "Test Issue",
                    priority: 5
                });
                expect(result.success).toBe(false);
            });

            it("validates all priority levels", () => {
                for (let priority = 0; priority <= 4; priority++) {
                    const result = createIssueSchema.safeParse({
                        teamId: "team-abc-123",
                        title: "Test Issue",
                        priority
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("validates labelIds as array of strings", () => {
                const result = createIssueSchema.safeParse({
                    teamId: "team-abc-123",
                    title: "Test Issue",
                    labelIds: ["label-1", "label-2", "label-3"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("updateIssueSchema", () => {
            it("validates minimal input (id only required)", () => {
                const result = updateIssueSchema.safeParse({
                    id: "issue-uuid-789"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateIssueSchema.safeParse({
                    id: "issue-uuid-789",
                    title: "Updated Title",
                    description: "Updated description",
                    assigneeId: "user-456",
                    priority: 1,
                    stateId: "state-done-123",
                    labelIds: ["label-feature-123"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing id", () => {
                const result = updateIssueSchema.safeParse({
                    title: "Updated Title"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty id", () => {
                const result = updateIssueSchema.safeParse({
                    id: "",
                    title: "Updated Title"
                });
                expect(result.success).toBe(false);
            });

            it("rejects title exceeding max length", () => {
                const result = updateIssueSchema.safeParse({
                    id: "issue-uuid-789",
                    title: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid priority", () => {
                const result = updateIssueSchema.safeParse({
                    id: "issue-uuid-789",
                    priority: 10
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getIssueSchema", () => {
            it("validates with id", () => {
                const result = getIssueSchema.safeParse({
                    id: "issue-uuid-789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing id", () => {
                const result = getIssueSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty id", () => {
                const result = getIssueSchema.safeParse({
                    id: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listIssuesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listIssuesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with teamId", () => {
                const result = listIssuesSchema.safeParse({
                    teamId: "team-abc-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listIssuesSchema.safeParse({
                    first: 100,
                    after: "cursor-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with filter", () => {
                const result = listIssuesSchema.safeParse({
                    filter: {
                        state: { name: { eq: "In Progress" } }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects first below 1", () => {
                const result = listIssuesSchema.safeParse({
                    first: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects first above 250", () => {
                const result = listIssuesSchema.safeParse({
                    first: 251
                });
                expect(result.success).toBe(false);
            });

            it("applies default for first", () => {
                const result = listIssuesSchema.parse({});
                expect(result.first).toBe(50);
            });
        });

        describe("listTeamsSchema", () => {
            it("validates empty input", () => {
                const result = listTeamsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("ignores extra fields", () => {
                const result = listTeamsSchema.safeParse({
                    extraField: "ignored"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listUsersSchema", () => {
            it("validates empty input", () => {
                const result = listUsersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("ignores extra fields", () => {
                const result = listUsersSchema.safeParse({
                    extraField: "ignored"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listWorkflowStatesSchema", () => {
            it("validates with teamId", () => {
                const result = listWorkflowStatesSchema.safeParse({
                    teamId: "team-abc-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing teamId", () => {
                const result = listWorkflowStatesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty teamId", () => {
                const result = listWorkflowStatesSchema.safeParse({
                    teamId: ""
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
