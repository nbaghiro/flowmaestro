/**
 * Zendesk Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Ticket Operations
import { executeCreateArticle, createArticleSchema } from "../operations/help-center/createArticle";
import { executeGetArticle, getArticleSchema } from "../operations/help-center/getArticle";
import { executeListArticles, listArticlesSchema } from "../operations/help-center/listArticles";
import {
    executeListCategories,
    listCategoriesSchema
} from "../operations/help-center/listCategories";
import { executeListSections, listSectionsSchema } from "../operations/help-center/listSections";
import {
    executeSearchArticles,
    searchArticlesSchema
} from "../operations/help-center/searchArticles";
import { executeUpdateArticle, updateArticleSchema } from "../operations/help-center/updateArticle";
import {
    executeAddTicketComment,
    addTicketCommentSchema
} from "../operations/tickets/addTicketComment";
import { executeCreateTicket, createTicketSchema } from "../operations/tickets/createTicket";
import {
    executeDeleteTicket,
    deleteTicketSchema
} from "../operations/tickets/deleteTicket";
import {
    executeGetTicket,
    getTicketSchema
} from "../operations/tickets/getTicket";
import { executeListTickets, listTicketsSchema } from "../operations/tickets/listTickets";
import { executeSearchTickets, searchTicketsSchema } from "../operations/tickets/searchTickets";
import {
    executeUpdateTicket,
    updateTicketSchema
} from "../operations/tickets/updateTicket";

// User Operations
import { executeCreateUser, createUserSchema } from "../operations/users/createUser";
import { executeGetCurrentUser, getCurrentUserSchema } from "../operations/users/getCurrentUser";
import { executeGetUser, getUserSchema } from "../operations/users/getUser";
import { executeListUsers, listUsersSchema } from "../operations/users/listUsers";
import { executeSearchUsers, searchUsersSchema } from "../operations/users/searchUsers";
import { executeUpdateUser, updateUserSchema } from "../operations/users/updateUser";

// Help Center Operations

import type { ZendeskClient } from "../client/ZendeskClient";
import type {
    ZendeskTicket,
    ZendeskUser,
    ZendeskArticle,
    ZendeskSection,
    ZendeskCategory
} from "../types";

// Type helpers for test assertions
interface TicketListData {
    tickets: ZendeskTicket[];
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

interface UserListData {
    users: ZendeskUser[];
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

interface ArticleListData {
    articles: ZendeskArticle[];
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

interface SectionListData {
    sections: ZendeskSection[];
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

interface CategoryListData {
    categories: ZendeskCategory[];
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

// Sample data for tests
const sampleTicket = {
    id: 35436,
    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35436.json",
    external_id: null,
    type: "incident" as const,
    subject: "Unable to login to dashboard",
    raw_subject: "Unable to login to dashboard",
    description: "I am unable to login to the dashboard. Getting a 403 error.",
    priority: "high" as const,
    status: "open" as const,
    recipient: null,
    requester_id: 20978392,
    submitter_id: 20978392,
    assignee_id: 15284729,
    organization_id: 57542,
    group_id: 22117439,
    collaborator_ids: [],
    follower_ids: [],
    email_cc_ids: [],
    forum_topic_id: null,
    problem_id: null,
    has_incidents: false,
    is_public: true,
    due_at: null,
    tags: ["login", "dashboard", "urgent"],
    custom_fields: [],
    satisfaction_rating: null,
    sharing_agreement_ids: [],
    fields: [],
    followup_ids: [],
    brand_id: 360001234567,
    allow_channelback: false,
    allow_attachments: true,
    via: {
        channel: "web",
        source: {
            from: {},
            to: {},
            rel: null
        }
    },
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T14:45:00Z"
};

const sampleUser = {
    id: 20978392,
    url: "https://flowmaestro.zendesk.com/api/v2/users/20978392.json",
    name: "John Smith",
    email: "john.smith@acmecorp.com",
    created_at: "2023-06-15T08:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    time_zone: "America/New_York",
    iana_time_zone: "America/New_York",
    phone: "+1-555-123-4567",
    shared_phone_number: null,
    photo: null,
    locale_id: 1,
    locale: "en-US",
    organization_id: 57542,
    role: "end-user" as const,
    verified: true,
    external_id: "ACME-USR-001",
    tags: ["vip", "enterprise"],
    alias: null,
    active: true,
    shared: false,
    shared_agent: false,
    last_login_at: "2024-01-15T10:25:00Z",
    two_factor_auth_enabled: true,
    signature: null,
    details: "Enterprise customer since 2023",
    notes: null,
    role_type: null,
    custom_role_id: null,
    moderator: false,
    ticket_restriction: null,
    only_private_comments: false,
    restricted_agent: false,
    suspended: false,
    default_group_id: null,
    report_csv: false,
    user_fields: {
        company_size: "500-1000",
        industry: "Technology"
    }
};

const sampleArticle = {
    id: 360012345678,
    url: "https://flowmaestro.zendesk.com/api/v2/help_center/articles/360012345678.json",
    html_url: "https://flowmaestro.zendesk.com/hc/en-us/articles/360012345678",
    author_id: 15284729,
    comments_disabled: false,
    draft: false,
    promoted: true,
    position: 0,
    vote_sum: 42,
    vote_count: 48,
    section_id: 360001234567,
    created_at: "2023-03-10T14:00:00Z",
    updated_at: "2024-01-10T16:30:00Z",
    name: "Getting Started with FlowMaestro",
    title: "Getting Started with FlowMaestro",
    source_locale: "en-us",
    locale: "en-us",
    outdated: false,
    outdated_locales: [],
    edited_at: "2024-01-10T16:30:00Z",
    user_segment_id: null,
    permission_group_id: 7654321,
    content_tag_ids: [],
    label_names: ["getting-started", "beginner", "tutorial"],
    body: "<h1>Welcome to FlowMaestro</h1><p>This guide will help you get started with creating your first workflow.</p>"
};

const sampleSection = {
    id: 360001234567,
    url: "https://flowmaestro.zendesk.com/api/v2/help_center/sections/360001234567.json",
    html_url: "https://flowmaestro.zendesk.com/hc/en-us/sections/360001234567",
    category_id: 360000123456,
    position: 0,
    sorting: "manual",
    created_at: "2023-01-15T10:00:00Z",
    updated_at: "2024-01-10T14:00:00Z",
    name: "Getting Started",
    description: "Learn the basics of FlowMaestro",
    locale: "en-us",
    source_locale: "en-us",
    outdated: false,
    parent_section_id: null,
    theme_template: "section_page"
};

const sampleCategory = {
    id: 360000123456,
    url: "https://flowmaestro.zendesk.com/api/v2/help_center/categories/360000123456.json",
    html_url: "https://flowmaestro.zendesk.com/hc/en-us/categories/360000123456",
    position: 0,
    created_at: "2023-01-10T09:00:00Z",
    updated_at: "2024-01-05T11:00:00Z",
    name: "Documentation",
    description: "Product documentation and guides",
    locale: "en-us",
    source_locale: "en-us",
    outdated: false
};

// Mock ZendeskClient factory
function createMockZendeskClient(): jest.Mocked<ZendeskClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        getSubdomain: jest.fn().mockReturnValue("flowmaestro"),
        getHelpCenterUrl: jest.fn((path: string) => `/help_center${path}`)
    } as unknown as jest.Mocked<ZendeskClient>;
}

describe("Zendesk Operation Executors", () => {
    let mockClient: jest.Mocked<ZendeskClient>;

    beforeEach(() => {
        mockClient = createMockZendeskClient();
    });

    // =====================
    // TICKET OPERATIONS
    // =====================

    describe("executeCreateTicket", () => {
        it("calls client with correct params for basic ticket", async () => {
            mockClient.post.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeCreateTicket(mockClient, {
                subject: "Test ticket",
                description: "Test description"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/tickets.json", {
                ticket: {
                    subject: "Test ticket",
                    comment: { body: "Test description" }
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({ ticket: sampleTicket });

            const result = await executeCreateTicket(mockClient, {
                subject: "Test ticket",
                description: "Test description"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTicket);
        });

        it("passes optional fields when provided", async () => {
            mockClient.post.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeCreateTicket(mockClient, {
                subject: "Urgent issue",
                description: "Critical problem",
                priority: "urgent",
                type: "incident",
                status: "open",
                tags: ["critical", "production"],
                assignee_id: 15284729,
                group_id: 22117439
            });

            expect(mockClient.post).toHaveBeenCalledWith("/tickets.json", {
                ticket: {
                    subject: "Urgent issue",
                    comment: { body: "Critical problem" },
                    priority: "urgent",
                    type: "incident",
                    status: "open",
                    tags: ["critical", "production"],
                    assignee_id: 15284729,
                    group_id: 22117439
                }
            });
        });

        it("passes requester_email correctly", async () => {
            mockClient.post.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeCreateTicket(mockClient, {
                subject: "Customer ticket",
                description: "Issue from customer",
                requester_email: "customer@example.com"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/tickets.json", {
                ticket: {
                    subject: "Customer ticket",
                    comment: { body: "Issue from customer" },
                    requester: { email: "customer@example.com" }
                }
            });
        });

        it("passes requester_id when no email provided", async () => {
            mockClient.post.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeCreateTicket(mockClient, {
                subject: "Customer ticket",
                description: "Issue from customer",
                requester_id: 12345
            });

            expect(mockClient.post).toHaveBeenCalledWith("/tickets.json", {
                ticket: {
                    subject: "Customer ticket",
                    comment: { body: "Issue from customer" },
                    requester_id: 12345
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("API error"));

            const result = await executeCreateTicket(mockClient, {
                subject: "Test",
                description: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API error");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce("string error");

            const result = await executeCreateTicket(mockClient, {
                subject: "Test",
                description: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create ticket");
        });
    });

    describe("executeGetTicket", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeGetTicket(mockClient, { ticket_id: 35436 });

            expect(mockClient.get).toHaveBeenCalledWith("/tickets/35436.json");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({ ticket: sampleTicket });

            const result = await executeGetTicket(mockClient, { ticket_id: 35436 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTicket);
        });

        it("returns error when ticket not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Ticket not found"));

            const result = await executeGetTicket(mockClient, { ticket_id: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Ticket not found");
        });
    });

    describe("executeUpdateTicket", () => {
        it("calls client with correct params for status update", async () => {
            mockClient.put.mockResolvedValueOnce({
                ticket: { ...sampleTicket, status: "pending" }
            });

            await executeUpdateTicket(mockClient, {
                ticket_id: 35436,
                status: "pending"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/tickets/35436.json", {
                ticket: { status: "pending" }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedTicket = { ...sampleTicket, status: "solved" as const };
            mockClient.put.mockResolvedValueOnce({ ticket: updatedTicket });

            const result = await executeUpdateTicket(mockClient, {
                ticket_id: 35436,
                status: "solved"
            });

            expect(result.success).toBe(true);
            expect((result.data as ZendeskTicket).status).toBe("solved");
        });

        it("passes comment for ticket updates", async () => {
            mockClient.put.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeUpdateTicket(mockClient, {
                ticket_id: 35436,
                comment: {
                    body: "Working on this issue",
                    public: false
                }
            });

            expect(mockClient.put).toHaveBeenCalledWith("/tickets/35436.json", {
                ticket: {
                    comment: {
                        body: "Working on this issue",
                        public: false
                    }
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Update failed"));

            const result = await executeUpdateTicket(mockClient, {
                ticket_id: 35436,
                status: "pending"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Update failed");
        });
    });

    describe("executeDeleteTicket", () => {
        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            await executeDeleteTicket(mockClient, { ticket_id: 35436 });

            expect(mockClient.delete).toHaveBeenCalledWith("/tickets/35436.json");
        });

        it("returns success with deleted flag", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            const result = await executeDeleteTicket(mockClient, { ticket_id: 35436 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ deleted: true, ticket_id: 35436 });
        });

        it("returns error when ticket not found", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("Ticket not found"));

            const result = await executeDeleteTicket(mockClient, { ticket_id: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Ticket not found");
        });
    });

    describe("executeListTickets", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                tickets: [sampleTicket],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListTickets(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/tickets.json", {});
        });

        it("calls client with pagination params", async () => {
            mockClient.get.mockResolvedValueOnce({
                tickets: [sampleTicket],
                count: 100,
                next_page: "https://example.zendesk.com/api/v2/tickets.json?page=2",
                previous_page: null
            });

            await executeListTickets(mockClient, {
                page: 1,
                per_page: 25,
                sort_by: "updated_at",
                sort_order: "desc"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/tickets.json", {
                page: 1,
                per_page: 25,
                sort_by: "updated_at",
                sort_order: "desc"
            });
        });

        it("returns normalized output with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                tickets: [sampleTicket],
                count: 100,
                next_page: "https://example.zendesk.com/api/v2/tickets.json?page=2",
                previous_page: null
            });

            const result = await executeListTickets(mockClient, { per_page: 25 });

            expect(result.success).toBe(true);
            const data = result.data as TicketListData;
            expect(data.tickets).toHaveLength(1);
            expect(data.count).toBe(100);
            expect(data.next_page).toBeDefined();
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Failed to fetch"));

            const result = await executeListTickets(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchTickets", () => {
        it("calls client with correct search query", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleTicket],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeSearchTickets(mockClient, { query: "status:open" });

            expect(mockClient.get).toHaveBeenCalledWith("/search.json", {
                query: "type:ticket status:open"
            });
        });

        it("passes sort params when provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleTicket],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeSearchTickets(mockClient, {
                query: "priority:high",
                sort_by: "created_at",
                sort_order: "desc"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/search.json", {
                query: "type:ticket priority:high",
                sort_by: "created_at",
                sort_order: "desc"
            });
        });

        it("returns normalized output with tickets", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleTicket],
                count: 45,
                next_page: null,
                previous_page: null
            });

            const result = await executeSearchTickets(mockClient, { query: "status:open" });

            expect(result.success).toBe(true);
            const data = result.data as TicketListData;
            expect(data.tickets).toHaveLength(1);
            expect(data.count).toBe(45);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Search failed"));

            const result = await executeSearchTickets(mockClient, { query: "invalid:" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeAddTicketComment", () => {
        it("calls client with correct params", async () => {
            mockClient.put.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeAddTicketComment(mockClient, {
                ticket_id: 35436,
                body: "Thanks for reaching out!"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/tickets/35436.json", {
                ticket: {
                    comment: {
                        body: "Thanks for reaching out!"
                    }
                }
            });
        });

        it("passes public flag for internal notes", async () => {
            mockClient.put.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeAddTicketComment(mockClient, {
                ticket_id: 35436,
                body: "Internal note",
                public: false
            });

            expect(mockClient.put).toHaveBeenCalledWith("/tickets/35436.json", {
                ticket: {
                    comment: {
                        body: "Internal note",
                        public: false
                    }
                }
            });
        });

        it("passes html_body when provided", async () => {
            mockClient.put.mockResolvedValueOnce({ ticket: sampleTicket });

            await executeAddTicketComment(mockClient, {
                ticket_id: 35436,
                body: "Plain text",
                html_body: "<p>HTML content</p>"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/tickets/35436.json", {
                ticket: {
                    comment: {
                        body: "Plain text",
                        html_body: "<p>HTML content</p>"
                    }
                }
            });
        });

        it("returns ticket on success", async () => {
            mockClient.put.mockResolvedValueOnce({ ticket: sampleTicket });

            const result = await executeAddTicketComment(mockClient, {
                ticket_id: 35436,
                body: "Comment"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTicket);
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Comment failed"));

            const result = await executeAddTicketComment(mockClient, {
                ticket_id: 35436,
                body: "Comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Comment failed");
        });
    });

    // =====================
    // USER OPERATIONS
    // =====================

    describe("executeCreateUser", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({ user: sampleUser });

            await executeCreateUser(mockClient, {
                name: "John Smith",
                email: "john.smith@example.com"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/users.json", {
                user: {
                    name: "John Smith",
                    email: "john.smith@example.com"
                }
            });
        });

        it("passes optional fields when provided", async () => {
            mockClient.post.mockResolvedValueOnce({ user: sampleUser });

            await executeCreateUser(mockClient, {
                name: "John Smith",
                email: "john.smith@example.com",
                role: "end-user",
                organization_id: 57542,
                phone: "+1-555-123-4567",
                tags: ["vip"]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/users.json", {
                user: {
                    name: "John Smith",
                    email: "john.smith@example.com",
                    role: "end-user",
                    organization_id: 57542,
                    phone: "+1-555-123-4567",
                    tags: ["vip"]
                }
            });
        });

        it("returns user on success", async () => {
            mockClient.post.mockResolvedValueOnce({ user: sampleUser });

            const result = await executeCreateUser(mockClient, {
                name: "John Smith",
                email: "john.smith@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleUser);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Email already exists"));

            const result = await executeCreateUser(mockClient, {
                name: "John",
                email: "duplicate@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Email already exists");
        });
    });

    describe("executeGetUser", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ user: sampleUser });

            await executeGetUser(mockClient, { user_id: 20978392 });

            expect(mockClient.get).toHaveBeenCalledWith("/users/20978392.json");
        });

        it("returns user on success", async () => {
            mockClient.get.mockResolvedValueOnce({ user: sampleUser });

            const result = await executeGetUser(mockClient, { user_id: 20978392 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleUser);
        });

        it("returns error when user not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("User not found"));

            const result = await executeGetUser(mockClient, { user_id: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("User not found");
        });
    });

    describe("executeUpdateUser", () => {
        it("calls client with correct params", async () => {
            mockClient.put.mockResolvedValueOnce({ user: sampleUser });

            await executeUpdateUser(mockClient, {
                user_id: 20978392,
                phone: "+1-555-999-8888"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/users/20978392.json", {
                user: { phone: "+1-555-999-8888" }
            });
        });

        it("returns updated user on success", async () => {
            const updatedUser = { ...sampleUser, phone: "+1-555-999-8888" };
            mockClient.put.mockResolvedValueOnce({ user: updatedUser });

            const result = await executeUpdateUser(mockClient, {
                user_id: 20978392,
                phone: "+1-555-999-8888"
            });

            expect(result.success).toBe(true);
            expect((result.data as ZendeskUser).phone).toBe("+1-555-999-8888");
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Update failed"));

            const result = await executeUpdateUser(mockClient, {
                user_id: 99999,
                name: "New Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Update failed");
        });
    });

    describe("executeListUsers", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                users: [sampleUser],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListUsers(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/users.json", {});
        });

        it("passes role filter when provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                users: [sampleUser],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListUsers(mockClient, { role: "agent" });

            expect(mockClient.get).toHaveBeenCalledWith("/users.json", { role: "agent" });
        });

        it("returns normalized output with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                users: [sampleUser],
                count: 100,
                next_page: "https://example.zendesk.com/api/v2/users.json?page=2",
                previous_page: null
            });

            const result = await executeListUsers(mockClient, { per_page: 25 });

            expect(result.success).toBe(true);
            const data = result.data as UserListData;
            expect(data.users).toHaveLength(1);
            expect(data.count).toBe(100);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Failed to list"));

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchUsers", () => {
        it("calls client with correct search query", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleUser],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeSearchUsers(mockClient, { query: "role:agent" });

            expect(mockClient.get).toHaveBeenCalledWith("/search.json", {
                query: "type:user role:agent"
            });
        });

        it("returns normalized output with users", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleUser],
                count: 15,
                next_page: null,
                previous_page: null
            });

            const result = await executeSearchUsers(mockClient, { query: "email:*@acme.com" });

            expect(result.success).toBe(true);
            const data = result.data as UserListData;
            expect(data.users).toHaveLength(1);
            expect(data.count).toBe(15);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Search failed"));

            const result = await executeSearchUsers(mockClient, { query: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCurrentUser", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce({ user: sampleUser });

            await executeGetCurrentUser(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/users/me.json");
        });

        it("returns current user on success", async () => {
            mockClient.get.mockResolvedValueOnce({ user: sampleUser });

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleUser);
        });

        it("returns error on unauthorized", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Unauthorized");
        });
    });

    // =====================
    // HELP CENTER OPERATIONS
    // =====================

    describe("executeListArticles", () => {
        it("calls client with default endpoint", async () => {
            mockClient.get.mockResolvedValueOnce({
                articles: [sampleArticle],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListArticles(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/articles.json", {});
        });

        it("calls section-specific endpoint when section_id provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                articles: [sampleArticle],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListArticles(mockClient, { section_id: 360001234567 });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/help_center/sections/360001234567/articles.json",
                {}
            );
        });

        it("calls category-specific endpoint when category_id provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                articles: [sampleArticle],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListArticles(mockClient, { category_id: 360000123456 });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/help_center/categories/360000123456/articles.json",
                {}
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                articles: [sampleArticle],
                count: 85,
                next_page: "https://example.zendesk.com/api/v2/help_center/articles.json?page=2",
                previous_page: null
            });

            const result = await executeListArticles(mockClient, { per_page: 25 });

            expect(result.success).toBe(true);
            const data = result.data as ArticleListData;
            expect(data.articles).toHaveLength(1);
            expect(data.count).toBe(85);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Failed to list"));

            const result = await executeListArticles(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetArticle", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ article: sampleArticle });

            await executeGetArticle(mockClient, { article_id: 360012345678 });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/help_center/articles/360012345678.json",
                {}
            );
        });

        it("passes locale when provided", async () => {
            mockClient.get.mockResolvedValueOnce({ article: sampleArticle });

            await executeGetArticle(mockClient, {
                article_id: 360012345678,
                locale: "en-us"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/articles/360012345678.json", {
                locale: "en-us"
            });
        });

        it("returns article on success", async () => {
            mockClient.get.mockResolvedValueOnce({ article: sampleArticle });

            const result = await executeGetArticle(mockClient, { article_id: 360012345678 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleArticle);
        });

        it("returns error when article not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Article not found"));

            const result = await executeGetArticle(mockClient, { article_id: 99999 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Article not found");
        });
    });

    describe("executeCreateArticle", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({ article: sampleArticle });

            await executeCreateArticle(mockClient, {
                section_id: 360001234567,
                title: "New Article",
                body: "<p>Article content</p>"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/help_center/sections/360001234567/articles.json",
                {
                    article: {
                        title: "New Article",
                        body: "<p>Article content</p>"
                    }
                }
            );
        });

        it("passes optional fields when provided", async () => {
            mockClient.post.mockResolvedValueOnce({ article: sampleArticle });

            await executeCreateArticle(mockClient, {
                section_id: 360001234567,
                title: "New Article",
                body: "<p>Content</p>",
                draft: true,
                promoted: false,
                label_names: ["api", "developer"]
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/help_center/sections/360001234567/articles.json",
                {
                    article: {
                        title: "New Article",
                        body: "<p>Content</p>",
                        draft: true,
                        promoted: false,
                        label_names: ["api", "developer"]
                    }
                }
            );
        });

        it("returns article on success", async () => {
            mockClient.post.mockResolvedValueOnce({ article: sampleArticle });

            const result = await executeCreateArticle(mockClient, {
                section_id: 360001234567,
                title: "New Article",
                body: "<p>Content</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleArticle);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Section not found"));

            const result = await executeCreateArticle(mockClient, {
                section_id: 99999,
                title: "Article",
                body: "Body"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Section not found");
        });
    });

    describe("executeUpdateArticle", () => {
        it("calls client with correct params", async () => {
            mockClient.put.mockResolvedValueOnce({ article: sampleArticle });

            await executeUpdateArticle(mockClient, {
                article_id: 360012345678,
                title: "Updated Title"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/help_center/articles/360012345678.json", {
                article: { title: "Updated Title" }
            });
        });

        it("returns updated article on success", async () => {
            const updatedArticle = { ...sampleArticle, title: "Updated Title" };
            mockClient.put.mockResolvedValueOnce({ article: updatedArticle });

            const result = await executeUpdateArticle(mockClient, {
                article_id: 360012345678,
                title: "Updated Title"
            });

            expect(result.success).toBe(true);
            expect((result.data as ZendeskArticle).title).toBe("Updated Title");
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Article not found"));

            const result = await executeUpdateArticle(mockClient, {
                article_id: 99999,
                title: "Title"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Article not found");
        });
    });

    describe("executeListSections", () => {
        it("calls client with default endpoint", async () => {
            mockClient.get.mockResolvedValueOnce({
                sections: [sampleSection],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListSections(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/sections.json", {});
        });

        it("calls category-specific endpoint when category_id provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                sections: [sampleSection],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListSections(mockClient, { category_id: 360000123456 });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/help_center/categories/360000123456/sections.json",
                {}
            );
        });

        it("returns normalized output with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                sections: [sampleSection],
                count: 12,
                next_page: null,
                previous_page: null
            });

            const result = await executeListSections(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as SectionListData;
            expect(data.sections).toHaveLength(1);
            expect(data.count).toBe(12);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Failed to list"));

            const result = await executeListSections(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListCategories", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce({
                categories: [sampleCategory],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListCategories(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/categories.json", {});
        });

        it("passes locale when provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                categories: [sampleCategory],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeListCategories(mockClient, { locale: "en-us" });

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/categories.json", {
                locale: "en-us"
            });
        });

        it("returns normalized output with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                categories: [sampleCategory],
                count: 5,
                next_page: null,
                previous_page: null
            });

            const result = await executeListCategories(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as CategoryListData;
            expect(data.categories).toHaveLength(1);
            expect(data.count).toBe(5);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Failed to list"));

            const result = await executeListCategories(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchArticles", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleArticle],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeSearchArticles(mockClient, { query: "getting started" });

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/articles/search.json", {
                query: "getting started"
            });
        });

        it("passes filter params when provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleArticle],
                count: 1,
                next_page: null,
                previous_page: null
            });

            await executeSearchArticles(mockClient, {
                query: "tutorial",
                locale: "en-us",
                section_id: 360001234567,
                label_names: "beginner"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/help_center/articles/search.json", {
                query: "tutorial",
                locale: "en-us",
                section: 360001234567,
                label_names: "beginner"
            });
        });

        it("returns normalized output with articles", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleArticle],
                count: 5,
                next_page: null,
                previous_page: null
            });

            const result = await executeSearchArticles(mockClient, { query: "workflow" });

            expect(result.success).toBe(true);
            const data = result.data as ArticleListData;
            expect(data.articles).toHaveLength(1);
            expect(data.count).toBe(5);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Search failed"));

            const result = await executeSearchArticles(mockClient, { query: "" });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    // =====================
    // SCHEMA VALIDATION
    // =====================

    describe("schema validation", () => {
        describe("createTicketSchema", () => {
            it("validates minimal input", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test Subject",
                    description: "Test description"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test Subject",
                    description: "Test description",
                    priority: "high",
                    type: "incident",
                    status: "open",
                    requester_email: "test@example.com",
                    assignee_id: 12345,
                    group_id: 67890,
                    tags: ["urgent", "bug"],
                    external_id: "EXT-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing subject", () => {
                const result = createTicketSchema.safeParse({
                    description: "Test description"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid priority", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test",
                    description: "Test",
                    priority: "critical"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid requester_email", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test",
                    description: "Test",
                    requester_email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTicketSchema", () => {
            it("validates ticket_id", () => {
                const result = getTicketSchema.safeParse({ ticket_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("rejects missing ticket_id", () => {
                const result = getTicketSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric ticket_id", () => {
                const result = getTicketSchema.safeParse({ ticket_id: "abc" });
                expect(result.success).toBe(false);
            });
        });

        describe("updateTicketSchema", () => {
            it("validates minimal input", () => {
                const result = updateTicketSchema.safeParse({
                    ticket_id: 12345,
                    status: "pending"
                });
                expect(result.success).toBe(true);
            });

            it("validates with comment", () => {
                const result = updateTicketSchema.safeParse({
                    ticket_id: 12345,
                    comment: {
                        body: "Comment text",
                        public: false
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = updateTicketSchema.safeParse({
                    ticket_id: 12345,
                    status: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteTicketSchema", () => {
            it("validates ticket_id", () => {
                const result = deleteTicketSchema.safeParse({ ticket_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("rejects missing ticket_id", () => {
                const result = deleteTicketSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listTicketsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listTicketsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listTicketsSchema.safeParse({
                    page: 1,
                    per_page: 25,
                    sort_by: "updated_at",
                    sort_order: "desc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid per_page over 100", () => {
                const result = listTicketsSchema.safeParse({ per_page: 200 });
                expect(result.success).toBe(false);
            });

            it("rejects invalid sort_by", () => {
                const result = listTicketsSchema.safeParse({ sort_by: "invalid" });
                expect(result.success).toBe(false);
            });
        });

        describe("searchTicketsSchema", () => {
            it("validates minimal input", () => {
                const result = searchTicketsSchema.safeParse({ query: "status:open" });
                expect(result.success).toBe(true);
            });

            it("validates with sort params", () => {
                const result = searchTicketsSchema.safeParse({
                    query: "priority:high",
                    sort_by: "created_at",
                    sort_order: "asc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing query", () => {
                const result = searchTicketsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("addTicketCommentSchema", () => {
            it("validates minimal input", () => {
                const result = addTicketCommentSchema.safeParse({
                    ticket_id: 12345,
                    body: "Comment text"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = addTicketCommentSchema.safeParse({
                    ticket_id: 12345,
                    body: "Comment text",
                    html_body: "<p>Comment</p>",
                    public: false,
                    author_id: 67890
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing body", () => {
                const result = addTicketCommentSchema.safeParse({ ticket_id: 12345 });
                expect(result.success).toBe(false);
            });
        });

        describe("createUserSchema", () => {
            it("validates minimal input", () => {
                const result = createUserSchema.safeParse({
                    name: "John Smith",
                    email: "john@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = createUserSchema.safeParse({
                    name: "John Smith",
                    email: "john@example.com",
                    role: "agent",
                    organization_id: 12345,
                    phone: "+1-555-123-4567",
                    tags: ["vip"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = createUserSchema.safeParse({
                    name: "John",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid role", () => {
                const result = createUserSchema.safeParse({
                    name: "John",
                    email: "john@example.com",
                    role: "superadmin"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getUserSchema", () => {
            it("validates user_id", () => {
                const result = getUserSchema.safeParse({ user_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("rejects missing user_id", () => {
                const result = getUserSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateUserSchema", () => {
            it("validates minimal input", () => {
                const result = updateUserSchema.safeParse({
                    user_id: 12345,
                    name: "New Name"
                });
                expect(result.success).toBe(true);
            });

            it("validates suspended field", () => {
                const result = updateUserSchema.safeParse({
                    user_id: 12345,
                    suspended: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing user_id", () => {
                const result = updateUserSchema.safeParse({ name: "Name" });
                expect(result.success).toBe(false);
            });
        });

        describe("listUsersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listUsersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with role filter", () => {
                const result = listUsersSchema.safeParse({ role: "agent" });
                expect(result.success).toBe(true);
            });

            it("rejects invalid role", () => {
                const result = listUsersSchema.safeParse({ role: "superuser" });
                expect(result.success).toBe(false);
            });

            it("rejects invalid per_page over 100", () => {
                const result = listUsersSchema.safeParse({ per_page: 150 });
                expect(result.success).toBe(false);
            });
        });

        describe("searchUsersSchema", () => {
            it("validates minimal input", () => {
                const result = searchUsersSchema.safeParse({ query: "role:agent" });
                expect(result.success).toBe(true);
            });

            it("rejects missing query", () => {
                const result = searchUsersSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getCurrentUserSchema", () => {
            it("validates empty input", () => {
                const result = getCurrentUserSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listArticlesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listArticlesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with section_id", () => {
                const result = listArticlesSchema.safeParse({ section_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("validates with sort params", () => {
                const result = listArticlesSchema.safeParse({
                    sort_by: "position",
                    sort_order: "asc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid sort_by", () => {
                const result = listArticlesSchema.safeParse({ sort_by: "invalid" });
                expect(result.success).toBe(false);
            });
        });

        describe("getArticleSchema", () => {
            it("validates article_id", () => {
                const result = getArticleSchema.safeParse({ article_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("validates with locale", () => {
                const result = getArticleSchema.safeParse({
                    article_id: 12345,
                    locale: "en-us"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing article_id", () => {
                const result = getArticleSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createArticleSchema", () => {
            it("validates minimal input", () => {
                const result = createArticleSchema.safeParse({
                    section_id: 12345,
                    title: "Article Title",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = createArticleSchema.safeParse({
                    section_id: 12345,
                    title: "Article Title",
                    body: "<p>Content</p>",
                    draft: true,
                    promoted: false,
                    label_names: ["api", "guide"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty title", () => {
                const result = createArticleSchema.safeParse({
                    section_id: 12345,
                    title: "",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing section_id", () => {
                const result = createArticleSchema.safeParse({
                    title: "Title",
                    body: "Body"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateArticleSchema", () => {
            it("validates minimal input", () => {
                const result = updateArticleSchema.safeParse({
                    article_id: 12345,
                    title: "New Title"
                });
                expect(result.success).toBe(true);
            });

            it("validates publish operation", () => {
                const result = updateArticleSchema.safeParse({
                    article_id: 12345,
                    draft: false,
                    promoted: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing article_id", () => {
                const result = updateArticleSchema.safeParse({ title: "Title" });
                expect(result.success).toBe(false);
            });
        });

        describe("listSectionsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listSectionsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with category_id", () => {
                const result = listSectionsSchema.safeParse({ category_id: 12345 });
                expect(result.success).toBe(true);
            });

            it("validates with sort params", () => {
                const result = listSectionsSchema.safeParse({
                    sort_by: "name",
                    sort_order: "asc"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listCategoriesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listCategoriesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with locale", () => {
                const result = listCategoriesSchema.safeParse({ locale: "en-us" });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listCategoriesSchema.safeParse({
                    page: 1,
                    per_page: 50
                });
                expect(result.success).toBe(true);
            });
        });

        describe("searchArticlesSchema", () => {
            it("validates minimal input", () => {
                const result = searchArticlesSchema.safeParse({ query: "getting started" });
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = searchArticlesSchema.safeParse({
                    query: "tutorial",
                    locale: "en-us",
                    section_id: 12345,
                    label_names: "beginner"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing query", () => {
                const result = searchArticlesSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });
    });
});
