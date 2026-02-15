/**
 * Intercom Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Contacts operations
import {
    executeListCompanies,
    listCompaniesSchema,
    executeGetCompany,
    getCompanySchema,
    executeCreateOrUpdateCompany,
    createOrUpdateCompanySchema
} from "../operations/companies";
import {
    executeListContacts,
    listContactsSchema,
    executeGetContact,
    getContactSchema,
    executeCreateContact,
    createContactSchema,
    executeUpdateContact,
    updateContactSchema,
    executeSearchContacts,
    searchContactsSchema
} from "../operations/contacts";

// Conversations operations
import {
    executeListConversations,
    listConversationsSchema,
    executeGetConversation,
    getConversationSchema,
    executeReplyToConversation,
    replyToConversationSchema,
    executeCloseConversation,
    closeConversationSchema,
    executeAssignConversation,
    assignConversationSchema
} from "../operations/conversations";

// Companies operations

// Tags operations
import {
    executeCreateNote,
    createNoteSchema,
    executeListNotes,
    listNotesSchema
} from "../operations/notes";
import {
    executeListTags,
    listTagsSchema,
    executeTagContact,
    tagContactSchema,
    executeTagConversation,
    tagConversationSchema
} from "../operations/tags";

// Notes operations

import type { IntercomClient } from "../client/IntercomClient";

// Mock IntercomClient factory
function createMockIntercomClient(): jest.Mocked<IntercomClient> {
    return {
        searchContacts: jest.fn(),
        searchConversations: jest.fn(),
        getContact: jest.fn(),
        listContacts: jest.fn(),
        createContact: jest.fn(),
        updateContact: jest.fn(),
        getConversation: jest.fn(),
        listConversations: jest.fn(),
        replyToConversation: jest.fn(),
        manageConversation: jest.fn(),
        listCompanies: jest.fn(),
        getCompany: jest.fn(),
        createOrUpdateCompany: jest.fn(),
        listTags: jest.fn(),
        tagContact: jest.fn(),
        untagContact: jest.fn(),
        tagConversation: jest.fn(),
        createNote: jest.fn(),
        listNotes: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<IntercomClient>;
}

describe("Intercom Operation Executors", () => {
    let mockClient: jest.Mocked<IntercomClient>;

    beforeEach(() => {
        mockClient = createMockIntercomClient();
    });

    // ============================================
    // Contacts Operations
    // ============================================

    describe("executeListContacts", () => {
        it("calls client with correct params", async () => {
            mockClient.listContacts.mockResolvedValueOnce({
                type: "list",
                data: [],
                total_count: 0
            });

            await executeListContacts(mockClient, { per_page: 50 });

            expect(mockClient.listContacts).toHaveBeenCalledWith({
                per_page: 50,
                starting_after: undefined
            });
        });

        it("uses search when email filter provided", async () => {
            mockClient.searchContacts.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "contact",
                        id: "contact_123",
                        workspace_id: "ws_123",
                        role: "user",
                        email: "test@example.com"
                    }
                ],
                total_count: 1
            });

            const result = await executeListContacts(mockClient, {
                email: "test@example.com"
            });

            expect(mockClient.searchContacts).toHaveBeenCalledWith({
                field: "email",
                operator: "=",
                value: "test@example.com"
            });
            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(1);
        });

        it("returns normalized output on success", async () => {
            mockClient.listContacts.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "contact",
                        id: "contact_123",
                        workspace_id: "ws_123",
                        role: "user",
                        email: "test@example.com",
                        name: "Test User"
                    },
                    {
                        type: "contact",
                        id: "contact_456",
                        workspace_id: "ws_123",
                        role: "lead",
                        email: "lead@example.com"
                    }
                ],
                total_count: 2,
                pages: {
                    type: "pages",
                    page: 1,
                    per_page: 50,
                    total_pages: 1
                }
            });

            const result = await executeListContacts(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(2);
            expect(result.data?.total_count).toBe(2);
            expect(result.data?.pages).toBeDefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listContacts.mockRejectedValueOnce(new Error("API rate limit exceeded"));

            const result = await executeListContacts(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listContacts.mockRejectedValueOnce("string error");

            const result = await executeListContacts(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list contacts");
        });
    });

    describe("executeGetContact", () => {
        it("calls client with correct params", async () => {
            mockClient.getContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user"
            });

            await executeGetContact(mockClient, { contactId: "contact_123" });

            expect(mockClient.getContact).toHaveBeenCalledWith("contact_123");
        });

        it("returns normalized output on success", async () => {
            const contact = {
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user",
                email: "test@example.com",
                name: "Test User"
            };
            mockClient.getContact.mockResolvedValueOnce(contact);

            const result = await executeGetContact(mockClient, { contactId: "contact_123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(contact);
        });

        it("returns error on client failure", async () => {
            mockClient.getContact.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeGetContact(mockClient, { contactId: "invalid_id" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Contact not found");
        });
    });

    describe("executeCreateContact", () => {
        it("calls client with correct params for user", async () => {
            mockClient.createContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_new",
                workspace_id: "ws_123",
                role: "user",
                email: "new@example.com"
            });

            await executeCreateContact(mockClient, {
                role: "user",
                email: "new@example.com",
                name: "New User",
                phone: "+1234567890",
                external_id: "ext_123"
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                role: "user",
                email: "new@example.com",
                name: "New User",
                phone: "+1234567890",
                external_id: "ext_123"
            });
        });

        it("calls client with correct params for lead", async () => {
            mockClient.createContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_lead",
                workspace_id: "ws_123",
                role: "lead"
            });

            await executeCreateContact(mockClient, {
                role: "lead"
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                role: "lead"
            });
        });

        it("includes custom_attributes when provided", async () => {
            mockClient.createContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user"
            });

            await executeCreateContact(mockClient, {
                role: "user",
                custom_attributes: { plan: "premium", signup_date: "2024-01-01" }
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                role: "user",
                custom_attributes: { plan: "premium", signup_date: "2024-01-01" }
            });
        });

        it("returns normalized output on success", async () => {
            const contact = {
                type: "contact",
                id: "contact_new",
                workspace_id: "ws_123",
                role: "user",
                email: "new@example.com"
            };
            mockClient.createContact.mockResolvedValueOnce(contact);

            const result = await executeCreateContact(mockClient, {
                role: "user",
                email: "new@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(contact);
        });

        it("returns error on client failure", async () => {
            mockClient.createContact.mockRejectedValueOnce(new Error("Duplicate email"));

            const result = await executeCreateContact(mockClient, {
                role: "user",
                email: "existing@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Duplicate email");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateContact", () => {
        it("calls client with correct params", async () => {
            mockClient.updateContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user",
                name: "Updated Name"
            });

            await executeUpdateContact(mockClient, {
                contactId: "contact_123",
                name: "Updated Name",
                email: "updated@example.com"
            });

            expect(mockClient.updateContact).toHaveBeenCalledWith("contact_123", {
                name: "Updated Name",
                email: "updated@example.com"
            });
        });

        it("only sends provided fields", async () => {
            mockClient.updateContact.mockResolvedValueOnce({
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user"
            });

            await executeUpdateContact(mockClient, {
                contactId: "contact_123",
                phone: "+9876543210"
            });

            expect(mockClient.updateContact).toHaveBeenCalledWith("contact_123", {
                phone: "+9876543210"
            });
        });

        it("returns normalized output on success", async () => {
            const contact = {
                type: "contact",
                id: "contact_123",
                workspace_id: "ws_123",
                role: "user",
                name: "Updated Name"
            };
            mockClient.updateContact.mockResolvedValueOnce(contact);

            const result = await executeUpdateContact(mockClient, {
                contactId: "contact_123",
                name: "Updated Name"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(contact);
        });

        it("returns error on client failure", async () => {
            mockClient.updateContact.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeUpdateContact(mockClient, {
                contactId: "invalid_id",
                name: "New Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeSearchContacts", () => {
        it("calls client with correct params", async () => {
            mockClient.searchContacts.mockResolvedValueOnce({
                type: "list",
                data: [],
                total_count: 0
            });

            await executeSearchContacts(mockClient, {
                query: {
                    field: "email",
                    operator: "~",
                    value: "@example.com"
                }
            });

            expect(mockClient.searchContacts).toHaveBeenCalledWith({
                field: "email",
                operator: "~",
                value: "@example.com"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.searchContacts.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "contact",
                        id: "contact_123",
                        workspace_id: "ws_123",
                        role: "user",
                        email: "test@example.com"
                    }
                ],
                total_count: 1,
                pages: { type: "pages", page: 1 }
            });

            const result = await executeSearchContacts(mockClient, {
                query: { field: "email", operator: "=", value: "test@example.com" }
            });

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(1);
            expect(result.data?.total_count).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.searchContacts.mockRejectedValueOnce(new Error("Invalid query"));

            const result = await executeSearchContacts(mockClient, {
                query: { field: "invalid", operator: "=", value: "test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid query");
        });
    });

    // ============================================
    // Conversations Operations
    // ============================================

    describe("executeListConversations", () => {
        it("calls client with correct params", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                type: "list",
                data: []
            });

            await executeListConversations(mockClient, { per_page: 25 });

            expect(mockClient.listConversations).toHaveBeenCalledWith({
                per_page: 25,
                starting_after: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "conversation",
                        id: "conv_123",
                        created_at: 1704067200,
                        updated_at: 1704067200,
                        open: true,
                        state: "open",
                        read: false,
                        priority: "not_priority",
                        source: {
                            type: "email",
                            id: "src_123",
                            delivered_as: "admin_initiated",
                            body: "Hello"
                        }
                    }
                ],
                pages: { type: "pages", page: 1, per_page: 25 }
            });

            const result = await executeListConversations(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.conversations).toHaveLength(1);
            expect(result.data?.pages).toBeDefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listConversations.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListConversations(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetConversation", () => {
        it("calls client with correct params", async () => {
            mockClient.getConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                source: {
                    type: "email",
                    id: "src_123",
                    delivered_as: "admin_initiated",
                    body: "Hello"
                }
            });

            await executeGetConversation(mockClient, { conversationId: "conv_123" });

            expect(mockClient.getConversation).toHaveBeenCalledWith("conv_123");
        });

        it("returns normalized output on success", async () => {
            const conversation = {
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                source: {
                    type: "email",
                    id: "src_123",
                    delivered_as: "admin_initiated",
                    body: "Hello"
                },
                conversation_parts: {
                    type: "conversation_part.list",
                    conversation_parts: [],
                    total_count: 0
                }
            };
            mockClient.getConversation.mockResolvedValueOnce(conversation);

            const result = await executeGetConversation(mockClient, { conversationId: "conv_123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(conversation);
        });

        it("returns error on client failure", async () => {
            mockClient.getConversation.mockRejectedValueOnce(new Error("Conversation not found"));

            const result = await executeGetConversation(mockClient, { conversationId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Conversation not found");
        });
    });

    describe("executeReplyToConversation", () => {
        it("calls client with correct params for comment", async () => {
            mockClient.replyToConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeReplyToConversation(mockClient, {
                conversationId: "conv_123",
                message_type: "comment",
                body: "<p>This is a reply</p>",
                admin_id: "admin_123"
            });

            expect(mockClient.replyToConversation).toHaveBeenCalledWith("conv_123", {
                message_type: "comment",
                body: "<p>This is a reply</p>",
                type: "admin",
                admin_id: "admin_123"
            });
        });

        it("calls client with correct params for note", async () => {
            mockClient.replyToConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeReplyToConversation(mockClient, {
                conversationId: "conv_123",
                message_type: "note",
                body: "Internal note"
            });

            expect(mockClient.replyToConversation).toHaveBeenCalledWith("conv_123", {
                message_type: "note",
                body: "Internal note",
                type: "admin"
            });
        });

        it("returns normalized output on success", async () => {
            const conversation = {
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            };
            mockClient.replyToConversation.mockResolvedValueOnce(conversation);

            const result = await executeReplyToConversation(mockClient, {
                conversationId: "conv_123",
                message_type: "comment",
                body: "Reply"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(conversation);
        });

        it("returns error on client failure", async () => {
            mockClient.replyToConversation.mockRejectedValueOnce(
                new Error("Conversation is closed")
            );

            const result = await executeReplyToConversation(mockClient, {
                conversationId: "conv_123",
                message_type: "comment",
                body: "Reply"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Conversation is closed");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeCloseConversation", () => {
        it("calls client with correct params", async () => {
            mockClient.manageConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: false,
                state: "closed",
                read: true,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeCloseConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123",
                body: "Closing this conversation"
            });

            expect(mockClient.manageConversation).toHaveBeenCalledWith("conv_123", "close", {
                message_type: "close",
                type: "admin",
                admin_id: "admin_123",
                body: "Closing this conversation"
            });
        });

        it("calls client without body when not provided", async () => {
            mockClient.manageConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: false,
                state: "closed",
                read: true,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeCloseConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123"
            });

            expect(mockClient.manageConversation).toHaveBeenCalledWith("conv_123", "close", {
                message_type: "close",
                type: "admin",
                admin_id: "admin_123"
            });
        });

        it("returns normalized output on success", async () => {
            const conversation = {
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: false,
                state: "closed",
                read: true,
                priority: "not_priority",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            };
            mockClient.manageConversation.mockResolvedValueOnce(conversation);

            const result = await executeCloseConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(conversation);
        });

        it("returns error on client failure", async () => {
            mockClient.manageConversation.mockRejectedValueOnce(new Error("Already closed"));

            const result = await executeCloseConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Already closed");
        });
    });

    describe("executeAssignConversation", () => {
        it("calls client with assignee_id", async () => {
            mockClient.manageConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                admin_assignee_id: 456,
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeAssignConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123",
                assignee_id: "admin_456"
            });

            expect(mockClient.manageConversation).toHaveBeenCalledWith("conv_123", "assignment", {
                message_type: "assignment",
                type: "admin",
                admin_id: "admin_123",
                assignee_id: "admin_456"
            });
        });

        it("calls client with team_id", async () => {
            mockClient.manageConversation.mockResolvedValueOnce({
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                team_assignee_id: "team_789",
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            });

            await executeAssignConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123",
                team_id: "team_789"
            });

            expect(mockClient.manageConversation).toHaveBeenCalledWith("conv_123", "assignment", {
                message_type: "assignment",
                type: "admin",
                admin_id: "admin_123",
                body: { team_id: "team_789" }
            });
        });

        it("returns normalized output on success", async () => {
            const conversation = {
                type: "conversation",
                id: "conv_123",
                created_at: 1704067200,
                updated_at: 1704067200,
                open: true,
                state: "open",
                read: false,
                priority: "not_priority",
                admin_assignee_id: 456,
                source: { type: "email", id: "src_123", delivered_as: "admin_initiated", body: "" }
            };
            mockClient.manageConversation.mockResolvedValueOnce(conversation);

            const result = await executeAssignConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123",
                assignee_id: "admin_456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(conversation);
        });

        it("returns error on client failure", async () => {
            mockClient.manageConversation.mockRejectedValueOnce(new Error("Admin not found"));

            const result = await executeAssignConversation(mockClient, {
                conversationId: "conv_123",
                admin_id: "admin_123",
                assignee_id: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Admin not found");
        });
    });

    // ============================================
    // Companies Operations
    // ============================================

    describe("executeListCompanies", () => {
        it("calls client with correct params", async () => {
            mockClient.listCompanies.mockResolvedValueOnce({
                type: "list",
                data: [],
                total_count: 0
            });

            await executeListCompanies(mockClient, { per_page: 100 });

            expect(mockClient.listCompanies).toHaveBeenCalledWith({
                per_page: 100,
                starting_after: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listCompanies.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "company",
                        id: "company_123",
                        company_id: "acme_inc",
                        name: "Acme Inc",
                        user_count: 50
                    },
                    {
                        type: "company",
                        id: "company_456",
                        company_id: "globex",
                        name: "Globex Corp",
                        user_count: 100
                    }
                ],
                total_count: 2,
                pages: { type: "pages", page: 1 }
            });

            const result = await executeListCompanies(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.companies).toHaveLength(2);
            expect(result.data?.total_count).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listCompanies.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListCompanies(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCompany", () => {
        it("calls client with correct params", async () => {
            mockClient.getCompany.mockResolvedValueOnce({
                type: "company",
                id: "company_123",
                company_id: "acme_inc",
                name: "Acme Inc"
            });

            await executeGetCompany(mockClient, { companyId: "company_123" });

            expect(mockClient.getCompany).toHaveBeenCalledWith("company_123");
        });

        it("returns normalized output on success", async () => {
            const company = {
                type: "company",
                id: "company_123",
                company_id: "acme_inc",
                name: "Acme Inc",
                plan: { type: "plan", id: "plan_1", name: "Enterprise" },
                monthly_spend: 5000,
                user_count: 50
            };
            mockClient.getCompany.mockResolvedValueOnce(company);

            const result = await executeGetCompany(mockClient, { companyId: "company_123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(company);
        });

        it("returns error on client failure", async () => {
            mockClient.getCompany.mockRejectedValueOnce(new Error("Company not found"));

            const result = await executeGetCompany(mockClient, { companyId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Company not found");
        });
    });

    describe("executeCreateOrUpdateCompany", () => {
        it("calls client with minimal params", async () => {
            mockClient.createOrUpdateCompany.mockResolvedValueOnce({
                type: "company",
                id: "company_new",
                company_id: "new_company"
            });

            await executeCreateOrUpdateCompany(mockClient, {
                company_id: "new_company"
            });

            expect(mockClient.createOrUpdateCompany).toHaveBeenCalledWith({
                company_id: "new_company"
            });
        });

        it("calls client with full params", async () => {
            mockClient.createOrUpdateCompany.mockResolvedValueOnce({
                type: "company",
                id: "company_123",
                company_id: "acme_inc",
                name: "Acme Inc"
            });

            await executeCreateOrUpdateCompany(mockClient, {
                company_id: "acme_inc",
                name: "Acme Inc",
                plan: "Enterprise",
                monthly_spend: 5000,
                size: 100,
                website: "https://acme.com",
                industry: "Technology",
                custom_attributes: { region: "US-West" }
            });

            expect(mockClient.createOrUpdateCompany).toHaveBeenCalledWith({
                company_id: "acme_inc",
                name: "Acme Inc",
                plan: "Enterprise",
                monthly_spend: 5000,
                size: 100,
                website: "https://acme.com",
                industry: "Technology",
                custom_attributes: { region: "US-West" }
            });
        });

        it("returns normalized output on success", async () => {
            const company = {
                type: "company",
                id: "company_123",
                company_id: "acme_inc",
                name: "Acme Inc"
            };
            mockClient.createOrUpdateCompany.mockResolvedValueOnce(company);

            const result = await executeCreateOrUpdateCompany(mockClient, {
                company_id: "acme_inc",
                name: "Acme Inc"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(company);
        });

        it("returns error on client failure", async () => {
            mockClient.createOrUpdateCompany.mockRejectedValueOnce(
                new Error("Invalid company data")
            );

            const result = await executeCreateOrUpdateCompany(mockClient, {
                company_id: "bad_company"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid company data");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // Tags Operations
    // ============================================

    describe("executeListTags", () => {
        it("calls client without params", async () => {
            mockClient.listTags.mockResolvedValueOnce({
                type: "list",
                data: []
            });

            await executeListTags(mockClient, {});

            expect(mockClient.listTags).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.listTags.mockResolvedValueOnce({
                type: "list",
                data: [
                    { type: "tag", id: "tag_1", name: "VIP" },
                    { type: "tag", id: "tag_2", name: "Priority" },
                    { type: "tag", id: "tag_3", name: "Bug Report" }
                ]
            });

            const result = await executeListTags(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.tags).toHaveLength(3);
            expect(result.data?.tags[0].name).toBe("VIP");
        });

        it("returns error on client failure", async () => {
            mockClient.listTags.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListTags(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeTagContact", () => {
        it("calls client with correct params", async () => {
            mockClient.tagContact.mockResolvedValueOnce({
                type: "tag",
                id: "tag_1",
                name: "VIP"
            });

            await executeTagContact(mockClient, {
                contactId: "contact_123",
                tagId: "tag_1"
            });

            expect(mockClient.tagContact).toHaveBeenCalledWith("contact_123", "tag_1");
        });

        it("returns normalized output on success", async () => {
            const tag = { type: "tag", id: "tag_1", name: "VIP" };
            mockClient.tagContact.mockResolvedValueOnce(tag);

            const result = await executeTagContact(mockClient, {
                contactId: "contact_123",
                tagId: "tag_1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(tag);
        });

        it("returns error on client failure", async () => {
            mockClient.tagContact.mockRejectedValueOnce(new Error("Tag not found"));

            const result = await executeTagContact(mockClient, {
                contactId: "contact_123",
                tagId: "invalid_tag"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Tag not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeTagConversation", () => {
        it("calls client with correct params", async () => {
            mockClient.tagConversation.mockResolvedValueOnce({
                type: "tag",
                id: "tag_1",
                name: "Urgent"
            });

            await executeTagConversation(mockClient, {
                conversationId: "conv_123",
                tagId: "tag_1",
                admin_id: "admin_123"
            });

            expect(mockClient.tagConversation).toHaveBeenCalledWith(
                "conv_123",
                "tag_1",
                "admin_123"
            );
        });

        it("returns normalized output on success", async () => {
            const tag = { type: "tag", id: "tag_1", name: "Urgent" };
            mockClient.tagConversation.mockResolvedValueOnce(tag);

            const result = await executeTagConversation(mockClient, {
                conversationId: "conv_123",
                tagId: "tag_1",
                admin_id: "admin_123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(tag);
        });

        it("returns error on client failure", async () => {
            mockClient.tagConversation.mockRejectedValueOnce(new Error("Conversation not found"));

            const result = await executeTagConversation(mockClient, {
                conversationId: "invalid",
                tagId: "tag_1",
                admin_id: "admin_123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Conversation not found");
        });
    });

    // ============================================
    // Notes Operations
    // ============================================

    describe("executeCreateNote", () => {
        it("calls client with correct params", async () => {
            mockClient.createNote.mockResolvedValueOnce({
                type: "note",
                id: "note_123",
                created_at: 1704067200,
                body: "This is a note"
            });

            await executeCreateNote(mockClient, {
                contactId: "contact_123",
                body: "This is a note",
                admin_id: "admin_123"
            });

            expect(mockClient.createNote).toHaveBeenCalledWith(
                "contact_123",
                "This is a note",
                "admin_123"
            );
        });

        it("calls client without admin_id when not provided", async () => {
            mockClient.createNote.mockResolvedValueOnce({
                type: "note",
                id: "note_123",
                created_at: 1704067200,
                body: "Note without admin"
            });

            await executeCreateNote(mockClient, {
                contactId: "contact_123",
                body: "Note without admin"
            });

            expect(mockClient.createNote).toHaveBeenCalledWith(
                "contact_123",
                "Note without admin",
                undefined
            );
        });

        it("returns normalized output on success", async () => {
            const note = {
                type: "note",
                id: "note_123",
                created_at: 1704067200,
                body: "<p>Important note</p>",
                contact: { type: "contact", id: "contact_123" },
                author: { type: "admin", id: "admin_123", name: "Support Agent" }
            };
            mockClient.createNote.mockResolvedValueOnce(note);

            const result = await executeCreateNote(mockClient, {
                contactId: "contact_123",
                body: "<p>Important note</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(note);
        });

        it("returns error on client failure", async () => {
            mockClient.createNote.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeCreateNote(mockClient, {
                contactId: "invalid",
                body: "Note"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Contact not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListNotes", () => {
        it("calls client with correct params", async () => {
            mockClient.listNotes.mockResolvedValueOnce({
                type: "list",
                data: []
            });

            await executeListNotes(mockClient, { contactId: "contact_123" });

            expect(mockClient.listNotes).toHaveBeenCalledWith("contact_123");
        });

        it("returns normalized output on success", async () => {
            mockClient.listNotes.mockResolvedValueOnce({
                type: "list",
                data: [
                    {
                        type: "note",
                        id: "note_1",
                        created_at: 1704067200,
                        body: "First note"
                    },
                    {
                        type: "note",
                        id: "note_2",
                        created_at: 1704153600,
                        body: "Second note"
                    }
                ]
            });

            const result = await executeListNotes(mockClient, { contactId: "contact_123" });

            expect(result.success).toBe(true);
            expect(result.data?.notes).toHaveLength(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listNotes.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeListNotes(mockClient, { contactId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Contact not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Schema Validation Tests
    // ============================================

    describe("schema validation", () => {
        describe("listContactsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with email filter", () => {
                const result = listContactsSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listContactsSchema.safeParse({
                    per_page: 50,
                    starting_after: "cursor_abc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = listContactsSchema.safeParse({
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("rejects per_page > 150", () => {
                const result = listContactsSchema.safeParse({
                    per_page: 200
                });
                expect(result.success).toBe(false);
            });

            it("rejects per_page < 1", () => {
                const result = listContactsSchema.safeParse({
                    per_page: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getContactSchema", () => {
            it("validates with contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: "contact_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = getContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createContactSchema", () => {
            it("validates minimal input (role only)", () => {
                const result = createContactSchema.safeParse({
                    role: "user"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createContactSchema.safeParse({
                    role: "lead",
                    email: "test@example.com",
                    name: "Test User",
                    phone: "+1234567890",
                    external_id: "ext_123",
                    custom_attributes: { plan: "free" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing role", () => {
                const result = createContactSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid role", () => {
                const result = createContactSchema.safeParse({
                    role: "admin"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createContactSchema.safeParse({
                    role: "user",
                    email: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateContactSchema", () => {
            it("validates with contactId only", () => {
                const result = updateContactSchema.safeParse({
                    contactId: "contact_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all optional fields", () => {
                const result = updateContactSchema.safeParse({
                    contactId: "contact_123",
                    email: "new@example.com",
                    name: "New Name",
                    phone: "+9876543210",
                    custom_attributes: { tier: "premium" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = updateContactSchema.safeParse({
                    name: "New Name"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchContactsSchema", () => {
            it("validates with query object", () => {
                const result = searchContactsSchema.safeParse({
                    query: {
                        field: "email",
                        operator: "=",
                        value: "test@example.com"
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates with per_page", () => {
                const result = searchContactsSchema.safeParse({
                    query: {
                        field: "name",
                        operator: "~",
                        value: "John"
                    },
                    per_page: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing query", () => {
                const result = searchContactsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects incomplete query", () => {
                const result = searchContactsSchema.safeParse({
                    query: {
                        field: "email"
                    }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listConversationsSchema", () => {
            it("validates empty input", () => {
                const result = listConversationsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listConversationsSchema.safeParse({
                    per_page: 25,
                    starting_after: "cursor_xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects per_page > 150", () => {
                const result = listConversationsSchema.safeParse({
                    per_page: 200
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getConversationSchema", () => {
            it("validates with conversationId", () => {
                const result = getConversationSchema.safeParse({
                    conversationId: "conv_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty conversationId", () => {
                const result = getConversationSchema.safeParse({
                    conversationId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("replyToConversationSchema", () => {
            it("validates minimal input", () => {
                const result = replyToConversationSchema.safeParse({
                    conversationId: "conv_123",
                    message_type: "comment",
                    body: "Reply message"
                });
                expect(result.success).toBe(true);
            });

            it("validates with admin_id", () => {
                const result = replyToConversationSchema.safeParse({
                    conversationId: "conv_123",
                    message_type: "note",
                    body: "Internal note",
                    admin_id: "admin_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid message_type", () => {
                const result = replyToConversationSchema.safeParse({
                    conversationId: "conv_123",
                    message_type: "invalid",
                    body: "Message"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty body", () => {
                const result = replyToConversationSchema.safeParse({
                    conversationId: "conv_123",
                    message_type: "comment",
                    body: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("closeConversationSchema", () => {
            it("validates minimal input", () => {
                const result = closeConversationSchema.safeParse({
                    conversationId: "conv_123",
                    admin_id: "admin_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with body", () => {
                const result = closeConversationSchema.safeParse({
                    conversationId: "conv_123",
                    admin_id: "admin_123",
                    body: "Closing message"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing admin_id", () => {
                const result = closeConversationSchema.safeParse({
                    conversationId: "conv_123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("assignConversationSchema", () => {
            it("validates with assignee_id", () => {
                const result = assignConversationSchema.safeParse({
                    conversationId: "conv_123",
                    admin_id: "admin_123",
                    assignee_id: "admin_456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with team_id", () => {
                const result = assignConversationSchema.safeParse({
                    conversationId: "conv_123",
                    admin_id: "admin_123",
                    team_id: "team_789"
                });
                expect(result.success).toBe(true);
            });

            it("validates without assignee or team", () => {
                const result = assignConversationSchema.safeParse({
                    conversationId: "conv_123",
                    admin_id: "admin_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing admin_id", () => {
                const result = assignConversationSchema.safeParse({
                    conversationId: "conv_123",
                    assignee_id: "admin_456"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listCompaniesSchema", () => {
            it("validates empty input", () => {
                const result = listCompaniesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listCompaniesSchema.safeParse({
                    per_page: 100,
                    starting_after: "cursor_abc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects per_page > 150", () => {
                const result = listCompaniesSchema.safeParse({
                    per_page: 200
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCompanySchema", () => {
            it("validates with companyId", () => {
                const result = getCompanySchema.safeParse({
                    companyId: "company_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty companyId", () => {
                const result = getCompanySchema.safeParse({
                    companyId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createOrUpdateCompanySchema", () => {
            it("validates minimal input", () => {
                const result = createOrUpdateCompanySchema.safeParse({
                    company_id: "acme_inc"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createOrUpdateCompanySchema.safeParse({
                    company_id: "acme_inc",
                    name: "Acme Inc",
                    plan: "Enterprise",
                    monthly_spend: 5000,
                    size: 100,
                    website: "https://acme.com",
                    industry: "Technology",
                    custom_attributes: { region: "US" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing company_id", () => {
                const result = createOrUpdateCompanySchema.safeParse({
                    name: "Acme Inc"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid website URL", () => {
                const result = createOrUpdateCompanySchema.safeParse({
                    company_id: "acme_inc",
                    website: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-integer size", () => {
                const result = createOrUpdateCompanySchema.safeParse({
                    company_id: "acme_inc",
                    size: 50.5
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listTagsSchema", () => {
            it("validates empty input", () => {
                const result = listTagsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("tagContactSchema", () => {
            it("validates with contactId and tagId", () => {
                const result = tagContactSchema.safeParse({
                    contactId: "contact_123",
                    tagId: "tag_1"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = tagContactSchema.safeParse({
                    tagId: "tag_1"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing tagId", () => {
                const result = tagContactSchema.safeParse({
                    contactId: "contact_123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty contactId", () => {
                const result = tagContactSchema.safeParse({
                    contactId: "",
                    tagId: "tag_1"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("tagConversationSchema", () => {
            it("validates with all required fields", () => {
                const result = tagConversationSchema.safeParse({
                    conversationId: "conv_123",
                    tagId: "tag_1",
                    admin_id: "admin_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing admin_id", () => {
                const result = tagConversationSchema.safeParse({
                    conversationId: "conv_123",
                    tagId: "tag_1"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createNoteSchema", () => {
            it("validates minimal input", () => {
                const result = createNoteSchema.safeParse({
                    contactId: "contact_123",
                    body: "This is a note"
                });
                expect(result.success).toBe(true);
            });

            it("validates with admin_id", () => {
                const result = createNoteSchema.safeParse({
                    contactId: "contact_123",
                    body: "<p>HTML note content</p>",
                    admin_id: "admin_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing body", () => {
                const result = createNoteSchema.safeParse({
                    contactId: "contact_123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty body", () => {
                const result = createNoteSchema.safeParse({
                    contactId: "contact_123",
                    body: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listNotesSchema", () => {
            it("validates with contactId", () => {
                const result = listNotesSchema.safeParse({
                    contactId: "contact_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = listNotesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty contactId", () => {
                const result = listNotesSchema.safeParse({
                    contactId: ""
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
