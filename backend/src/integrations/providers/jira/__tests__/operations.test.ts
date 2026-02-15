/**
 * Jira Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Issue Operations
import { executeGetCustomFieldConfigs } from "../operations/fields/getCustomFieldConfigs";
import { executeListFields } from "../operations/fields/listFields";
import { executeAddAttachment } from "../operations/issues/addAttachment";
import { executeAddComment } from "../operations/issues/addComment";
import { executeAssignIssue } from "../operations/issues/assignIssue";
import { executeCreateIssue } from "../operations/issues/createIssue";
import { executeDeleteIssue } from "../operations/issues/deleteIssue";
import { executeGetComments } from "../operations/issues/getComments";
import { executeGetIssue } from "../operations/issues/getIssue";
import { executeLinkIssues } from "../operations/issues/linkIssues";
import { executeSearchIssues } from "../operations/issues/searchIssues";
import { executeTransitionIssue } from "../operations/issues/transitionIssue";
import { executeUpdateIssue } from "../operations/issues/updateIssue";

// Project Operations
import { executeGetIssueTypes } from "../operations/projects/getIssueTypes";
import { executeGetProject } from "../operations/projects/getProject";
import { executeListProjects } from "../operations/projects/listProjects";

// Field Operations

// User Operations
import { executeGetCurrentUser } from "../operations/users/getCurrentUser";
import { executeSearchUsers } from "../operations/users/searchUsers";

// Schemas
import {
    createIssueInputSchema,
    getIssueInputSchema,
    updateIssueInputSchema,
    searchIssuesInputSchema,
    deleteIssueInputSchema,
    transitionIssueInputSchema,
    assignIssueInputSchema,
    addCommentInputSchema,
    getCommentsInputSchema,
    addAttachmentInputSchema,
    linkIssuesInputSchema,
    listProjectsInputSchema,
    getProjectInputSchema,
    getIssueTypesInputSchema,
    listFieldsInputSchema,
    getCustomFieldConfigsInputSchema,
    searchUsersInputSchema,
    getCurrentUserInputSchema
} from "../schemas";

import type { JiraClient } from "../client/JiraClient";

// Mock JiraClient factory
function createMockJiraClient(): jest.Mocked<JiraClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        uploadAttachment: jest.fn()
    } as unknown as jest.Mocked<JiraClient>;
}

describe("Jira Operation Executors", () => {
    let mockClient: jest.Mocked<JiraClient>;

    beforeEach(() => {
        mockClient = createMockJiraClient();
    });

    // ============================================================================
    // ISSUE OPERATIONS
    // ============================================================================

    describe("executeCreateIssue", () => {
        it("calls client with correct params for minimal issue", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "10001",
                key: "TEST-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001"
            });

            await executeCreateIssue(mockClient, {
                project: { key: "TEST" },
                issuetype: { name: "Task" },
                summary: "Test Issue"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issue", {
                fields: {
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "Test Issue"
                }
            });
        });

        it("calls client with all optional fields", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "10001",
                key: "TEST-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001"
            });

            await executeCreateIssue(mockClient, {
                project: { key: "TEST" },
                issuetype: { name: "Task" },
                summary: "Test Issue",
                description: "Description text",
                assignee: { accountId: "user-123" },
                priority: { name: "High" },
                labels: ["bug", "urgent"],
                components: [{ name: "Backend" }],
                parent: { key: "TEST-100" },
                customFields: { customfield_10001: "value" }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issue", {
                fields: {
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "Test Issue",
                    description: "Description text",
                    assignee: { accountId: "user-123" },
                    priority: { name: "High" },
                    labels: ["bug", "urgent"],
                    components: [{ name: "Backend" }],
                    parent: { key: "TEST-100" },
                    customfield_10001: "value"
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "10001",
                key: "TEST-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001"
            });

            const result = await executeCreateIssue(mockClient, {
                project: { key: "TEST" },
                issuetype: { name: "Task" },
                summary: "Test Issue"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "10001",
                key: "TEST-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeCreateIssue(mockClient, {
                project: { key: "INVALID" },
                issuetype: { name: "Task" },
                summary: "Test Issue"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Project not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce("string error");

            const result = await executeCreateIssue(mockClient, {
                project: { key: "TEST" },
                issuetype: { name: "Task" },
                summary: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create issue");
        });
    });

    describe("executeGetIssue", () => {
        it("calls client with minimal params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "10001",
                key: "TEST-1",
                fields: { summary: "Test Issue" }
            });

            await executeGetIssue(mockClient, {
                issueIdOrKey: "TEST-1"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1", {});
        });

        it("calls client with fields and expand options", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "10001",
                key: "TEST-1",
                fields: { summary: "Test Issue" }
            });

            await executeGetIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                fields: ["summary", "description"],
                expand: ["changelog", "renderedFields"],
                properties: ["prop1"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1", {
                fields: "summary,description",
                expand: "changelog,renderedFields",
                properties: "prop1"
            });
        });

        it("returns normalized output on success", async () => {
            const issueData = {
                id: "10001",
                key: "TEST-1",
                fields: { summary: "Test Issue", status: { name: "To Do" } }
            };
            mockClient.get.mockResolvedValueOnce(issueData);

            const result = await executeGetIssue(mockClient, {
                issueIdOrKey: "TEST-1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(issueData);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Jira"));

            const result = await executeGetIssue(mockClient, {
                issueIdOrKey: "INVALID-999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Jira");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            await executeUpdateIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                fields: { summary: "Updated Summary" }
            });

            expect(mockClient.put).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1", {
                fields: { summary: "Updated Summary" }
            });
        });

        it("calls client with notifyUsers option", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            await executeUpdateIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                fields: { summary: "Updated Summary" },
                notifyUsers: false
            });

            expect(mockClient.put).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1", {
                fields: { summary: "Updated Summary" },
                notifyUsers: false
            });
        });

        it("returns success message on update", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            const result = await executeUpdateIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                fields: { summary: "Updated" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issue updated successfully" });
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Field 'invalid' does not exist"));

            const result = await executeUpdateIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                fields: { invalid: "value" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Field 'invalid' does not exist");
        });
    });

    describe("executeSearchIssues", () => {
        it("calls client with minimal params", async () => {
            mockClient.post.mockResolvedValueOnce({
                issues: [],
                total: 0,
                startAt: 0,
                maxResults: 50
            });

            await executeSearchIssues(mockClient, {
                jql: "project = TEST",
                startAt: 0,
                maxResults: 50
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/search", {
                jql: "project = TEST",
                startAt: 0,
                maxResults: 50
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.post.mockResolvedValueOnce({
                issues: [],
                total: 0,
                startAt: 0,
                maxResults: 10
            });

            await executeSearchIssues(mockClient, {
                jql: "project = TEST AND status = 'In Progress'",
                startAt: 10,
                maxResults: 10,
                fields: ["summary", "status"],
                expand: ["changelog"],
                validateQuery: true
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/search", {
                jql: "project = TEST AND status = 'In Progress'",
                startAt: 10,
                maxResults: 10,
                fields: ["summary", "status"],
                expand: ["changelog"],
                validateQuery: true
            });
        });

        it("returns normalized search results", async () => {
            const searchResponse = {
                issues: [
                    { id: "10001", key: "TEST-1", fields: { summary: "Issue 1" } },
                    { id: "10002", key: "TEST-2", fields: { summary: "Issue 2" } }
                ],
                total: 100,
                startAt: 0,
                maxResults: 50
            };
            mockClient.post.mockResolvedValueOnce(searchResponse);

            const result = await executeSearchIssues(mockClient, {
                jql: "project = TEST",
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                issues: searchResponse.issues,
                total: 100,
                startAt: 0,
                maxResults: 50
            });
        });

        it("returns error on invalid JQL", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Invalid JQL query"));

            const result = await executeSearchIssues(mockClient, {
                jql: "invalid jql syntax !!!",
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid JQL query");
        });
    });

    describe("executeDeleteIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteIssue(mockClient, {
                issueIdOrKey: "TEST-1"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1");
        });

        it("returns success message on delete", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteIssue(mockClient, {
                issueIdOrKey: "TEST-1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issue deleted successfully" });
        });

        it("returns error with retryable false on failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeDeleteIssue(mockClient, {
                issueIdOrKey: "TEST-1"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeTransitionIssue", () => {
        it("calls client with minimal params", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeTransitionIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                transitionId: "21"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/transitions", {
                transition: { id: "21" }
            });
        });

        it("calls client with comment and fields", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeTransitionIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                transitionId: "31",
                comment: "Moving to done",
                fields: { resolution: { name: "Fixed" } }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/transitions", {
                transition: { id: "31" },
                fields: { resolution: { name: "Fixed" } },
                update: {
                    comment: [
                        {
                            add: {
                                body: "Moving to done"
                            }
                        }
                    ]
                }
            });
        });

        it("returns success message on transition", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            const result = await executeTransitionIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                transitionId: "21"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issue transitioned successfully" });
        });

        it("returns error on invalid transition", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Transition not available"));

            const result = await executeTransitionIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                transitionId: "999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Transition not available");
        });
    });

    describe("executeAssignIssue", () => {
        it("calls client with accountId to assign", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            await executeAssignIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                accountId: "user-123"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/assignee", {
                accountId: "user-123"
            });
        });

        it("calls client with null to unassign", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            await executeAssignIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                accountId: null
            });

            expect(mockClient.put).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/assignee", {
                accountId: null
            });
        });

        it("returns assigned message on success", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            const result = await executeAssignIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                accountId: "user-123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issue assigned successfully" });
        });

        it("returns unassigned message when null accountId", async () => {
            mockClient.put.mockResolvedValueOnce(undefined);

            const result = await executeAssignIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                accountId: null
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issue unassigned successfully" });
        });

        it("returns error on failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("User not found"));

            const result = await executeAssignIssue(mockClient, {
                issueIdOrKey: "TEST-1",
                accountId: "invalid-user"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("User not found");
        });
    });

    describe("executeAddComment", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "comment-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001/comment/comment-1",
                created: "2024-01-15T10:00:00.000Z"
            });

            await executeAddComment(mockClient, {
                issueIdOrKey: "TEST-1",
                body: "This is a comment"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/comment", {
                body: "This is a comment"
            });
        });

        it("returns normalized comment output", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "comment-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001/comment/comment-1",
                created: "2024-01-15T10:00:00.000Z"
            });

            const result = await executeAddComment(mockClient, {
                issueIdOrKey: "TEST-1",
                body: "This is a comment"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "comment-1",
                self: "https://example.atlassian.net/rest/api/3/issue/10001/comment/comment-1",
                created: "2024-01-15T10:00:00.000Z"
            });
        });

        it("returns error on failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Issue not found"));

            const result = await executeAddComment(mockClient, {
                issueIdOrKey: "INVALID-1",
                body: "Comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Issue not found");
        });
    });

    describe("executeGetComments", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                comments: [],
                total: 0,
                startAt: 0,
                maxResults: 50
            });

            await executeGetComments(mockClient, {
                issueIdOrKey: "TEST-1",
                startAt: 0,
                maxResults: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/comment", {
                startAt: 0,
                maxResults: 50
            });
        });

        it("calls client with orderBy", async () => {
            mockClient.get.mockResolvedValueOnce({
                comments: [],
                total: 0,
                startAt: 0,
                maxResults: 50
            });

            await executeGetComments(mockClient, {
                issueIdOrKey: "TEST-1",
                startAt: 0,
                maxResults: 50,
                orderBy: "-created"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/issue/TEST-1/comment", {
                startAt: 0,
                maxResults: 50,
                orderBy: "-created"
            });
        });

        it("returns normalized comments output", async () => {
            const commentsResponse = {
                comments: [
                    { id: "1", body: "Comment 1" },
                    { id: "2", body: "Comment 2" }
                ],
                total: 2,
                startAt: 0,
                maxResults: 50
            };
            mockClient.get.mockResolvedValueOnce(commentsResponse);

            const result = await executeGetComments(mockClient, {
                issueIdOrKey: "TEST-1",
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(commentsResponse);
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Issue not found"));

            const result = await executeGetComments(mockClient, {
                issueIdOrKey: "INVALID-1",
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Issue not found");
        });
    });

    describe("executeAddAttachment", () => {
        it("calls uploadAttachment with correct params", async () => {
            mockClient.uploadAttachment.mockResolvedValueOnce([
                {
                    id: "attachment-1",
                    filename: "test.txt",
                    self: "https://example.atlassian.net/rest/api/3/attachment/attachment-1"
                }
            ]);

            await executeAddAttachment(mockClient, {
                issueIdOrKey: "TEST-1",
                filename: "test.txt",
                fileContent: "dGVzdCBjb250ZW50", // base64
                mimeType: "text/plain"
            });

            expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
                "TEST-1",
                "dGVzdCBjb250ZW50",
                "test.txt",
                "text/plain"
            );
        });

        it("calls uploadAttachment without mimeType", async () => {
            mockClient.uploadAttachment.mockResolvedValueOnce([
                {
                    id: "attachment-1",
                    filename: "file.bin"
                }
            ]);

            await executeAddAttachment(mockClient, {
                issueIdOrKey: "TEST-1",
                filename: "file.bin",
                fileContent: "YmluYXJ5"
            });

            expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
                "TEST-1",
                "YmluYXJ5",
                "file.bin",
                undefined
            );
        });

        it("returns attachment data on success", async () => {
            const attachmentData = [
                {
                    id: "attachment-1",
                    filename: "test.txt",
                    self: "https://example.atlassian.net/rest/api/3/attachment/attachment-1"
                }
            ];
            mockClient.uploadAttachment.mockResolvedValueOnce(attachmentData);

            const result = await executeAddAttachment(mockClient, {
                issueIdOrKey: "TEST-1",
                filename: "test.txt",
                fileContent: "dGVzdA=="
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(attachmentData);
        });

        it("returns error on failure", async () => {
            mockClient.uploadAttachment.mockRejectedValueOnce(new Error("File too large"));

            const result = await executeAddAttachment(mockClient, {
                issueIdOrKey: "TEST-1",
                filename: "large.zip",
                fileContent: "..."
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("File too large");
        });
    });

    describe("executeLinkIssues", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeLinkIssues(mockClient, {
                type: { name: "Blocks" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issueLink", {
                type: { name: "Blocks" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" }
            });
        });

        it("calls client with optional comment", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeLinkIssues(mockClient, {
                type: { name: "Relates to" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" },
                comment: "These issues are related"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/rest/api/3/issueLink", {
                type: { name: "Relates to" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" },
                comment: { body: "These issues are related" }
            });
        });

        it("returns success message on link", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            const result = await executeLinkIssues(mockClient, {
                type: { name: "Blocks" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ message: "Issues linked successfully" });
        });

        it("returns error on failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Link type not found"));

            const result = await executeLinkIssues(mockClient, {
                type: { name: "InvalidLinkType" },
                inwardIssue: { key: "TEST-1" },
                outwardIssue: { key: "TEST-2" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Link type not found");
        });
    });

    // ============================================================================
    // PROJECT OPERATIONS
    // ============================================================================

    describe("executeListProjects", () => {
        it("calls client with empty params", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeListProjects(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/project/search", {});
        });

        it("calls client with expand and recent", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeListProjects(mockClient, {
                expand: ["description", "lead"],
                recent: 10,
                properties: ["category"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/project/search", {
                expand: "description,lead",
                recent: 10,
                properties: "category"
            });
        });

        it("returns normalized projects output", async () => {
            const projectsData = [
                { id: "10001", key: "TEST", name: "Test Project" },
                { id: "10002", key: "DEV", name: "Development" }
            ];
            mockClient.get.mockResolvedValueOnce(projectsData);

            const result = await executeListProjects(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ projects: projectsData });
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Insufficient permissions for this Jira operation")
            );

            const result = await executeListProjects(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Insufficient permissions for this Jira operation");
        });
    });

    describe("executeGetProject", () => {
        it("calls client with minimal params", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "10001",
                key: "TEST",
                name: "Test Project"
            });

            await executeGetProject(mockClient, {
                projectIdOrKey: "TEST"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/project/TEST", {});
        });

        it("calls client with expand and properties", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "10001",
                key: "TEST",
                name: "Test Project"
            });

            await executeGetProject(mockClient, {
                projectIdOrKey: "10001",
                expand: ["description", "issueTypes"],
                properties: ["category"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/project/10001", {
                expand: "description,issueTypes",
                properties: "category"
            });
        });

        it("returns project data on success", async () => {
            const projectData = {
                id: "10001",
                key: "TEST",
                name: "Test Project",
                description: "A test project"
            };
            mockClient.get.mockResolvedValueOnce(projectData);

            const result = await executeGetProject(mockClient, {
                projectIdOrKey: "TEST"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(projectData);
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Jira"));

            const result = await executeGetProject(mockClient, {
                projectIdOrKey: "INVALID"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found in Jira");
        });
    });

    describe("executeGetIssueTypes", () => {
        it("calls client with project id", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeGetIssueTypes(mockClient, {
                projectId: "10001"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/project/10001/statuses");
        });

        it("returns normalized issue types output", async () => {
            const issueTypesData = [
                { id: "1", name: "Task", subtask: false },
                { id: "2", name: "Bug", subtask: false },
                { id: "3", name: "Subtask", subtask: true }
            ];
            mockClient.get.mockResolvedValueOnce(issueTypesData);

            const result = await executeGetIssueTypes(mockClient, {
                projectId: "10001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ issueTypes: issueTypesData });
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeGetIssueTypes(mockClient, {
                projectId: "INVALID"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Project not found");
        });
    });

    // ============================================================================
    // FIELD OPERATIONS
    // ============================================================================

    describe("executeListFields", () => {
        it("calls client to list fields", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeListFields(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/field");
        });

        it("returns normalized fields output", async () => {
            const fieldsData = [
                { id: "summary", name: "Summary", custom: false },
                { id: "customfield_10001", name: "Story Points", custom: true }
            ];
            mockClient.get.mockResolvedValueOnce(fieldsData);

            const result = await executeListFields(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ fields: fieldsData });
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid or expired Jira credentials"));

            const result = await executeListFields(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid or expired Jira credentials");
        });
    });

    describe("executeGetCustomFieldConfigs", () => {
        it("calls client with field id", async () => {
            mockClient.get.mockResolvedValueOnce({
                isLocked: false,
                values: []
            });

            await executeGetCustomFieldConfigs(mockClient, {
                fieldId: "customfield_10001"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/rest/api/3/field/customfield_10001/context"
            );
        });

        it("returns config data on success", async () => {
            const configData = {
                isLocked: false,
                values: [
                    { id: "1", value: "Option 1" },
                    { id: "2", value: "Option 2" }
                ]
            };
            mockClient.get.mockResolvedValueOnce(configData);

            const result = await executeGetCustomFieldConfigs(mockClient, {
                fieldId: "customfield_10001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(configData);
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Field not found"));

            const result = await executeGetCustomFieldConfigs(mockClient, {
                fieldId: "customfield_99999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Field not found");
        });
    });

    // ============================================================================
    // USER OPERATIONS
    // ============================================================================

    describe("executeSearchUsers", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeSearchUsers(mockClient, {
                startAt: 0,
                maxResults: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/user/search", {
                startAt: 0,
                maxResults: 50
            });
        });

        it("calls client with query", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeSearchUsers(mockClient, {
                query: "john",
                startAt: 0,
                maxResults: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/user/search", {
                query: "john",
                startAt: 0,
                maxResults: 50
            });
        });

        it("calls client with accountId", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeSearchUsers(mockClient, {
                accountId: "user-123",
                startAt: 0,
                maxResults: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/user/search", {
                accountId: "user-123",
                startAt: 0,
                maxResults: 50
            });
        });

        it("returns normalized users output", async () => {
            const usersData = [
                { accountId: "user-1", displayName: "John Doe", emailAddress: "john@example.com" },
                { accountId: "user-2", displayName: "Jane Smith", emailAddress: "jane@example.com" }
            ];
            mockClient.get.mockResolvedValueOnce(usersData);

            const result = await executeSearchUsers(mockClient, {
                query: "example.com",
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ users: usersData });
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Search failed"));

            const result = await executeSearchUsers(mockClient, {
                startAt: 0,
                maxResults: 50
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Search failed");
        });
    });

    describe("executeGetCurrentUser", () => {
        it("calls client with empty params", async () => {
            mockClient.get.mockResolvedValueOnce({
                accountId: "user-1",
                displayName: "Current User"
            });

            await executeGetCurrentUser(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/myself", {});
        });

        it("calls client with expand", async () => {
            mockClient.get.mockResolvedValueOnce({
                accountId: "user-1",
                displayName: "Current User"
            });

            await executeGetCurrentUser(mockClient, {
                expand: ["groups", "applicationRoles"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/rest/api/3/myself", {
                expand: "groups,applicationRoles"
            });
        });

        it("returns user data on success", async () => {
            const userData = {
                accountId: "user-1",
                displayName: "Current User",
                emailAddress: "user@example.com",
                active: true
            };
            mockClient.get.mockResolvedValueOnce(userData);

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(userData);
        });

        it("returns error on failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid or expired Jira credentials"));

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid or expired Jira credentials");
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION
    // ============================================================================

    describe("schema validation", () => {
        describe("createIssueInputSchema", () => {
            it("validates minimal input", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "Test Issue"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "Test Issue",
                    description: "Description",
                    assignee: { accountId: "user-123" },
                    priority: { name: "High" },
                    labels: ["bug"],
                    components: [{ name: "Backend" }],
                    parent: { key: "TEST-100" },
                    customFields: { customfield_10001: "value" }
                });
                expect(result.success).toBe(true);
            });

            it("validates null assignee for unassigned", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "Test Issue",
                    assignee: null
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing project", () => {
                const result = createIssueInputSchema.safeParse({
                    issuetype: { name: "Task" },
                    summary: "Test Issue"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing issuetype", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    summary: "Test Issue"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty summary", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects summary over 255 characters", () => {
                const result = createIssueInputSchema.safeParse({
                    project: { key: "TEST" },
                    issuetype: { name: "Task" },
                    summary: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getIssueInputSchema", () => {
            it("validates minimal input", () => {
                const result = getIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    fields: ["summary", "description"],
                    expand: ["changelog"],
                    properties: ["prop1"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing issueIdOrKey", () => {
                const result = getIssueInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateIssueInputSchema", () => {
            it("validates minimal input", () => {
                const result = updateIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    fields: { summary: "New Summary" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with notifyUsers", () => {
                const result = updateIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    fields: { summary: "New Summary" },
                    notifyUsers: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = updateIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchIssuesInputSchema", () => {
            it("validates minimal input with defaults", () => {
                const result = searchIssuesInputSchema.safeParse({
                    jql: "project = TEST"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.startAt).toBe(0);
                    expect(result.data.maxResults).toBe(50);
                }
            });

            it("validates full input", () => {
                const result = searchIssuesInputSchema.safeParse({
                    jql: "project = TEST",
                    startAt: 10,
                    maxResults: 25,
                    fields: ["summary"],
                    expand: ["changelog"],
                    validateQuery: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty jql", () => {
                const result = searchIssuesInputSchema.safeParse({
                    jql: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults over 100", () => {
                const result = searchIssuesInputSchema.safeParse({
                    jql: "project = TEST",
                    maxResults: 200
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative startAt", () => {
                const result = searchIssuesInputSchema.safeParse({
                    jql: "project = TEST",
                    startAt: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteIssueInputSchema", () => {
            it("validates minimal input", () => {
                const result = deleteIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1"
                });
                expect(result.success).toBe(true);
            });

            it("validates with deleteSubtasks", () => {
                const result = deleteIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    deleteSubtasks: true
                });
                expect(result.success).toBe(true);
            });
        });

        describe("transitionIssueInputSchema", () => {
            it("validates minimal input", () => {
                const result = transitionIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    transitionId: "21"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = transitionIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    transitionId: "21",
                    comment: "Transitioning",
                    fields: { resolution: { name: "Fixed" } }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("assignIssueInputSchema", () => {
            it("validates with accountId", () => {
                const result = assignIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    accountId: "user-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with null accountId (unassign)", () => {
                const result = assignIssueInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    accountId: null
                });
                expect(result.success).toBe(true);
            });
        });

        describe("addCommentInputSchema", () => {
            it("validates input", () => {
                const result = addCommentInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    body: "This is a comment"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty body", () => {
                const result = addCommentInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    body: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCommentsInputSchema", () => {
            it("validates minimal input with defaults", () => {
                const result = getCommentsInputSchema.safeParse({
                    issueIdOrKey: "TEST-1"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.startAt).toBe(0);
                    expect(result.data.maxResults).toBe(50);
                }
            });

            it("validates with orderBy", () => {
                const result = getCommentsInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    orderBy: "-created"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid orderBy", () => {
                const result = getCommentsInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    orderBy: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addAttachmentInputSchema", () => {
            it("validates minimal input", () => {
                const result = addAttachmentInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    filename: "test.txt",
                    fileContent: "dGVzdA=="
                });
                expect(result.success).toBe(true);
            });

            it("validates with mimeType", () => {
                const result = addAttachmentInputSchema.safeParse({
                    issueIdOrKey: "TEST-1",
                    filename: "test.txt",
                    fileContent: "dGVzdA==",
                    mimeType: "text/plain"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("linkIssuesInputSchema", () => {
            it("validates minimal input", () => {
                const result = linkIssuesInputSchema.safeParse({
                    type: { name: "Blocks" },
                    inwardIssue: { key: "TEST-1" },
                    outwardIssue: { key: "TEST-2" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with comment", () => {
                const result = linkIssuesInputSchema.safeParse({
                    type: { name: "Blocks" },
                    inwardIssue: { key: "TEST-1" },
                    outwardIssue: { key: "TEST-2" },
                    comment: "Link comment"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listProjectsInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listProjectsInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with expand", () => {
                const result = listProjectsInputSchema.safeParse({
                    expand: ["description", "lead"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with recent", () => {
                const result = listProjectsInputSchema.safeParse({
                    recent: 5
                });
                expect(result.success).toBe(true);
            });

            it("rejects recent over 20", () => {
                const result = listProjectsInputSchema.safeParse({
                    recent: 25
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getProjectInputSchema", () => {
            it("validates minimal input", () => {
                const result = getProjectInputSchema.safeParse({
                    projectIdOrKey: "TEST"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getProjectInputSchema.safeParse({
                    projectIdOrKey: "TEST",
                    expand: ["description"],
                    properties: ["category"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getIssueTypesInputSchema", () => {
            it("validates input", () => {
                const result = getIssueTypesInputSchema.safeParse({
                    projectId: "10001"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing projectId", () => {
                const result = getIssueTypesInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listFieldsInputSchema", () => {
            it("validates empty input", () => {
                const result = listFieldsInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getCustomFieldConfigsInputSchema", () => {
            it("validates input", () => {
                const result = getCustomFieldConfigsInputSchema.safeParse({
                    fieldId: "customfield_10001"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fieldId", () => {
                const result = getCustomFieldConfigsInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("searchUsersInputSchema", () => {
            it("validates empty input with defaults", () => {
                const result = searchUsersInputSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.startAt).toBe(0);
                    expect(result.data.maxResults).toBe(50);
                }
            });

            it("validates with query", () => {
                const result = searchUsersInputSchema.safeParse({
                    query: "john"
                });
                expect(result.success).toBe(true);
            });

            it("validates with accountId", () => {
                const result = searchUsersInputSchema.safeParse({
                    accountId: "user-123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getCurrentUserInputSchema", () => {
            it("validates empty input", () => {
                const result = getCurrentUserInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with expand", () => {
                const result = getCurrentUserInputSchema.safeParse({
                    expand: ["groups", "applicationRoles"]
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
