/**
 * Sentry Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateRelease, createReleaseSchema } from "../operations/createRelease";
import { executeGetIssue, getIssueSchema } from "../operations/getIssue";
import { executeGetProject, getProjectSchema } from "../operations/getProject";
import { executeListAlertRules, listAlertRulesSchema } from "../operations/listAlertRules";
import { executeListIssueEvents, listIssueEventsSchema } from "../operations/listIssueEvents";
import { executeListIssues, listIssuesSchema } from "../operations/listIssues";
import { executeListOrganizations, listOrganizationsSchema } from "../operations/listOrganizations";
import { executeListProjects, listProjectsSchema } from "../operations/listProjects";
import { executeListReleases, listReleasesSchema } from "../operations/listReleases";
import { executeUpdateIssue, updateIssueSchema } from "../operations/updateIssue";
import type { SentryClient } from "../client/SentryClient";
import type {
    SentryOrganizationOutput,
    SentryProjectOutput,
    SentryIssueOutput,
    SentryEventOutput,
    SentryReleaseOutput,
    SentryAlertRuleOutput
} from "../operations/types";

// Type definitions for operation result data
interface GetIssueResultData {
    id: string;
    shortId: string;
    title: string;
    culprit?: string;
    permalink?: string;
    level?: string;
    status?: string;
    statusDetails?: Record<string, unknown>;
    isPublic?: boolean;
    platform?: string;
    project?: { id: string; name: string; slug: string };
    type?: string;
    metadata?: { value?: string; type?: string };
    numComments?: number;
    assignedTo?: { type: string; id?: string; name?: string };
    isBookmarked?: boolean;
    isSubscribed?: boolean;
    hasSeen?: boolean;
    isUnhandled?: boolean;
    count: number;
    userCount?: number;
    firstSeen?: string;
    lastSeen?: string;
}

interface GetProjectResultData {
    id: string;
    slug: string;
    name: string;
    platform?: string;
    dateCreated: string;
    firstEvent?: string;
    hasSessions?: boolean;
    hasProfiles?: boolean;
    hasReplays?: boolean;
    hasMonitors?: boolean;
    organization?: { id: string; slug: string; name: string };
}

interface ListAlertRulesResultData {
    rules: SentryAlertRuleOutput[];
    count: number;
}

interface ListIssueEventsResultData {
    events: SentryEventOutput[];
    count: number;
}

interface ListIssuesResultData {
    issues: SentryIssueOutput[];
    count: number;
}

interface ListOrganizationsResultData {
    organizations: SentryOrganizationOutput[];
    count: number;
}

interface ListProjectsResultData {
    projects: SentryProjectOutput[];
    count: number;
}

interface ListReleasesResultData {
    releases: SentryReleaseOutput[];
    count: number;
}

interface UpdateIssueResultData {
    id: string;
    shortId: string;
    title: string;
    status?: string;
    assignedTo?: string;
    hasSeen?: boolean;
    isBookmarked?: boolean;
}

// Mock SentryClient factory
function createMockSentryClient(): jest.Mocked<SentryClient> {
    return {
        listOrganizations: jest.fn(),
        listProjects: jest.fn(),
        getProject: jest.fn(),
        listIssues: jest.fn(),
        getIssue: jest.fn(),
        updateIssue: jest.fn(),
        listIssueEvents: jest.fn(),
        listReleases: jest.fn(),
        createRelease: jest.fn(),
        listAlertRules: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<SentryClient>;
}

describe("Sentry Operation Executors", () => {
    let mockClient: jest.Mocked<SentryClient>;

    beforeEach(() => {
        mockClient = createMockSentryClient();
    });

    describe("executeCreateRelease", () => {
        it("calls client with correct params", async () => {
            mockClient.createRelease.mockResolvedValueOnce({
                version: "1.0.0",
                shortVersion: "1.0.0",
                ref: "abc123",
                url: "https://example.com/release",
                dateCreated: "2024-01-15T10:00:00Z",
                dateReleased: "2024-01-15T12:00:00Z",
                projects: [{ id: "1", slug: "my-project", name: "My Project" }]
            });

            await executeCreateRelease(mockClient, {
                organizationSlug: "my-org",
                version: "1.0.0",
                projects: ["my-project"],
                ref: "abc123",
                url: "https://example.com/release"
            });

            expect(mockClient.createRelease).toHaveBeenCalledWith("my-org", {
                version: "1.0.0",
                projects: ["my-project"],
                dateReleased: undefined,
                ref: "abc123",
                url: "https://example.com/release"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createRelease.mockResolvedValueOnce({
                version: "2.0.0",
                shortVersion: "2.0.0",
                ref: "def456",
                url: "https://example.com/v2",
                dateCreated: "2024-01-16T10:00:00Z",
                dateReleased: "2024-01-16T14:00:00Z",
                projects: [{ id: "2", slug: "backend", name: "Backend" }]
            });

            const result = await executeCreateRelease(mockClient, {
                organizationSlug: "my-org",
                version: "2.0.0",
                projects: ["backend"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                version: "2.0.0",
                shortVersion: "2.0.0",
                ref: "def456",
                url: "https://example.com/v2",
                dateCreated: "2024-01-16T10:00:00Z",
                dateReleased: "2024-01-16T14:00:00Z",
                projects: [{ id: "2", slug: "backend", name: "Backend" }]
            });
        });

        it("passes dateReleased when provided", async () => {
            mockClient.createRelease.mockResolvedValueOnce({
                version: "1.0.0",
                dateReleased: "2024-01-20T08:00:00Z"
            });

            await executeCreateRelease(mockClient, {
                organizationSlug: "my-org",
                version: "1.0.0",
                projects: ["frontend"],
                dateReleased: "2024-01-20T08:00:00Z"
            });

            expect(mockClient.createRelease).toHaveBeenCalledWith("my-org", {
                version: "1.0.0",
                projects: ["frontend"],
                dateReleased: "2024-01-20T08:00:00Z",
                ref: undefined,
                url: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createRelease.mockRejectedValueOnce(new Error("Invalid version format"));

            const result = await executeCreateRelease(mockClient, {
                organizationSlug: "my-org",
                version: "invalid",
                projects: ["my-project"]
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid version format");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createRelease.mockRejectedValueOnce("string error");

            const result = await executeCreateRelease(mockClient, {
                organizationSlug: "my-org",
                version: "1.0.0",
                projects: ["my-project"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create release");
        });
    });

    describe("executeGetIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.getIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "TypeError: Cannot read property",
                count: "42"
            });

            await executeGetIssue(mockClient, { issueId: "12345" });

            expect(mockClient.getIssue).toHaveBeenCalledWith("12345");
        });

        it("returns normalized output on success", async () => {
            mockClient.getIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "TypeError: Cannot read property",
                culprit: "fetchData(app.js)",
                permalink: "https://sentry.io/issues/12345",
                level: "error",
                status: "unresolved",
                statusDetails: {},
                isPublic: false,
                platform: "javascript",
                project: { id: "100", name: "My App", slug: "my-app" },
                type: "error",
                metadata: { value: "undefined", type: "TypeError" },
                numComments: 3,
                assignedTo: { type: "user", id: "u1", name: "John Doe" },
                isBookmarked: true,
                isSubscribed: true,
                hasSeen: false,
                isUnhandled: true,
                count: "156",
                userCount: 42,
                firstSeen: "2024-01-01T00:00:00Z",
                lastSeen: "2024-01-15T12:00:00Z"
            });

            const result = await executeGetIssue(mockClient, { issueId: "12345" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "12345",
                shortId: "PROJ-123",
                title: "TypeError: Cannot read property",
                culprit: "fetchData(app.js)",
                permalink: "https://sentry.io/issues/12345",
                level: "error",
                status: "unresolved",
                statusDetails: {},
                isPublic: false,
                platform: "javascript",
                project: { id: "100", name: "My App", slug: "my-app" },
                type: "error",
                metadata: { value: "undefined", type: "TypeError" },
                numComments: 3,
                assignedTo: { type: "user", id: "u1", name: "John Doe" },
                isBookmarked: true,
                isSubscribed: true,
                hasSeen: false,
                isUnhandled: true,
                count: 156,
                userCount: 42,
                firstSeen: "2024-01-01T00:00:00Z",
                lastSeen: "2024-01-15T12:00:00Z"
            });
        });

        it("converts count string to number", async () => {
            mockClient.getIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                count: "999"
            });

            const result = await executeGetIssue(mockClient, { issueId: "12345" });
            const data = result.data as GetIssueResultData;

            expect(result.success).toBe(true);
            expect(data.count).toBe(999);
        });

        it("returns error on client failure", async () => {
            mockClient.getIssue.mockRejectedValueOnce(new Error("Resource not found in Sentry."));

            const result = await executeGetIssue(mockClient, { issueId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Sentry.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetProject", () => {
        it("calls client with correct params", async () => {
            mockClient.getProject.mockResolvedValueOnce({
                id: "1",
                slug: "my-project",
                name: "My Project",
                dateCreated: "2024-01-01T00:00:00Z"
            });

            await executeGetProject(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "my-project"
            });

            expect(mockClient.getProject).toHaveBeenCalledWith("my-org", "my-project");
        });

        it("returns normalized output on success", async () => {
            mockClient.getProject.mockResolvedValueOnce({
                id: "123",
                slug: "backend-api",
                name: "Backend API",
                platform: "node",
                dateCreated: "2023-06-15T08:00:00Z",
                firstEvent: "2023-06-16T10:00:00Z",
                hasSessions: true,
                hasProfiles: false,
                hasReplays: true,
                hasMonitors: false,
                organization: { id: "org-1", slug: "acme", name: "Acme Inc" }
            });

            const result = await executeGetProject(mockClient, {
                organizationSlug: "acme",
                projectSlug: "backend-api"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "123",
                slug: "backend-api",
                name: "Backend API",
                platform: "node",
                dateCreated: "2023-06-15T08:00:00Z",
                firstEvent: "2023-06-16T10:00:00Z",
                hasSessions: true,
                hasProfiles: false,
                hasReplays: true,
                hasMonitors: false,
                organization: { id: "org-1", slug: "acme", name: "Acme Inc" }
            });
        });

        it("handles missing optional fields", async () => {
            mockClient.getProject.mockResolvedValueOnce({
                id: "1",
                slug: "basic-project",
                name: "Basic Project",
                dateCreated: "2024-01-01T00:00:00Z"
            });

            const result = await executeGetProject(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "basic-project"
            });
            const data = result.data as GetProjectResultData;

            expect(result.success).toBe(true);
            expect(data.platform).toBeUndefined();
            expect(data.organization).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getProject.mockRejectedValueOnce(
                new Error(
                    "Sentry permission denied. Your token may not have access to this resource."
                )
            );

            const result = await executeGetProject(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "restricted-project"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Sentry permission denied. Your token may not have access to this resource."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListAlertRules", () => {
        it("calls client with correct params", async () => {
            mockClient.listAlertRules.mockResolvedValueOnce([]);

            await executeListAlertRules(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "my-project"
            });

            expect(mockClient.listAlertRules).toHaveBeenCalledWith("my-org", "my-project");
        });

        it("returns normalized output on success", async () => {
            mockClient.listAlertRules.mockResolvedValueOnce([
                {
                    id: "alert-1",
                    name: "High Error Rate",
                    dateCreated: "2024-01-01T00:00:00Z",
                    status: "active",
                    environment: "production",
                    frequency: 60
                },
                {
                    id: "alert-2",
                    name: "Memory Spike",
                    dateCreated: "2024-01-05T00:00:00Z",
                    status: "active",
                    environment: "staging",
                    frequency: 30
                }
            ]);

            const result = await executeListAlertRules(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "my-project"
            });
            const data = result.data as ListAlertRulesResultData;

            expect(result.success).toBe(true);
            expect(data.rules).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.rules[0]).toEqual({
                id: "alert-1",
                name: "High Error Rate",
                dateCreated: "2024-01-01T00:00:00Z",
                status: "active",
                environment: "production",
                frequency: 60
            });
        });

        it("returns empty array when no alert rules", async () => {
            mockClient.listAlertRules.mockResolvedValueOnce([]);

            const result = await executeListAlertRules(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "new-project"
            });
            const data = result.data as ListAlertRulesResultData;

            expect(result.success).toBe(true);
            expect(data.rules).toEqual([]);
            expect(data.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listAlertRules.mockRejectedValueOnce(
                new Error("Sentry rate limit exceeded. Please try again later.")
            );

            const result = await executeListAlertRules(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "my-project"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Sentry rate limit exceeded. Please try again later."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListIssueEvents", () => {
        it("calls client with correct params", async () => {
            mockClient.listIssueEvents.mockResolvedValueOnce([]);

            await executeListIssueEvents(mockClient, { issueId: "12345" });

            expect(mockClient.listIssueEvents).toHaveBeenCalledWith("12345", {
                full: undefined,
                cursor: undefined
            });
        });

        it("passes full and cursor params when provided", async () => {
            mockClient.listIssueEvents.mockResolvedValueOnce([]);

            await executeListIssueEvents(mockClient, {
                issueId: "12345",
                full: true,
                cursor: "next-page-cursor"
            });

            expect(mockClient.listIssueEvents).toHaveBeenCalledWith("12345", {
                full: true,
                cursor: "next-page-cursor"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listIssueEvents.mockResolvedValueOnce([
                {
                    id: "evt-1",
                    eventID: "event-uuid-1",
                    dateCreated: "2024-01-15T10:00:00Z",
                    message: "Error occurred in fetchData",
                    title: "TypeError",
                    platform: "javascript",
                    user: {
                        id: "u-123",
                        email: "user@example.com",
                        username: "johndoe",
                        ip_address: "192.168.1.1"
                    },
                    tags: [
                        { key: "browser", value: "Chrome" },
                        { key: "os", value: "Windows" }
                    ]
                },
                {
                    id: "evt-2",
                    eventID: "event-uuid-2",
                    dateCreated: "2024-01-15T11:00:00Z"
                }
            ]);

            const result = await executeListIssueEvents(mockClient, { issueId: "12345" });
            const data = result.data as ListIssueEventsResultData;

            expect(result.success).toBe(true);
            expect(data.events).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.events[0]).toEqual({
                id: "evt-1",
                eventId: "event-uuid-1",
                dateCreated: "2024-01-15T10:00:00Z",
                message: "Error occurred in fetchData",
                title: "TypeError",
                platform: "javascript",
                user: {
                    id: "u-123",
                    email: "user@example.com",
                    username: "johndoe",
                    ipAddress: "192.168.1.1"
                },
                tags: [
                    { key: "browser", value: "Chrome" },
                    { key: "os", value: "Windows" }
                ]
            });
        });

        it("handles events without user info", async () => {
            mockClient.listIssueEvents.mockResolvedValueOnce([
                {
                    id: "evt-1",
                    eventID: "event-uuid-1",
                    dateCreated: "2024-01-15T10:00:00Z"
                }
            ]);

            const result = await executeListIssueEvents(mockClient, { issueId: "12345" });
            const data = result.data as ListIssueEventsResultData;

            expect(result.success).toBe(true);
            expect(data.events[0].user).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listIssueEvents.mockRejectedValueOnce(new Error("Issue not found"));

            const result = await executeListIssueEvents(mockClient, { issueId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Issue not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListIssues", () => {
        it("calls client with minimal params", async () => {
            mockClient.listIssues.mockResolvedValueOnce([]);

            await executeListIssues(mockClient, { organizationSlug: "my-org" });

            expect(mockClient.listIssues).toHaveBeenCalledWith({
                organizationSlug: "my-org",
                projectSlug: undefined,
                query: undefined,
                statsPeriod: undefined,
                sort: undefined,
                cursor: undefined
            });
        });

        it("calls client with all params", async () => {
            mockClient.listIssues.mockResolvedValueOnce([]);

            await executeListIssues(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "frontend",
                query: "is:unresolved level:error",
                statsPeriod: "24h",
                sort: "freq",
                cursor: "page-2-cursor"
            });

            expect(mockClient.listIssues).toHaveBeenCalledWith({
                organizationSlug: "my-org",
                projectSlug: "frontend",
                query: "is:unresolved level:error",
                statsPeriod: "24h",
                sort: "freq",
                cursor: "page-2-cursor"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listIssues.mockResolvedValueOnce([
                {
                    id: "issue-1",
                    shortId: "PROJ-100",
                    title: "ReferenceError: x is not defined",
                    culprit: "render(Component.tsx)",
                    level: "error",
                    status: "unresolved",
                    platform: "javascript",
                    project: { id: "p-1", name: "Frontend", slug: "frontend" },
                    count: "250",
                    userCount: 78,
                    firstSeen: "2024-01-10T00:00:00Z",
                    lastSeen: "2024-01-15T18:00:00Z",
                    isBookmarked: false,
                    isSubscribed: true,
                    hasSeen: true,
                    assignedTo: { type: "user", name: "Jane Smith", email: "jane@example.com" }
                },
                {
                    id: "issue-2",
                    shortId: "PROJ-101",
                    title: "Network Error",
                    count: "45",
                    assignedTo: { type: "team", email: "team@example.com" }
                }
            ]);

            const result = await executeListIssues(mockClient, { organizationSlug: "my-org" });
            const data = result.data as ListIssuesResultData;

            expect(result.success).toBe(true);
            expect(data.issues).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.issues[0]).toEqual({
                id: "issue-1",
                shortId: "PROJ-100",
                title: "ReferenceError: x is not defined",
                culprit: "render(Component.tsx)",
                level: "error",
                status: "unresolved",
                platform: "javascript",
                project: { id: "p-1", name: "Frontend", slug: "frontend" },
                count: 250,
                userCount: 78,
                firstSeen: "2024-01-10T00:00:00Z",
                lastSeen: "2024-01-15T18:00:00Z",
                isBookmarked: false,
                isSubscribed: true,
                hasSeen: true,
                assignedTo: "Jane Smith"
            });
            expect(data.issues[1].assignedTo).toBe("team@example.com");
        });

        it("handles issues without assignedTo", async () => {
            mockClient.listIssues.mockResolvedValueOnce([
                {
                    id: "issue-1",
                    shortId: "PROJ-100",
                    title: "Unassigned Error",
                    count: "10"
                }
            ]);

            const result = await executeListIssues(mockClient, { organizationSlug: "my-org" });
            const data = result.data as ListIssuesResultData;

            expect(result.success).toBe(true);
            expect(data.issues[0].assignedTo).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listIssues.mockRejectedValueOnce(
                new Error("Sentry authentication failed. Please check your Auth Token.")
            );

            const result = await executeListIssues(mockClient, { organizationSlug: "my-org" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Sentry authentication failed. Please check your Auth Token."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListOrganizations", () => {
        it("calls client with no params", async () => {
            mockClient.listOrganizations.mockResolvedValueOnce([]);

            await executeListOrganizations(mockClient, {});

            expect(mockClient.listOrganizations).toHaveBeenCalledWith();
        });

        it("returns normalized output on success", async () => {
            mockClient.listOrganizations.mockResolvedValueOnce([
                {
                    id: "org-1",
                    slug: "acme-corp",
                    name: "Acme Corporation",
                    dateCreated: "2023-01-01T00:00:00Z",
                    status: { id: "active", name: "Active" }
                },
                {
                    id: "org-2",
                    slug: "test-org",
                    name: "Test Organization",
                    dateCreated: "2024-01-01T00:00:00Z"
                }
            ]);

            const result = await executeListOrganizations(mockClient, {});
            const data = result.data as ListOrganizationsResultData;

            expect(result.success).toBe(true);
            expect(data.organizations).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.organizations[0]).toEqual({
                id: "org-1",
                slug: "acme-corp",
                name: "Acme Corporation",
                dateCreated: "2023-01-01T00:00:00Z",
                status: "Active"
            });
            expect(data.organizations[1].status).toBeUndefined();
        });

        it("returns empty array when no organizations", async () => {
            mockClient.listOrganizations.mockResolvedValueOnce([]);

            const result = await executeListOrganizations(mockClient, {});
            const data = result.data as ListOrganizationsResultData;

            expect(result.success).toBe(true);
            expect(data.organizations).toEqual([]);
            expect(data.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listOrganizations.mockRejectedValueOnce(new Error("API Error"));

            const result = await executeListOrganizations(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API Error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListProjects", () => {
        it("calls client with correct params", async () => {
            mockClient.listProjects.mockResolvedValueOnce([]);

            await executeListProjects(mockClient, { organizationSlug: "my-org" });

            expect(mockClient.listProjects).toHaveBeenCalledWith("my-org", undefined);
        });

        it("passes cursor when provided", async () => {
            mockClient.listProjects.mockResolvedValueOnce([]);

            await executeListProjects(mockClient, {
                organizationSlug: "my-org",
                cursor: "next-page"
            });

            expect(mockClient.listProjects).toHaveBeenCalledWith("my-org", "next-page");
        });

        it("returns normalized output on success", async () => {
            mockClient.listProjects.mockResolvedValueOnce([
                {
                    id: "proj-1",
                    slug: "backend-api",
                    name: "Backend API",
                    platform: "node",
                    dateCreated: "2023-06-01T00:00:00Z",
                    organization: { id: "org-1", slug: "acme", name: "Acme" }
                },
                {
                    id: "proj-2",
                    slug: "frontend",
                    name: "Frontend",
                    platform: "javascript-react",
                    dateCreated: "2023-07-01T00:00:00Z"
                }
            ]);

            const result = await executeListProjects(mockClient, { organizationSlug: "acme" });
            const data = result.data as ListProjectsResultData;

            expect(result.success).toBe(true);
            expect(data.projects).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.projects[0]).toEqual({
                id: "proj-1",
                slug: "backend-api",
                name: "Backend API",
                platform: "node",
                dateCreated: "2023-06-01T00:00:00Z",
                organization: { id: "org-1", slug: "acme", name: "Acme" }
            });
            expect(data.projects[1].organization).toBeUndefined();
        });

        it("returns empty array when no projects", async () => {
            mockClient.listProjects.mockResolvedValueOnce([]);

            const result = await executeListProjects(mockClient, { organizationSlug: "empty-org" });
            const data = result.data as ListProjectsResultData;

            expect(result.success).toBe(true);
            expect(data.projects).toEqual([]);
            expect(data.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listProjects.mockRejectedValueOnce(new Error("Organization not found"));

            const result = await executeListProjects(mockClient, {
                organizationSlug: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Organization not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListReleases", () => {
        it("calls client with minimal params", async () => {
            mockClient.listReleases.mockResolvedValueOnce([]);

            await executeListReleases(mockClient, { organizationSlug: "my-org" });

            expect(mockClient.listReleases).toHaveBeenCalledWith("my-org", {
                projectSlug: undefined,
                query: undefined
            });
        });

        it("calls client with all params", async () => {
            mockClient.listReleases.mockResolvedValueOnce([]);

            await executeListReleases(mockClient, {
                organizationSlug: "my-org",
                projectSlug: "backend",
                query: "2.0"
            });

            expect(mockClient.listReleases).toHaveBeenCalledWith("my-org", {
                projectSlug: "backend",
                query: "2.0"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listReleases.mockResolvedValueOnce([
                {
                    version: "2.1.0",
                    shortVersion: "2.1.0",
                    ref: "abc123",
                    url: "https://github.com/org/repo/releases/v2.1.0",
                    dateCreated: "2024-01-10T00:00:00Z",
                    dateReleased: "2024-01-12T00:00:00Z",
                    projects: [{ id: "1", slug: "backend", name: "Backend" }]
                },
                {
                    version: "2.0.0",
                    shortVersion: "2.0.0"
                }
            ]);

            const result = await executeListReleases(mockClient, { organizationSlug: "my-org" });
            const data = result.data as ListReleasesResultData;

            expect(result.success).toBe(true);
            expect(data.releases).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.releases[0]).toEqual({
                version: "2.1.0",
                shortVersion: "2.1.0",
                ref: "abc123",
                url: "https://github.com/org/repo/releases/v2.1.0",
                dateCreated: "2024-01-10T00:00:00Z",
                dateReleased: "2024-01-12T00:00:00Z",
                projects: [{ id: "1", slug: "backend", name: "Backend" }]
            });
        });

        it("returns empty array when no releases", async () => {
            mockClient.listReleases.mockResolvedValueOnce([]);

            const result = await executeListReleases(mockClient, { organizationSlug: "new-org" });
            const data = result.data as ListReleasesResultData;

            expect(result.success).toBe(true);
            expect(data.releases).toEqual([]);
            expect(data.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listReleases.mockRejectedValueOnce(new Error("Access denied"));

            const result = await executeListReleases(mockClient, { organizationSlug: "my-org" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Access denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateIssue", () => {
        it("calls client with status update", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "resolved",
                count: "10"
            });

            await executeUpdateIssue(mockClient, {
                issueId: "12345",
                status: "resolved"
            });

            expect(mockClient.updateIssue).toHaveBeenCalledWith("12345", {
                status: "resolved"
            });
        });

        it("calls client with all update params", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "ignored",
                count: "10",
                hasSeen: true,
                isBookmarked: true,
                assignedTo: { type: "user", name: "John", email: "john@example.com" }
            });

            await executeUpdateIssue(mockClient, {
                issueId: "12345",
                status: "ignored",
                assignedTo: "john@example.com",
                hasSeen: true,
                isBookmarked: true
            });

            expect(mockClient.updateIssue).toHaveBeenCalledWith("12345", {
                status: "ignored",
                assignedTo: "john@example.com",
                hasSeen: true,
                isBookmarked: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "resolved",
                assignedTo: { type: "user", name: "Jane Doe", email: "jane@example.com" },
                hasSeen: true,
                isBookmarked: false,
                count: "42"
            });

            const result = await executeUpdateIssue(mockClient, {
                issueId: "12345",
                status: "resolved"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "resolved",
                assignedTo: "Jane Doe",
                hasSeen: true,
                isBookmarked: false
            });
        });

        it("handles assignedTo with only email", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "unresolved",
                assignedTo: { type: "team", email: "team@example.com" },
                count: "10"
            });

            const result = await executeUpdateIssue(mockClient, {
                issueId: "12345",
                assignedTo: "team@example.com"
            });
            const data = result.data as UpdateIssueResultData;

            expect(result.success).toBe(true);
            expect(data.assignedTo).toBe("team@example.com");
        });

        it("handles missing assignedTo", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                status: "unresolved",
                count: "10"
            });

            const result = await executeUpdateIssue(mockClient, {
                issueId: "12345",
                hasSeen: true
            });
            const data = result.data as UpdateIssueResultData;

            expect(result.success).toBe(true);
            expect(data.assignedTo).toBeUndefined();
        });

        it("does not include undefined values in updates", async () => {
            mockClient.updateIssue.mockResolvedValueOnce({
                id: "12345",
                shortId: "PROJ-123",
                title: "Test Error",
                isBookmarked: true,
                count: "10"
            });

            await executeUpdateIssue(mockClient, {
                issueId: "12345",
                isBookmarked: true
            });

            expect(mockClient.updateIssue).toHaveBeenCalledWith("12345", {
                isBookmarked: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateIssue.mockRejectedValueOnce(new Error("Cannot update resolved issue"));

            const result = await executeUpdateIssue(mockClient, {
                issueId: "12345",
                status: "resolved"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Cannot update resolved issue");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.updateIssue.mockRejectedValueOnce({ unexpected: "error object" });

            const result = await executeUpdateIssue(mockClient, {
                issueId: "12345",
                status: "ignored"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update issue");
        });
    });

    describe("schema validation", () => {
        describe("createReleaseSchema", () => {
            it("validates minimal input", () => {
                const result = createReleaseSchema.safeParse({
                    organizationSlug: "my-org",
                    version: "1.0.0",
                    projects: ["my-project"]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createReleaseSchema.safeParse({
                    organizationSlug: "my-org",
                    version: "1.0.0",
                    projects: ["my-project", "other-project"],
                    dateReleased: "2024-01-15T00:00:00Z",
                    ref: "abc123",
                    url: "https://example.com/release"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing organizationSlug", () => {
                const result = createReleaseSchema.safeParse({
                    version: "1.0.0",
                    projects: ["my-project"]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty projects array", () => {
                const result = createReleaseSchema.safeParse({
                    organizationSlug: "my-org",
                    version: "1.0.0",
                    projects: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid url", () => {
                const result = createReleaseSchema.safeParse({
                    organizationSlug: "my-org",
                    version: "1.0.0",
                    projects: ["my-project"],
                    url: "not-a-url"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getIssueSchema", () => {
            it("validates correct input", () => {
                const result = getIssueSchema.safeParse({ issueId: "12345" });
                expect(result.success).toBe(true);
            });

            it("rejects missing issueId", () => {
                const result = getIssueSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty issueId", () => {
                const result = getIssueSchema.safeParse({ issueId: "" });
                expect(result.success).toBe(false);
            });
        });

        describe("getProjectSchema", () => {
            it("validates correct input", () => {
                const result = getProjectSchema.safeParse({
                    organizationSlug: "my-org",
                    projectSlug: "my-project"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing organizationSlug", () => {
                const result = getProjectSchema.safeParse({ projectSlug: "my-project" });
                expect(result.success).toBe(false);
            });

            it("rejects missing projectSlug", () => {
                const result = getProjectSchema.safeParse({ organizationSlug: "my-org" });
                expect(result.success).toBe(false);
            });
        });

        describe("listAlertRulesSchema", () => {
            it("validates correct input", () => {
                const result = listAlertRulesSchema.safeParse({
                    organizationSlug: "my-org",
                    projectSlug: "my-project"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing required fields", () => {
                const result = listAlertRulesSchema.safeParse({ organizationSlug: "my-org" });
                expect(result.success).toBe(false);
            });
        });

        describe("listIssueEventsSchema", () => {
            it("validates minimal input", () => {
                const result = listIssueEventsSchema.safeParse({ issueId: "12345" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listIssueEventsSchema.safeParse({
                    issueId: "12345",
                    full: true,
                    cursor: "next-page"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing issueId", () => {
                const result = listIssueEventsSchema.safeParse({ full: true });
                expect(result.success).toBe(false);
            });
        });

        describe("listIssuesSchema", () => {
            it("validates minimal input", () => {
                const result = listIssuesSchema.safeParse({ organizationSlug: "my-org" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listIssuesSchema.safeParse({
                    organizationSlug: "my-org",
                    projectSlug: "my-project",
                    query: "is:unresolved",
                    statsPeriod: "24h",
                    sort: "freq",
                    cursor: "next"
                });
                expect(result.success).toBe(true);
            });

            it("validates all sort options", () => {
                const sortOptions = ["date", "new", "freq", "user"] as const;
                for (const sort of sortOptions) {
                    const result = listIssuesSchema.safeParse({
                        organizationSlug: "my-org",
                        sort
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid sort option", () => {
                const result = listIssuesSchema.safeParse({
                    organizationSlug: "my-org",
                    sort: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing organizationSlug", () => {
                const result = listIssuesSchema.safeParse({ projectSlug: "my-project" });
                expect(result.success).toBe(false);
            });
        });

        describe("listOrganizationsSchema", () => {
            it("validates empty input", () => {
                const result = listOrganizationsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listProjectsSchema", () => {
            it("validates minimal input", () => {
                const result = listProjectsSchema.safeParse({ organizationSlug: "my-org" });
                expect(result.success).toBe(true);
            });

            it("validates with cursor", () => {
                const result = listProjectsSchema.safeParse({
                    organizationSlug: "my-org",
                    cursor: "page-2"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing organizationSlug", () => {
                const result = listProjectsSchema.safeParse({ cursor: "page-2" });
                expect(result.success).toBe(false);
            });
        });

        describe("listReleasesSchema", () => {
            it("validates minimal input", () => {
                const result = listReleasesSchema.safeParse({ organizationSlug: "my-org" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listReleasesSchema.safeParse({
                    organizationSlug: "my-org",
                    projectSlug: "my-project",
                    query: "1.0"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing organizationSlug", () => {
                const result = listReleasesSchema.safeParse({ projectSlug: "my-project" });
                expect(result.success).toBe(false);
            });
        });

        describe("updateIssueSchema", () => {
            it("validates minimal input", () => {
                const result = updateIssueSchema.safeParse({ issueId: "12345" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateIssueSchema.safeParse({
                    issueId: "12345",
                    status: "resolved",
                    assignedTo: "user@example.com",
                    hasSeen: true,
                    isBookmarked: false
                });
                expect(result.success).toBe(true);
            });

            it("validates all status options", () => {
                const statusOptions = ["resolved", "unresolved", "ignored"] as const;
                for (const status of statusOptions) {
                    const result = updateIssueSchema.safeParse({ issueId: "12345", status });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid status", () => {
                const result = updateIssueSchema.safeParse({
                    issueId: "12345",
                    status: "pending"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing issueId", () => {
                const result = updateIssueSchema.safeParse({ status: "resolved" });
                expect(result.success).toBe(false);
            });
        });
    });
});
