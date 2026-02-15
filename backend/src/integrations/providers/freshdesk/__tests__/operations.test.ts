/**
 * Freshdesk Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Ticket operations
import {
    executeListAgents,
    listAgentsSchema,
    executeGetAgent,
    getAgentSchema,
    executeGetCurrentAgent,
    getCurrentAgentSchema
} from "../operations/agents";
import {
    executeCreateCompany,
    createCompanySchema,
    executeGetCompany,
    getCompanySchema,
    executeUpdateCompany,
    updateCompanySchema,
    executeListCompanies,
    listCompaniesSchema
} from "../operations/companies";
import {
    executeCreateContact,
    createContactSchema,
    executeGetContact,
    getContactSchema,
    executeUpdateContact,
    updateContactSchema,
    executeListContacts,
    listContactsSchema,
    executeSearchContacts,
    searchContactsSchema
} from "../operations/contacts";
import {
    executeCreateTicket,
    createTicketSchema,
    executeGetTicket,
    getTicketSchema,
    executeUpdateTicket,
    updateTicketSchema,
    executeDeleteTicket,
    deleteTicketSchema,
    executeListTickets,
    listTicketsSchema,
    executeSearchTickets,
    searchTicketsSchema,
    executeAddTicketReply,
    addTicketReplySchema,
    executeAddTicketNote,
    addTicketNoteSchema
} from "../operations/tickets";

// Contact operations

// Company operations

// Agent operations

import type { FreshdeskClient } from "../client/FreshdeskClient";
import type {
    FreshdeskTicket,
    FreshdeskContact,
    FreshdeskCompany,
    FreshdeskAgent,
    FreshdeskConversation,
    FreshdeskSearchResponse
} from "../types";

// Mock FreshdeskClient factory
function createMockFreshdeskClient(): jest.Mocked<FreshdeskClient> {
    return {
        // Ticket operations
        createTicket: jest.fn(),
        getTicket: jest.fn(),
        updateTicket: jest.fn(),
        deleteTicket: jest.fn(),
        listTickets: jest.fn(),
        searchTickets: jest.fn(),
        addTicketReply: jest.fn(),
        addTicketNote: jest.fn(),
        // Contact operations
        createContact: jest.fn(),
        getContact: jest.fn(),
        updateContact: jest.fn(),
        listContacts: jest.fn(),
        searchContacts: jest.fn(),
        // Company operations
        createCompany: jest.fn(),
        getCompany: jest.fn(),
        updateCompany: jest.fn(),
        listCompanies: jest.fn(),
        // Agent operations
        listAgents: jest.fn(),
        getAgent: jest.fn(),
        getCurrentAgent: jest.fn(),
        // Base methods
        getSubdomain: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<FreshdeskClient>;
}

// Sample fixtures
const sampleTicket: FreshdeskTicket = {
    id: 43000123456,
    subject: "Unable to login to dashboard",
    description: "<p>I am getting an error when trying to login.</p>",
    description_text: "I am getting an error when trying to login.",
    status: 2,
    priority: 2,
    source: 1,
    type: "Problem",
    requester_id: 43000098765,
    responder_id: 43000012345,
    company_id: 43000067890,
    group_id: 43000001234,
    tags: ["login", "permission"],
    cc_emails: ["admin@techcorp.com"],
    spam: false,
    created_at: "2024-01-20T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    attachments: [],
    custom_fields: {}
};

const sampleContact: FreshdeskContact = {
    id: 43000098765,
    name: "John Doe",
    email: "john.doe@techcorp.com",
    phone: "+1-555-0200",
    mobile: "+1-555-0201",
    company_id: 43000067890,
    active: true,
    deleted: false,
    created_at: "2023-06-15T10:00:00Z",
    updated_at: "2024-01-18T15:30:00Z",
    custom_fields: {}
};

const sampleCompany: FreshdeskCompany = {
    id: 43000067890,
    name: "TechCorp Industries",
    description: "Enterprise software company providing CRM solutions",
    domains: ["techcorp.com", "techcorp.io"],
    created_at: "2020-03-15T10:00:00Z",
    updated_at: "2024-01-18T09:30:00Z",
    custom_fields: {}
};

const sampleAgent: FreshdeskAgent = {
    id: 43000012345,
    available: true,
    occasional: false,
    signature: "<p>Best regards,<br>Sarah Mitchell</p>",
    ticket_scope: 1,
    skill_ids: [1001, 1002],
    group_ids: [43000001234],
    role_ids: [43000000016],
    type: "support_agent",
    available_since: "2024-01-15T09:00:00Z",
    created_at: "2023-06-01T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    last_active_at: "2024-01-20T14:10:00Z",
    contact: {
        id: 43000054321,
        name: "Sarah Mitchell",
        email: "sarah.mitchell@acmesupport.com",
        phone: "+1-555-0123",
        mobile: "+1-555-0124",
        active: true,
        job_title: "Senior Support Engineer"
    }
};

const sampleConversation: FreshdeskConversation = {
    id: 43000456789,
    body: "<p>Hi John, Thank you for contacting us.</p>",
    body_text: "Hi John, Thank you for contacting us.",
    incoming: false,
    private: false,
    user_id: 43000012345,
    support_email: "support@acmesupport.freshdesk.com",
    source: 0,
    ticket_id: 43000123456,
    to_emails: ["john.doe@techcorp.com"],
    from_email: "support@acmesupport.freshdesk.com",
    cc_emails: [],
    bcc_emails: [],
    created_at: "2024-01-20T15:00:00Z",
    updated_at: "2024-01-20T15:00:00Z",
    attachments: []
};

describe("Freshdesk Operation Executors", () => {
    let mockClient: jest.Mocked<FreshdeskClient>;

    beforeEach(() => {
        mockClient = createMockFreshdeskClient();
    });

    // ============================================
    // Ticket Operations
    // ============================================

    describe("executeCreateTicket", () => {
        it("calls client with correct params", async () => {
            mockClient.createTicket.mockResolvedValueOnce(sampleTicket);

            await executeCreateTicket(mockClient, {
                subject: "Test Ticket",
                description: "Test description",
                email: "test@example.com",
                priority: 2,
                status: 2
            });

            expect(mockClient.createTicket).toHaveBeenCalledWith({
                subject: "Test Ticket",
                description: "Test description",
                email: "test@example.com",
                priority: 2,
                status: 2
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createTicket.mockResolvedValueOnce(sampleTicket);

            const result = await executeCreateTicket(mockClient, {
                subject: "Test Ticket",
                description: "Test description",
                email: "test@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTicket);
        });

        it("includes optional fields when provided", async () => {
            mockClient.createTicket.mockResolvedValueOnce(sampleTicket);

            await executeCreateTicket(mockClient, {
                subject: "Urgent Issue",
                description: "Critical problem",
                requester_id: 43000098765,
                priority: 4,
                status: 2,
                type: "Incident",
                tags: ["urgent", "production"],
                custom_fields: { severity: "high" }
            });

            expect(mockClient.createTicket).toHaveBeenCalledWith({
                subject: "Urgent Issue",
                description: "Critical problem",
                requester_id: 43000098765,
                priority: 4,
                status: 2,
                type: "Incident",
                tags: ["urgent", "production"],
                custom_fields: { severity: "high" }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createTicket.mockRejectedValueOnce(
                new Error("Freshdesk API error: email: is required")
            );

            const result = await executeCreateTicket(mockClient, {
                subject: "Test",
                description: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Freshdesk API error: email: is required");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createTicket.mockRejectedValueOnce("string error");

            const result = await executeCreateTicket(mockClient, {
                subject: "Test",
                description: "Test",
                email: "test@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create ticket");
        });
    });

    describe("executeGetTicket", () => {
        it("calls client with correct params", async () => {
            mockClient.getTicket.mockResolvedValueOnce(sampleTicket);

            await executeGetTicket(mockClient, {
                ticketId: 43000123456
            });

            expect(mockClient.getTicket).toHaveBeenCalledWith(43000123456, undefined);
        });

        it("passes include parameter when provided", async () => {
            mockClient.getTicket.mockResolvedValueOnce(sampleTicket);

            await executeGetTicket(mockClient, {
                ticketId: 43000123456,
                include: "requester,company"
            });

            expect(mockClient.getTicket).toHaveBeenCalledWith(43000123456, "requester,company");
        });

        it("returns normalized output on success", async () => {
            mockClient.getTicket.mockResolvedValueOnce(sampleTicket);

            const result = await executeGetTicket(mockClient, {
                ticketId: 43000123456
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTicket);
        });

        it("returns error on client failure", async () => {
            mockClient.getTicket.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeGetTicket(mockClient, {
                ticketId: 99999999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Freshdesk.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateTicket", () => {
        it("calls client with correct params", async () => {
            const updatedTicket = { ...sampleTicket, status: 4 as const };
            mockClient.updateTicket.mockResolvedValueOnce(updatedTicket);

            await executeUpdateTicket(mockClient, {
                ticketId: 43000123456,
                status: 4
            });

            expect(mockClient.updateTicket).toHaveBeenCalledWith(43000123456, {
                status: 4
            });
        });

        it("includes all provided update fields", async () => {
            const updatedTicket = { ...sampleTicket, status: 4 as const, priority: 3 as const };
            mockClient.updateTicket.mockResolvedValueOnce(updatedTicket);

            await executeUpdateTicket(mockClient, {
                ticketId: 43000123456,
                subject: "Updated Subject",
                description: "Updated description",
                priority: 3,
                status: 4,
                responder_id: 43000012346,
                tags: ["resolved"],
                custom_fields: { resolution: "password reset" }
            });

            expect(mockClient.updateTicket).toHaveBeenCalledWith(43000123456, {
                subject: "Updated Subject",
                description: "Updated description",
                priority: 3,
                status: 4,
                responder_id: 43000012346,
                tags: ["resolved"],
                custom_fields: { resolution: "password reset" }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedTicket = { ...sampleTicket, status: 4 as const };
            mockClient.updateTicket.mockResolvedValueOnce(updatedTicket);

            const result = await executeUpdateTicket(mockClient, {
                ticketId: 43000123456,
                status: 4
            });

            expect(result.success).toBe(true);
            expect(result.data?.status).toBe(4);
        });

        it("returns error on client failure", async () => {
            mockClient.updateTicket.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeUpdateTicket(mockClient, {
                ticketId: 99999999999,
                status: 4
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteTicket", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteTicket.mockResolvedValueOnce(undefined);

            await executeDeleteTicket(mockClient, {
                ticketId: 43000123456
            });

            expect(mockClient.deleteTicket).toHaveBeenCalledWith(43000123456);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteTicket.mockResolvedValueOnce(undefined);

            const result = await executeDeleteTicket(mockClient, {
                ticketId: 43000123456
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                ticketId: 43000123456
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteTicket.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeDeleteTicket(mockClient, {
                ticketId: 99999999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListTickets", () => {
        it("calls client with default params", async () => {
            mockClient.listTickets.mockResolvedValueOnce([sampleTicket]);

            await executeListTickets(mockClient, {});

            expect(mockClient.listTickets).toHaveBeenCalledWith({});
        });

        it("calls client with filter params", async () => {
            mockClient.listTickets.mockResolvedValueOnce([sampleTicket]);

            await executeListTickets(mockClient, {
                filter: "new_and_my_open",
                requester_id: 43000098765,
                company_id: 43000067890,
                updated_since: "2024-01-01T00:00:00Z",
                per_page: 50,
                page: 2
            });

            expect(mockClient.listTickets).toHaveBeenCalledWith({
                filter: "new_and_my_open",
                requester_id: 43000098765,
                company_id: 43000067890,
                updated_since: "2024-01-01T00:00:00Z",
                per_page: 50,
                page: 2
            });
        });

        it("returns normalized output on success", async () => {
            const tickets = [sampleTicket, { ...sampleTicket, id: 43000123457 }];
            mockClient.listTickets.mockResolvedValueOnce(tickets);

            const result = await executeListTickets(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.tickets).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listTickets.mockRejectedValueOnce(
                new Error("Freshdesk authentication failed.")
            );

            const result = await executeListTickets(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchTickets", () => {
        it("calls client with query", async () => {
            const searchResponse: FreshdeskSearchResponse<FreshdeskTicket> = {
                results: [sampleTicket],
                total: 1
            };
            mockClient.searchTickets.mockResolvedValueOnce(searchResponse);

            await executeSearchTickets(mockClient, {
                query: "status:2 AND priority:4"
            });

            expect(mockClient.searchTickets).toHaveBeenCalledWith("status:2 AND priority:4");
        });

        it("returns normalized output on success", async () => {
            const searchResponse: FreshdeskSearchResponse<FreshdeskTicket> = {
                results: [sampleTicket],
                total: 1
            };
            mockClient.searchTickets.mockResolvedValueOnce(searchResponse);

            const result = await executeSearchTickets(mockClient, {
                query: "status:2"
            });

            expect(result.success).toBe(true);
            expect(result.data?.tickets).toHaveLength(1);
            expect(result.data?.total).toBe(1);
        });

        it("handles empty results", async () => {
            const searchResponse: FreshdeskSearchResponse<FreshdeskTicket> = {
                results: [],
                total: 0
            };
            mockClient.searchTickets.mockResolvedValueOnce(searchResponse);

            const result = await executeSearchTickets(mockClient, {
                query: "status:99"
            });

            expect(result.success).toBe(true);
            expect(result.data?.tickets).toHaveLength(0);
            expect(result.data?.total).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.searchTickets.mockRejectedValueOnce(
                new Error("Invalid search query syntax")
            );

            const result = await executeSearchTickets(mockClient, {
                query: "invalid:::query"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeAddTicketReply", () => {
        it("calls client with correct params", async () => {
            mockClient.addTicketReply.mockResolvedValueOnce(sampleConversation);

            await executeAddTicketReply(mockClient, {
                ticketId: 43000123456,
                body: "<p>Thank you for contacting us.</p>"
            });

            expect(mockClient.addTicketReply).toHaveBeenCalledWith(43000123456, {
                body: "<p>Thank you for contacting us.</p>"
            });
        });

        it("includes user_id when provided", async () => {
            mockClient.addTicketReply.mockResolvedValueOnce(sampleConversation);

            await executeAddTicketReply(mockClient, {
                ticketId: 43000123456,
                body: "<p>Reply from specific user.</p>",
                user_id: 43000012345
            });

            expect(mockClient.addTicketReply).toHaveBeenCalledWith(43000123456, {
                body: "<p>Reply from specific user.</p>",
                user_id: 43000012345
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.addTicketReply.mockResolvedValueOnce(sampleConversation);

            const result = await executeAddTicketReply(mockClient, {
                ticketId: 43000123456,
                body: "<p>Reply content.</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleConversation);
        });

        it("returns error on client failure", async () => {
            mockClient.addTicketReply.mockRejectedValueOnce(
                new Error("Cannot reply to a closed ticket")
            );

            const result = await executeAddTicketReply(mockClient, {
                ticketId: 43000123456,
                body: "<p>Reply</p>"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeAddTicketNote", () => {
        it("calls client with correct params", async () => {
            const privateNote = { ...sampleConversation, private: true };
            mockClient.addTicketNote.mockResolvedValueOnce(privateNote);

            await executeAddTicketNote(mockClient, {
                ticketId: 43000123456,
                body: "<p>Internal note.</p>"
            });

            expect(mockClient.addTicketNote).toHaveBeenCalledWith(43000123456, {
                body: "<p>Internal note.</p>",
                private: true
            });
        });

        it("handles public notes", async () => {
            const publicNote = { ...sampleConversation, private: false };
            mockClient.addTicketNote.mockResolvedValueOnce(publicNote);

            await executeAddTicketNote(mockClient, {
                ticketId: 43000123456,
                body: "<p>Public note.</p>",
                private: false
            });

            expect(mockClient.addTicketNote).toHaveBeenCalledWith(43000123456, {
                body: "<p>Public note.</p>",
                private: false
            });
        });

        it("includes notify_emails when provided", async () => {
            const privateNote = { ...sampleConversation, private: true };
            mockClient.addTicketNote.mockResolvedValueOnce(privateNote);

            await executeAddTicketNote(mockClient, {
                ticketId: 43000123456,
                body: "<p>Note with notification.</p>",
                notify_emails: ["manager@example.com", "admin@example.com"]
            });

            expect(mockClient.addTicketNote).toHaveBeenCalledWith(43000123456, {
                body: "<p>Note with notification.</p>",
                private: true,
                notify_emails: ["manager@example.com", "admin@example.com"]
            });
        });

        it("returns normalized output on success", async () => {
            const privateNote = { ...sampleConversation, private: true };
            mockClient.addTicketNote.mockResolvedValueOnce(privateNote);

            const result = await executeAddTicketNote(mockClient, {
                ticketId: 43000123456,
                body: "<p>Note content.</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data?.private).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.addTicketNote.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeAddTicketNote(mockClient, {
                ticketId: 99999999999,
                body: "<p>Note</p>"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // Contact Operations
    // ============================================

    describe("executeCreateContact", () => {
        it("calls client with correct params", async () => {
            mockClient.createContact.mockResolvedValueOnce(sampleContact);

            await executeCreateContact(mockClient, {
                name: "John Doe",
                email: "john.doe@example.com"
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                name: "John Doe",
                email: "john.doe@example.com"
            });
        });

        it("includes optional fields when provided", async () => {
            mockClient.createContact.mockResolvedValueOnce(sampleContact);

            await executeCreateContact(mockClient, {
                name: "John Doe",
                email: "john.doe@example.com",
                phone: "+1-555-0100",
                mobile: "+1-555-0101",
                company_id: 43000067890,
                custom_fields: { department: "Engineering" }
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                name: "John Doe",
                email: "john.doe@example.com",
                phone: "+1-555-0100",
                mobile: "+1-555-0101",
                company_id: 43000067890,
                custom_fields: { department: "Engineering" }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createContact.mockResolvedValueOnce(sampleContact);

            const result = await executeCreateContact(mockClient, {
                name: "John Doe"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleContact);
        });

        it("returns error on client failure", async () => {
            mockClient.createContact.mockRejectedValueOnce(
                new Error("A contact with this email already exists")
            );

            const result = await executeCreateContact(mockClient, {
                name: "John Doe",
                email: "existing@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeGetContact", () => {
        it("calls client with correct params", async () => {
            mockClient.getContact.mockResolvedValueOnce(sampleContact);

            await executeGetContact(mockClient, {
                contactId: 43000098765
            });

            expect(mockClient.getContact).toHaveBeenCalledWith(43000098765);
        });

        it("returns normalized output on success", async () => {
            mockClient.getContact.mockResolvedValueOnce(sampleContact);

            const result = await executeGetContact(mockClient, {
                contactId: 43000098765
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleContact);
        });

        it("returns error on client failure", async () => {
            mockClient.getContact.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeGetContact(mockClient, {
                contactId: 99999999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateContact", () => {
        it("calls client with correct params", async () => {
            const updatedContact = { ...sampleContact, phone: "+1-555-0299" };
            mockClient.updateContact.mockResolvedValueOnce(updatedContact);

            await executeUpdateContact(mockClient, {
                contactId: 43000098765,
                phone: "+1-555-0299"
            });

            expect(mockClient.updateContact).toHaveBeenCalledWith(43000098765, {
                phone: "+1-555-0299"
            });
        });

        it("includes all update fields when provided", async () => {
            const updatedContact = { ...sampleContact, name: "John Smith" };
            mockClient.updateContact.mockResolvedValueOnce(updatedContact);

            await executeUpdateContact(mockClient, {
                contactId: 43000098765,
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "+1-555-0300",
                custom_fields: { title: "Director" }
            });

            expect(mockClient.updateContact).toHaveBeenCalledWith(43000098765, {
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "+1-555-0300",
                custom_fields: { title: "Director" }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedContact = { ...sampleContact, phone: "+1-555-0299" };
            mockClient.updateContact.mockResolvedValueOnce(updatedContact);

            const result = await executeUpdateContact(mockClient, {
                contactId: 43000098765,
                phone: "+1-555-0299"
            });

            expect(result.success).toBe(true);
            expect(result.data?.phone).toBe("+1-555-0299");
        });

        it("returns error on client failure", async () => {
            mockClient.updateContact.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeUpdateContact(mockClient, {
                contactId: 99999999999,
                name: "Updated Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListContacts", () => {
        it("calls client with default params", async () => {
            mockClient.listContacts.mockResolvedValueOnce([sampleContact]);

            await executeListContacts(mockClient, {});

            expect(mockClient.listContacts).toHaveBeenCalledWith({});
        });

        it("calls client with filter params", async () => {
            mockClient.listContacts.mockResolvedValueOnce([sampleContact]);

            await executeListContacts(mockClient, {
                email: "john@example.com",
                phone: "+1-555-0200",
                company_id: 43000067890,
                per_page: 50,
                page: 2
            });

            expect(mockClient.listContacts).toHaveBeenCalledWith({
                email: "john@example.com",
                phone: "+1-555-0200",
                company_id: 43000067890,
                per_page: 50,
                page: 2
            });
        });

        it("returns normalized output on success", async () => {
            const contacts = [sampleContact, { ...sampleContact, id: 43000098766 }];
            mockClient.listContacts.mockResolvedValueOnce(contacts);

            const result = await executeListContacts(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listContacts.mockRejectedValueOnce(
                new Error("Freshdesk authentication failed.")
            );

            const result = await executeListContacts(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchContacts", () => {
        it("calls client with query", async () => {
            const searchResponse: FreshdeskSearchResponse<FreshdeskContact> = {
                results: [sampleContact],
                total: 1
            };
            mockClient.searchContacts.mockResolvedValueOnce(searchResponse);

            await executeSearchContacts(mockClient, {
                query: "name:'John'"
            });

            expect(mockClient.searchContacts).toHaveBeenCalledWith("name:'John'");
        });

        it("returns normalized output on success", async () => {
            const searchResponse: FreshdeskSearchResponse<FreshdeskContact> = {
                results: [sampleContact],
                total: 1
            };
            mockClient.searchContacts.mockResolvedValueOnce(searchResponse);

            const result = await executeSearchContacts(mockClient, {
                query: "email:'john@example.com'"
            });

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(1);
            expect(result.data?.total).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.searchContacts.mockRejectedValueOnce(
                new Error("Invalid search query syntax")
            );

            const result = await executeSearchContacts(mockClient, {
                query: "invalid:::query"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Company Operations
    // ============================================

    describe("executeCreateCompany", () => {
        it("calls client with correct params", async () => {
            mockClient.createCompany.mockResolvedValueOnce(sampleCompany);

            await executeCreateCompany(mockClient, {
                name: "TechCorp Industries"
            });

            expect(mockClient.createCompany).toHaveBeenCalledWith({
                name: "TechCorp Industries"
            });
        });

        it("includes optional fields when provided", async () => {
            mockClient.createCompany.mockResolvedValueOnce(sampleCompany);

            await executeCreateCompany(mockClient, {
                name: "TechCorp Industries",
                description: "Enterprise software company",
                domains: ["techcorp.com", "techcorp.io"],
                custom_fields: { account_manager: "Maria Garcia" }
            });

            expect(mockClient.createCompany).toHaveBeenCalledWith({
                name: "TechCorp Industries",
                description: "Enterprise software company",
                domains: ["techcorp.com", "techcorp.io"],
                custom_fields: { account_manager: "Maria Garcia" }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createCompany.mockResolvedValueOnce(sampleCompany);

            const result = await executeCreateCompany(mockClient, {
                name: "TechCorp Industries"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleCompany);
        });

        it("returns error on client failure", async () => {
            mockClient.createCompany.mockRejectedValueOnce(
                new Error("Company name already exists")
            );

            const result = await executeCreateCompany(mockClient, {
                name: "Existing Company"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeGetCompany", () => {
        it("calls client with correct params", async () => {
            mockClient.getCompany.mockResolvedValueOnce(sampleCompany);

            await executeGetCompany(mockClient, {
                companyId: 43000067890
            });

            expect(mockClient.getCompany).toHaveBeenCalledWith(43000067890);
        });

        it("returns normalized output on success", async () => {
            mockClient.getCompany.mockResolvedValueOnce(sampleCompany);

            const result = await executeGetCompany(mockClient, {
                companyId: 43000067890
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleCompany);
        });

        it("returns error on client failure", async () => {
            mockClient.getCompany.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeGetCompany(mockClient, {
                companyId: 99999999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateCompany", () => {
        it("calls client with correct params", async () => {
            const updatedCompany = { ...sampleCompany, name: "TechCorp Industries Inc." };
            mockClient.updateCompany.mockResolvedValueOnce(updatedCompany);

            await executeUpdateCompany(mockClient, {
                companyId: 43000067890,
                name: "TechCorp Industries Inc."
            });

            expect(mockClient.updateCompany).toHaveBeenCalledWith(43000067890, {
                name: "TechCorp Industries Inc."
            });
        });

        it("includes all update fields when provided", async () => {
            const updatedCompany = { ...sampleCompany };
            mockClient.updateCompany.mockResolvedValueOnce(updatedCompany);

            await executeUpdateCompany(mockClient, {
                companyId: 43000067890,
                name: "Updated Name",
                description: "Updated description",
                domains: ["newdomain.com"],
                custom_fields: { tier: "premium" }
            });

            expect(mockClient.updateCompany).toHaveBeenCalledWith(43000067890, {
                name: "Updated Name",
                description: "Updated description",
                domains: ["newdomain.com"],
                custom_fields: { tier: "premium" }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedCompany = { ...sampleCompany, name: "TechCorp Industries Inc." };
            mockClient.updateCompany.mockResolvedValueOnce(updatedCompany);

            const result = await executeUpdateCompany(mockClient, {
                companyId: 43000067890,
                name: "TechCorp Industries Inc."
            });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("TechCorp Industries Inc.");
        });

        it("returns error on client failure", async () => {
            mockClient.updateCompany.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeUpdateCompany(mockClient, {
                companyId: 99999999999,
                name: "Updated Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListCompanies", () => {
        it("calls client with default params", async () => {
            mockClient.listCompanies.mockResolvedValueOnce([sampleCompany]);

            await executeListCompanies(mockClient, {});

            expect(mockClient.listCompanies).toHaveBeenCalledWith({});
        });

        it("calls client with pagination params", async () => {
            mockClient.listCompanies.mockResolvedValueOnce([sampleCompany]);

            await executeListCompanies(mockClient, {
                per_page: 50,
                page: 2
            });

            expect(mockClient.listCompanies).toHaveBeenCalledWith({
                per_page: 50,
                page: 2
            });
        });

        it("returns normalized output on success", async () => {
            const companies = [sampleCompany, { ...sampleCompany, id: 43000067891 }];
            mockClient.listCompanies.mockResolvedValueOnce(companies);

            const result = await executeListCompanies(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.companies).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listCompanies.mockRejectedValueOnce(
                new Error("Freshdesk authentication failed.")
            );

            const result = await executeListCompanies(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Agent Operations
    // ============================================

    describe("executeListAgents", () => {
        it("calls client with default params", async () => {
            mockClient.listAgents.mockResolvedValueOnce([sampleAgent]);

            await executeListAgents(mockClient, {});

            expect(mockClient.listAgents).toHaveBeenCalledWith({});
        });

        it("calls client with filter params", async () => {
            mockClient.listAgents.mockResolvedValueOnce([sampleAgent]);

            await executeListAgents(mockClient, {
                email: "sarah@example.com",
                per_page: 50
            });

            expect(mockClient.listAgents).toHaveBeenCalledWith({
                email: "sarah@example.com",
                per_page: 50
            });
        });

        it("returns normalized output on success", async () => {
            const agents = [sampleAgent, { ...sampleAgent, id: 43000012346 }];
            mockClient.listAgents.mockResolvedValueOnce(agents);

            const result = await executeListAgents(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.agents).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listAgents.mockRejectedValueOnce(
                new Error("Freshdesk authentication failed.")
            );

            const result = await executeListAgents(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetAgent", () => {
        it("calls client with correct params", async () => {
            mockClient.getAgent.mockResolvedValueOnce(sampleAgent);

            await executeGetAgent(mockClient, {
                agentId: 43000012345
            });

            expect(mockClient.getAgent).toHaveBeenCalledWith(43000012345);
        });

        it("returns normalized output on success", async () => {
            mockClient.getAgent.mockResolvedValueOnce(sampleAgent);

            const result = await executeGetAgent(mockClient, {
                agentId: 43000012345
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleAgent);
        });

        it("returns error on client failure", async () => {
            mockClient.getAgent.mockRejectedValueOnce(
                new Error("Resource not found in Freshdesk.")
            );

            const result = await executeGetAgent(mockClient, {
                agentId: 99999999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCurrentAgent", () => {
        it("calls client without params", async () => {
            mockClient.getCurrentAgent.mockResolvedValueOnce(sampleAgent);

            await executeGetCurrentAgent(mockClient, {});

            expect(mockClient.getCurrentAgent).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.getCurrentAgent.mockResolvedValueOnce(sampleAgent);

            const result = await executeGetCurrentAgent(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleAgent);
        });

        it("returns error on client failure", async () => {
            mockClient.getCurrentAgent.mockRejectedValueOnce(
                new Error("Freshdesk authentication failed.")
            );

            const result = await executeGetCurrentAgent(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Schema Validation Tests
    // ============================================

    describe("schema validation", () => {
        describe("createTicketSchema", () => {
            it("validates minimal input", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test Ticket",
                    description: "Test description"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test Ticket",
                    description: "Test description",
                    email: "test@example.com",
                    requester_id: 12345,
                    priority: 2,
                    status: 2,
                    type: "Problem",
                    tags: ["test", "urgent"],
                    custom_fields: { severity: "high" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing subject", () => {
                const result = createTicketSchema.safeParse({
                    description: "Test description"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing description", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test Ticket"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid priority", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test",
                    description: "Test",
                    priority: 5
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid status", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test",
                    description: "Test",
                    status: 1
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email format", () => {
                const result = createTicketSchema.safeParse({
                    subject: "Test",
                    description: "Test",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTicketSchema", () => {
            it("validates required input", () => {
                const result = getTicketSchema.safeParse({
                    ticketId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("validates with include", () => {
                const result = getTicketSchema.safeParse({
                    ticketId: 12345,
                    include: "requester,company"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing ticketId", () => {
                const result = getTicketSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-integer ticketId", () => {
                const result = getTicketSchema.safeParse({
                    ticketId: 123.45
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateTicketSchema", () => {
            it("validates minimal input", () => {
                const result = updateTicketSchema.safeParse({
                    ticketId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateTicketSchema.safeParse({
                    ticketId: 12345,
                    subject: "Updated Subject",
                    description: "Updated description",
                    priority: 3,
                    status: 4,
                    responder_id: 67890,
                    tags: ["resolved"],
                    custom_fields: { resolution: "fixed" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing ticketId", () => {
                const result = updateTicketSchema.safeParse({
                    status: 4
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteTicketSchema", () => {
            it("validates required input", () => {
                const result = deleteTicketSchema.safeParse({
                    ticketId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing ticketId", () => {
                const result = deleteTicketSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listTicketsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listTicketsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all filters", () => {
                const result = listTicketsSchema.safeParse({
                    filter: "new_and_my_open",
                    requester_id: 12345,
                    email: "test@example.com",
                    company_id: 67890,
                    updated_since: "2024-01-01T00:00:00Z",
                    per_page: 50,
                    page: 1
                });
                expect(result.success).toBe(true);
            });

            it("rejects per_page over 100", () => {
                const result = listTicketsSchema.safeParse({
                    per_page: 150
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative page", () => {
                const result = listTicketsSchema.safeParse({
                    page: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchTicketsSchema", () => {
            it("validates required input", () => {
                const result = searchTicketsSchema.safeParse({
                    query: "status:2"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty query", () => {
                const result = searchTicketsSchema.safeParse({
                    query: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing query", () => {
                const result = searchTicketsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("addTicketReplySchema", () => {
            it("validates required input", () => {
                const result = addTicketReplySchema.safeParse({
                    ticketId: 12345,
                    body: "<p>Reply content</p>"
                });
                expect(result.success).toBe(true);
            });

            it("validates with user_id", () => {
                const result = addTicketReplySchema.safeParse({
                    ticketId: 12345,
                    body: "<p>Reply content</p>",
                    user_id: 67890
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty body", () => {
                const result = addTicketReplySchema.safeParse({
                    ticketId: 12345,
                    body: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addTicketNoteSchema", () => {
            it("validates required input", () => {
                const result = addTicketNoteSchema.safeParse({
                    ticketId: 12345,
                    body: "<p>Note content</p>"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = addTicketNoteSchema.safeParse({
                    ticketId: 12345,
                    body: "<p>Note content</p>",
                    private: false,
                    notify_emails: ["user@example.com"]
                });
                expect(result.success).toBe(true);
            });

            it("defaults private to true", () => {
                const result = addTicketNoteSchema.parse({
                    ticketId: 12345,
                    body: "<p>Note content</p>"
                });
                expect(result.private).toBe(true);
            });

            it("rejects invalid notify_emails", () => {
                const result = addTicketNoteSchema.safeParse({
                    ticketId: 12345,
                    body: "<p>Note content</p>",
                    notify_emails: ["not-an-email"]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createContactSchema", () => {
            it("validates minimal input", () => {
                const result = createContactSchema.safeParse({
                    name: "John Doe"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createContactSchema.safeParse({
                    name: "John Doe",
                    email: "john@example.com",
                    phone: "+1-555-0100",
                    mobile: "+1-555-0101",
                    company_id: 12345,
                    custom_fields: { department: "IT" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing name", () => {
                const result = createContactSchema.safeParse({
                    email: "john@example.com"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createContactSchema.safeParse({
                    name: "John Doe",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getContactSchema", () => {
            it("validates required input", () => {
                const result = getContactSchema.safeParse({
                    contactId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = getContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateContactSchema", () => {
            it("validates minimal input", () => {
                const result = updateContactSchema.safeParse({
                    contactId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateContactSchema.safeParse({
                    contactId: 12345,
                    name: "Updated Name",
                    email: "updated@example.com",
                    phone: "+1-555-0200",
                    custom_fields: { title: "Manager" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listContactsSchema", () => {
            it("validates empty input", () => {
                const result = listContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all filters", () => {
                const result = listContactsSchema.safeParse({
                    email: "test@example.com",
                    phone: "+1-555-0100",
                    company_id: 12345,
                    per_page: 50,
                    page: 1
                });
                expect(result.success).toBe(true);
            });
        });

        describe("searchContactsSchema", () => {
            it("validates required input", () => {
                const result = searchContactsSchema.safeParse({
                    query: "name:'John'"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty query", () => {
                const result = searchContactsSchema.safeParse({
                    query: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createCompanySchema", () => {
            it("validates minimal input", () => {
                const result = createCompanySchema.safeParse({
                    name: "TechCorp"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createCompanySchema.safeParse({
                    name: "TechCorp",
                    description: "A tech company",
                    domains: ["techcorp.com"],
                    custom_fields: { tier: "enterprise" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing name", () => {
                const result = createCompanySchema.safeParse({
                    description: "A company"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCompanySchema", () => {
            it("validates required input", () => {
                const result = getCompanySchema.safeParse({
                    companyId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing companyId", () => {
                const result = getCompanySchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateCompanySchema", () => {
            it("validates minimal input", () => {
                const result = updateCompanySchema.safeParse({
                    companyId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateCompanySchema.safeParse({
                    companyId: 12345,
                    name: "Updated Name",
                    description: "Updated description",
                    domains: ["newdomain.com"],
                    custom_fields: { tier: "premium" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listCompaniesSchema", () => {
            it("validates empty input", () => {
                const result = listCompaniesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listCompaniesSchema.safeParse({
                    per_page: 50,
                    page: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects per_page over 100", () => {
                const result = listCompaniesSchema.safeParse({
                    per_page: 150
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listAgentsSchema", () => {
            it("validates empty input", () => {
                const result = listAgentsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = listAgentsSchema.safeParse({
                    email: "agent@example.com",
                    per_page: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = listAgentsSchema.safeParse({
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getAgentSchema", () => {
            it("validates required input", () => {
                const result = getAgentSchema.safeParse({
                    agentId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing agentId", () => {
                const result = getAgentSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getCurrentAgentSchema", () => {
            it("validates empty input", () => {
                const result = getCurrentAgentSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });
    });
});
