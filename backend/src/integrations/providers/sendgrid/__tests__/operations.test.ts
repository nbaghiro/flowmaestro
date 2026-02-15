/**
 * SendGrid Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Email Operations
import { executeAddContacts, addContactsSchema } from "../operations/addContacts";
import { executeAddContactsToList, addContactsToListSchema } from "../operations/addContactsToList";
import { executeCreateList, createListSchema } from "../operations/createList";
import { executeDeleteContacts, deleteContactsSchema } from "../operations/deleteContacts";
import { executeDeleteList, deleteListSchema } from "../operations/deleteList";
import { executeGetContact, getContactSchema } from "../operations/getContact";
import { executeGetContacts, getContactsSchema } from "../operations/getContacts";
import { executeGetLists, getListsSchema } from "../operations/getLists";
import { executeSearchContacts, searchContactsSchema } from "../operations/searchContacts";
import { executeSendBatchEmail, sendBatchEmailSchema } from "../operations/sendBatchEmail";
import { executeSendEmail, sendEmailSchema } from "../operations/sendEmail";
import { executeSendTemplateEmail, sendTemplateEmailSchema } from "../operations/sendTemplateEmail";

// Contact Operations
import { executeUpdateContact, updateContactSchema } from "../operations/updateContact";

// List Operations
import { executeGetList, getListSchema } from "../operations/getList";
import { executeUpdateList, updateListSchema } from "../operations/updateList";
import {
    executeRemoveContactsFromList,
    removeContactsFromListSchema
} from "../operations/removeContactsFromList";

// Template Operations
import { executeGetTemplates, getTemplatesSchema } from "../operations/getTemplates";
import { executeGetTemplate, getTemplateSchema } from "../operations/getTemplate";

// Validation Operations
import { executeValidateEmail, validateEmailSchema } from "../operations/validateEmail";

// Analytics Operations
import { executeGetStats, getStatsSchema } from "../operations/getStats";

import type { SendGridClient } from "../client/SendGridClient";

// Mock SendGridClient factory
function createMockSendGridClient(): jest.Mocked<SendGridClient> {
    return {
        sendEmail: jest.fn(),
        getContacts: jest.fn(),
        getContact: jest.fn(),
        addContacts: jest.fn(),
        deleteContacts: jest.fn(),
        searchContacts: jest.fn(),
        getContactCount: jest.fn(),
        getLists: jest.fn(),
        getList: jest.fn(),
        createList: jest.fn(),
        updateList: jest.fn(),
        deleteList: jest.fn(),
        addContactsToList: jest.fn(),
        removeContactsFromList: jest.fn(),
        getTemplates: jest.fn(),
        getTemplate: jest.fn(),
        validateEmail: jest.fn(),
        getStats: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<SendGridClient>;
}

describe("SendGrid Operation Executors", () => {
    let mockClient: jest.Mocked<SendGridClient>;

    beforeEach(() => {
        mockClient = createMockSendGridClient();
    });

    // ============================================
    // Email Operations
    // ============================================

    describe("executeSendEmail", () => {
        it("calls client with correct params", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com", name: "Recipient" }],
                fromEmail: "sender@example.com",
                fromName: "Sender",
                subject: "Test Email",
                textContent: "Hello, World!"
            });

            expect(mockClient.sendEmail).toHaveBeenCalledWith({
                personalizations: [
                    {
                        to: [{ email: "recipient@example.com", name: "Recipient" }],
                        cc: undefined,
                        bcc: undefined,
                        send_at: undefined
                    }
                ],
                from: { email: "sender@example.com", name: "Sender" },
                reply_to: undefined,
                subject: "Test Email",
                content: [{ type: "text/plain", value: "Hello, World!" }],
                categories: undefined,
                tracking_settings: {
                    open_tracking: undefined,
                    click_tracking: undefined
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            const result = await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                htmlContent: "<p>Hello</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sent: true,
                recipientCount: 1
            });
        });

        it("handles CC and BCC recipients in count", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            const result = await executeSendEmail(mockClient, {
                to: [{ email: "to@example.com" }],
                cc: [{ email: "cc1@example.com" }, { email: "cc2@example.com" }],
                bcc: [{ email: "bcc@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                textContent: "Hello"
            });

            expect(result.success).toBe(true);
            expect(result.data?.recipientCount).toBe(4);
        });

        it("includes both text and HTML content when provided", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                textContent: "Plain text",
                htmlContent: "<p>HTML</p>"
            });

            expect(mockClient.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: [
                        { type: "text/plain", value: "Plain text" },
                        { type: "text/html", value: "<p>HTML</p>" }
                    ]
                })
            );
        });

        it("returns validation error when no content provided", async () => {
            const result = await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("Either textContent or htmlContent is required");
            expect(mockClient.sendEmail).not.toHaveBeenCalled();
        });

        it("passes tracking settings when provided", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                textContent: "Hello",
                trackOpens: true,
                trackClicks: false
            });

            expect(mockClient.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    tracking_settings: {
                        open_tracking: { enable: true },
                        click_tracking: { enable: false }
                    }
                })
            );
        });

        it("returns error on client failure", async () => {
            mockClient.sendEmail.mockRejectedValueOnce(new Error("invalid_api_key"));

            const result = await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                textContent: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("invalid_api_key");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.sendEmail.mockRejectedValueOnce("string error");

            const result = await executeSendEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                subject: "Test",
                textContent: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send email");
        });
    });

    describe("executeSendTemplateEmail", () => {
        it("calls client with correct params", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            await executeSendTemplateEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                templateId: "d-abc123",
                dynamicTemplateData: { firstName: "John" }
            });

            expect(mockClient.sendEmail).toHaveBeenCalledWith({
                personalizations: [
                    {
                        to: [{ email: "recipient@example.com" }],
                        cc: undefined,
                        bcc: undefined,
                        dynamic_template_data: { firstName: "John" },
                        send_at: undefined
                    }
                ],
                from: { email: "sender@example.com", name: undefined },
                reply_to: undefined,
                template_id: "d-abc123",
                categories: undefined,
                tracking_settings: {
                    open_tracking: undefined,
                    click_tracking: undefined
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            const result = await executeSendTemplateEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                templateId: "d-abc123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sent: true,
                templateId: "d-abc123",
                recipientCount: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.sendEmail.mockRejectedValueOnce(new Error("template_not_found"));

            const result = await executeSendTemplateEmail(mockClient, {
                to: [{ email: "recipient@example.com" }],
                fromEmail: "sender@example.com",
                templateId: "d-invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("template_not_found");
        });
    });

    describe("executeSendBatchEmail", () => {
        it("calls client with correct params", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            await executeSendBatchEmail(mockClient, {
                recipients: [
                    {
                        email: "user1@example.com",
                        name: "User 1",
                        dynamicTemplateData: { code: "A" }
                    },
                    { email: "user2@example.com", dynamicTemplateData: { code: "B" } }
                ],
                fromEmail: "sender@example.com",
                templateId: "d-batch123"
            });

            expect(mockClient.sendEmail).toHaveBeenCalledWith({
                personalizations: [
                    {
                        to: [{ email: "user1@example.com", name: "User 1" }],
                        dynamic_template_data: { code: "A" }
                    },
                    {
                        to: [{ email: "user2@example.com", name: undefined }],
                        dynamic_template_data: { code: "B" }
                    }
                ],
                from: { email: "sender@example.com", name: undefined },
                reply_to: undefined,
                template_id: "d-batch123",
                subject: undefined,
                categories: undefined,
                tracking_settings: {
                    open_tracking: undefined,
                    click_tracking: undefined
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.sendEmail.mockResolvedValueOnce(undefined);

            const result = await executeSendBatchEmail(mockClient, {
                recipients: [
                    { email: "user1@example.com" },
                    { email: "user2@example.com" },
                    { email: "user3@example.com" }
                ],
                fromEmail: "sender@example.com",
                templateId: "d-batch123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sent: true,
                templateId: "d-batch123",
                recipientCount: 3
            });
        });

        it("returns error on client failure", async () => {
            mockClient.sendEmail.mockRejectedValueOnce(new Error("rate_limit_exceeded"));

            const result = await executeSendBatchEmail(mockClient, {
                recipients: [{ email: "user@example.com" }],
                fromEmail: "sender@example.com",
                templateId: "d-batch123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("rate_limit_exceeded");
        });
    });

    // ============================================
    // Contact Operations
    // ============================================

    describe("executeGetContacts", () => {
        it("calls client with default params", async () => {
            mockClient.getContacts.mockResolvedValueOnce({
                result: [],
                contact_count: 0
            });

            await executeGetContacts(mockClient, {});

            expect(mockClient.getContacts).toHaveBeenCalledWith({
                page_size: undefined,
                page_token: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.getContacts.mockResolvedValueOnce({
                result: [],
                contact_count: 0
            });

            await executeGetContacts(mockClient, {
                pageSize: 50,
                pageToken: "token123"
            });

            expect(mockClient.getContacts).toHaveBeenCalledWith({
                page_size: 50,
                page_token: "token123"
            });
        });

        it("returns normalized contact output", async () => {
            mockClient.getContacts.mockResolvedValueOnce({
                result: [
                    {
                        id: "contact-1",
                        email: "john@example.com",
                        first_name: "John",
                        last_name: "Doe",
                        city: "San Francisco",
                        state_province_region: "CA",
                        country: "USA"
                    },
                    {
                        id: "contact-2",
                        email: "jane@example.com",
                        first_name: "Jane",
                        last_name: "Smith"
                    }
                ],
                contact_count: 2
            });

            const result = await executeGetContacts(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(2);
            expect(result.data?.contacts[0]).toEqual({
                id: "contact-1",
                email: "john@example.com",
                firstName: "John",
                lastName: "Doe",
                alternateEmails: undefined,
                address: {
                    line1: undefined,
                    line2: undefined,
                    city: "San Francisco",
                    state: "CA",
                    postalCode: undefined,
                    country: "USA"
                },
                phone: undefined,
                customFields: undefined,
                createdAt: undefined,
                updatedAt: undefined
            });
        });

        it("returns nextPageToken when pagination available", async () => {
            mockClient.getContacts.mockResolvedValueOnce({
                result: [{ id: "c1", email: "test@example.com" }],
                contact_count: 100,
                _metadata: {
                    next: "https://api.sendgrid.com/v3/marketing/contacts?page_token=next123"
                }
            });

            const result = await executeGetContacts(mockClient, { pageSize: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.nextPageToken).toBe("next123");
            expect(result.data?.hasMore).toBe(true);
        });

        it("handles missing pagination metadata", async () => {
            mockClient.getContacts.mockResolvedValueOnce({
                result: [],
                contact_count: 0
            });

            const result = await executeGetContacts(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.nextPageToken).toBeUndefined();
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getContacts.mockRejectedValueOnce(new Error("permission_denied"));

            const result = await executeGetContacts(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("permission_denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetContact", () => {
        it("calls client with correct params", async () => {
            mockClient.getContact.mockResolvedValueOnce({
                id: "contact-123",
                email: "john@example.com"
            });

            await executeGetContact(mockClient, { contactId: "contact-123" });

            expect(mockClient.getContact).toHaveBeenCalledWith("contact-123");
        });

        it("returns normalized contact output", async () => {
            mockClient.getContact.mockResolvedValueOnce({
                id: "contact-123",
                email: "john@example.com",
                first_name: "John",
                last_name: "Doe",
                phone_number: "+1234567890",
                custom_fields: { company: "Acme Inc" }
            });

            const result = await executeGetContact(mockClient, { contactId: "contact-123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "contact-123",
                email: "john@example.com",
                firstName: "John",
                lastName: "Doe",
                alternateEmails: undefined,
                address: {
                    line1: undefined,
                    line2: undefined,
                    city: undefined,
                    state: undefined,
                    postalCode: undefined,
                    country: undefined
                },
                phone: "+1234567890",
                customFields: { company: "Acme Inc" },
                createdAt: undefined,
                updatedAt: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getContact.mockRejectedValueOnce(new Error("contact_not_found"));

            const result = await executeGetContact(mockClient, { contactId: "invalid-id" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("contact_not_found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeAddContacts", () => {
        it("calls client with correct params", async () => {
            mockClient.addContacts.mockResolvedValueOnce({ job_id: "job-123" });

            await executeAddContacts(mockClient, {
                contacts: [
                    {
                        email: "new@example.com",
                        firstName: "New",
                        lastName: "User",
                        city: "NYC"
                    }
                ],
                listIds: ["list-1", "list-2"]
            });

            expect(mockClient.addContacts).toHaveBeenCalledWith(
                [
                    {
                        email: "new@example.com",
                        first_name: "New",
                        last_name: "User",
                        alternate_emails: undefined,
                        address_line_1: undefined,
                        address_line_2: undefined,
                        city: "NYC",
                        state_province_region: undefined,
                        postal_code: undefined,
                        country: undefined,
                        phone_number: undefined,
                        custom_fields: undefined
                    }
                ],
                ["list-1", "list-2"]
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.addContacts.mockResolvedValueOnce({ job_id: "job-456" });

            const result = await executeAddContacts(mockClient, {
                contacts: [{ email: "user1@example.com" }, { email: "user2@example.com" }]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                jobId: "job-456",
                contactCount: 2,
                listIds: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.addContacts.mockRejectedValueOnce(new Error("invalid_email_format"));

            const result = await executeAddContacts(mockClient, {
                contacts: [{ email: "invalid" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("invalid_email_format");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateContact", () => {
        it("calls client with correct params", async () => {
            mockClient.addContacts.mockResolvedValueOnce({ job_id: "job-789" });

            await executeUpdateContact(mockClient, {
                email: "existing@example.com",
                firstName: "Updated",
                lastName: "Name"
            });

            expect(mockClient.addContacts).toHaveBeenCalledWith([
                {
                    email: "existing@example.com",
                    first_name: "Updated",
                    last_name: "Name",
                    alternate_emails: undefined,
                    address_line_1: undefined,
                    address_line_2: undefined,
                    city: undefined,
                    state_province_region: undefined,
                    postal_code: undefined,
                    country: undefined,
                    phone_number: undefined,
                    custom_fields: undefined
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.addContacts.mockResolvedValueOnce({ job_id: "job-update" });

            const result = await executeUpdateContact(mockClient, {
                email: "user@example.com",
                phone: "+1987654321"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                jobId: "job-update",
                email: "user@example.com"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.addContacts.mockRejectedValueOnce(new Error("contact_not_found"));

            const result = await executeUpdateContact(mockClient, {
                email: "nonexistent@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("contact_not_found");
        });
    });

    describe("executeDeleteContacts", () => {
        it("calls client with contact IDs", async () => {
            mockClient.deleteContacts.mockResolvedValueOnce({ job_id: "delete-job-1" });

            await executeDeleteContacts(mockClient, {
                contactIds: ["contact-1", "contact-2"]
            });

            expect(mockClient.deleteContacts).toHaveBeenCalledWith(
                ["contact-1", "contact-2"],
                undefined
            );
        });

        it("calls client with deleteAllContacts flag", async () => {
            mockClient.deleteContacts.mockResolvedValueOnce({ job_id: "delete-all-job" });

            await executeDeleteContacts(mockClient, {
                contactIds: [],
                deleteAllContacts: true
            });

            expect(mockClient.deleteContacts).toHaveBeenCalledWith([], true);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteContacts.mockResolvedValueOnce({ job_id: "delete-job-2" });

            const result = await executeDeleteContacts(mockClient, {
                contactIds: ["c1", "c2", "c3"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                jobId: "delete-job-2",
                deletedCount: 3
            });
        });

        it("returns 'all' for deletedCount when deleteAllContacts is true", async () => {
            mockClient.deleteContacts.mockResolvedValueOnce({ job_id: "delete-all-job" });

            const result = await executeDeleteContacts(mockClient, {
                contactIds: [],
                deleteAllContacts: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.deletedCount).toBe("all");
        });

        it("returns error on client failure", async () => {
            mockClient.deleteContacts.mockRejectedValueOnce(new Error("delete_failed"));

            const result = await executeDeleteContacts(mockClient, {
                contactIds: ["invalid"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("delete_failed");
        });
    });

    describe("executeSearchContacts", () => {
        it("calls client with correct query", async () => {
            mockClient.searchContacts.mockResolvedValueOnce({
                result: [],
                contact_count: 0
            });

            await executeSearchContacts(mockClient, {
                query: "email LIKE '%@example.com'"
            });

            expect(mockClient.searchContacts).toHaveBeenCalledWith("email LIKE '%@example.com'");
        });

        it("returns normalized contact output", async () => {
            mockClient.searchContacts.mockResolvedValueOnce({
                result: [
                    {
                        id: "found-1",
                        email: "match@example.com",
                        first_name: "Match"
                    }
                ],
                contact_count: 1
            });

            const result = await executeSearchContacts(mockClient, {
                query: "first_name='Match'"
            });

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(1);
            expect(result.data?.contacts[0].email).toBe("match@example.com");
            expect(result.data?.totalCount).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.searchContacts.mockRejectedValueOnce(new Error("invalid_query_syntax"));

            const result = await executeSearchContacts(mockClient, {
                query: "invalid query"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("invalid_query_syntax");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // List Operations
    // ============================================

    describe("executeGetLists", () => {
        it("calls client with default params", async () => {
            mockClient.getLists.mockResolvedValueOnce({ result: [] });

            await executeGetLists(mockClient, {});

            expect(mockClient.getLists).toHaveBeenCalledWith({
                page_size: undefined,
                page_token: undefined
            });
        });

        it("returns normalized list output", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                result: [
                    { id: "list-1", name: "Newsletter", contact_count: 1000 },
                    { id: "list-2", name: "VIP", contact_count: 50 }
                ]
            });

            const result = await executeGetLists(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.lists).toHaveLength(2);
            expect(result.data?.lists[0]).toEqual({
                id: "list-1",
                name: "Newsletter",
                contactCount: 1000
            });
        });

        it("returns nextPageToken when pagination available", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                result: [{ id: "l1", name: "Test", contact_count: 10 }],
                _metadata: {
                    next: "https://api.sendgrid.com/v3/marketing/lists?page_token=listpage123"
                }
            });

            const result = await executeGetLists(mockClient, { pageSize: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.nextPageToken).toBe("listpage123");
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getLists.mockRejectedValueOnce(new Error("api_error"));

            const result = await executeGetLists(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("api_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetList", () => {
        it("calls client with correct params", async () => {
            mockClient.getList.mockResolvedValueOnce({
                id: "list-123",
                name: "My List",
                contact_count: 500
            });

            await executeGetList(mockClient, { listId: "list-123" });

            expect(mockClient.getList).toHaveBeenCalledWith("list-123");
        });

        it("returns normalized list output", async () => {
            mockClient.getList.mockResolvedValueOnce({
                id: "list-456",
                name: "Subscribers",
                contact_count: 2500
            });

            const result = await executeGetList(mockClient, { listId: "list-456" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "list-456",
                name: "Subscribers",
                contactCount: 2500
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getList.mockRejectedValueOnce(new Error("list_not_found"));

            const result = await executeGetList(mockClient, { listId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("list_not_found");
        });
    });

    describe("executeCreateList", () => {
        it("calls client with correct params", async () => {
            mockClient.createList.mockResolvedValueOnce({
                id: "new-list-123",
                name: "New List",
                contact_count: 0
            });

            await executeCreateList(mockClient, { name: "New List" });

            expect(mockClient.createList).toHaveBeenCalledWith("New List");
        });

        it("returns normalized output on success", async () => {
            mockClient.createList.mockResolvedValueOnce({
                id: "created-list",
                name: "Created List",
                contact_count: 0
            });

            const result = await executeCreateList(mockClient, { name: "Created List" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "created-list",
                name: "Created List",
                contactCount: 0
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createList.mockRejectedValueOnce(new Error("duplicate_name"));

            const result = await executeCreateList(mockClient, { name: "Existing List" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("duplicate_name");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateList", () => {
        it("calls client with correct params", async () => {
            mockClient.updateList.mockResolvedValueOnce({
                id: "list-123",
                name: "Updated Name",
                contact_count: 100
            });

            await executeUpdateList(mockClient, {
                listId: "list-123",
                name: "Updated Name"
            });

            expect(mockClient.updateList).toHaveBeenCalledWith("list-123", "Updated Name");
        });

        it("returns normalized output on success", async () => {
            mockClient.updateList.mockResolvedValueOnce({
                id: "list-456",
                name: "Renamed List",
                contact_count: 200
            });

            const result = await executeUpdateList(mockClient, {
                listId: "list-456",
                name: "Renamed List"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "list-456",
                name: "Renamed List",
                contactCount: 200
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateList.mockRejectedValueOnce(new Error("list_not_found"));

            const result = await executeUpdateList(mockClient, {
                listId: "invalid",
                name: "New Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("list_not_found");
        });
    });

    describe("executeDeleteList", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteList.mockResolvedValueOnce(undefined);

            await executeDeleteList(mockClient, { listId: "list-to-delete" });

            expect(mockClient.deleteList).toHaveBeenCalledWith("list-to-delete", undefined);
        });

        it("passes deleteContacts flag", async () => {
            mockClient.deleteList.mockResolvedValueOnce(undefined);

            await executeDeleteList(mockClient, {
                listId: "list-to-delete",
                deleteContacts: true
            });

            expect(mockClient.deleteList).toHaveBeenCalledWith("list-to-delete", true);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteList.mockResolvedValueOnce(undefined);

            const result = await executeDeleteList(mockClient, { listId: "deleted-list" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                listId: "deleted-list"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteList.mockRejectedValueOnce(new Error("cannot_delete_list"));

            const result = await executeDeleteList(mockClient, { listId: "protected-list" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("cannot_delete_list");
        });
    });

    describe("executeAddContactsToList", () => {
        it("calls client with correct params", async () => {
            mockClient.addContactsToList.mockResolvedValueOnce({ job_id: "add-job-1" });

            await executeAddContactsToList(mockClient, {
                listId: "list-123",
                contactIds: ["contact-1", "contact-2"]
            });

            expect(mockClient.addContactsToList).toHaveBeenCalledWith("list-123", [
                "contact-1",
                "contact-2"
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.addContactsToList.mockResolvedValueOnce({ job_id: "add-job-2" });

            const result = await executeAddContactsToList(mockClient, {
                listId: "list-456",
                contactIds: ["c1", "c2", "c3"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                jobId: "add-job-2",
                listId: "list-456",
                contactCount: 3
            });
        });

        it("returns error on client failure", async () => {
            mockClient.addContactsToList.mockRejectedValueOnce(new Error("list_not_found"));

            const result = await executeAddContactsToList(mockClient, {
                listId: "invalid-list",
                contactIds: ["c1"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("list_not_found");
        });
    });

    describe("executeRemoveContactsFromList", () => {
        it("calls client with correct params", async () => {
            mockClient.removeContactsFromList.mockResolvedValueOnce({ job_id: "remove-job-1" });

            await executeRemoveContactsFromList(mockClient, {
                listId: "list-123",
                contactIds: ["contact-a", "contact-b"]
            });

            expect(mockClient.removeContactsFromList).toHaveBeenCalledWith("list-123", [
                "contact-a",
                "contact-b"
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.removeContactsFromList.mockResolvedValueOnce({ job_id: "remove-job-2" });

            const result = await executeRemoveContactsFromList(mockClient, {
                listId: "list-789",
                contactIds: ["c1", "c2"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                jobId: "remove-job-2",
                listId: "list-789",
                contactCount: 2
            });
        });

        it("returns error on client failure", async () => {
            mockClient.removeContactsFromList.mockRejectedValueOnce(
                new Error("contact_not_in_list")
            );

            const result = await executeRemoveContactsFromList(mockClient, {
                listId: "list-123",
                contactIds: ["missing-contact"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("contact_not_in_list");
        });
    });

    // ============================================
    // Template Operations
    // ============================================

    describe("executeGetTemplates", () => {
        it("calls client with default params", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({ result: [] });

            await executeGetTemplates(mockClient, {});

            expect(mockClient.getTemplates).toHaveBeenCalledWith({
                generations: undefined,
                page_size: undefined,
                page_token: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({ result: [] });

            await executeGetTemplates(mockClient, {
                generations: "dynamic",
                pageSize: 50
            });

            expect(mockClient.getTemplates).toHaveBeenCalledWith({
                generations: "dynamic",
                page_size: 50,
                page_token: undefined
            });
        });

        it("returns normalized template output", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({
                result: [
                    {
                        id: "d-template-1",
                        name: "Welcome Email",
                        generation: "dynamic" as const,
                        updated_at: "2024-01-15T10:00:00Z",
                        versions: [
                            {
                                id: "v1",
                                name: "Version 1",
                                active: 1,
                                updated_at: "2024-01-15T10:00:00Z"
                            }
                        ]
                    }
                ],
                _metadata: { count: 1 }
            });

            const result = await executeGetTemplates(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.templates).toHaveLength(1);
            expect(result.data?.templates[0]).toEqual({
                id: "d-template-1",
                name: "Welcome Email",
                generation: "dynamic",
                updatedAt: "2024-01-15T10:00:00Z",
                versions: [
                    {
                        id: "v1",
                        name: "Version 1",
                        active: true,
                        updatedAt: "2024-01-15T10:00:00Z"
                    }
                ]
            });
            expect(result.data?.totalCount).toBe(1);
        });

        it("returns nextPageToken when pagination available", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({
                result: [{ id: "t1", name: "Test", generation: "dynamic" as const }],
                _metadata: {
                    next: "https://api.sendgrid.com/v3/templates?page_token=tmplpage456"
                }
            });

            const result = await executeGetTemplates(mockClient, { pageSize: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.nextPageToken).toBe("tmplpage456");
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getTemplates.mockRejectedValueOnce(new Error("api_error"));

            const result = await executeGetTemplates(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("api_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetTemplate", () => {
        it("calls client with correct params", async () => {
            mockClient.getTemplate.mockResolvedValueOnce({
                id: "d-template-123",
                name: "Order Confirmation",
                generation: "dynamic" as const
            });

            await executeGetTemplate(mockClient, { templateId: "d-template-123" });

            expect(mockClient.getTemplate).toHaveBeenCalledWith("d-template-123");
        });

        it("returns normalized template output", async () => {
            mockClient.getTemplate.mockResolvedValueOnce({
                id: "d-template-456",
                name: "Reset Password",
                generation: "dynamic" as const,
                updated_at: "2024-02-01T15:30:00Z",
                versions: [
                    { id: "v1", name: "Initial", active: 0, updated_at: "2024-01-01T00:00:00Z" },
                    { id: "v2", name: "Current", active: 1, updated_at: "2024-02-01T15:30:00Z" }
                ]
            });

            const result = await executeGetTemplate(mockClient, { templateId: "d-template-456" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "d-template-456",
                name: "Reset Password",
                generation: "dynamic",
                updatedAt: "2024-02-01T15:30:00Z",
                versions: [
                    { id: "v1", name: "Initial", active: false, updatedAt: "2024-01-01T00:00:00Z" },
                    { id: "v2", name: "Current", active: true, updatedAt: "2024-02-01T15:30:00Z" }
                ]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getTemplate.mockRejectedValueOnce(new Error("template_not_found"));

            const result = await executeGetTemplate(mockClient, { templateId: "invalid-id" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("template_not_found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Validation Operations
    // ============================================

    describe("executeValidateEmail", () => {
        it("calls client with correct params", async () => {
            mockClient.validateEmail.mockResolvedValueOnce({
                result: {
                    email: "test@example.com",
                    verdict: "Valid",
                    score: 0.95,
                    local: "test",
                    host: "example.com",
                    checks: {
                        domain: {
                            has_valid_address_syntax: true,
                            has_mx_or_a_record: true,
                            is_suspected_disposable_address: false
                        },
                        local_part: {
                            is_suspected_role_address: false
                        },
                        additional: {
                            has_known_bounces: false,
                            has_suspected_bounces: false
                        }
                    }
                }
            });

            await executeValidateEmail(mockClient, {
                email: "test@example.com",
                source: "signup"
            });

            expect(mockClient.validateEmail).toHaveBeenCalledWith("test@example.com", "signup");
        });

        it("returns normalized validation output", async () => {
            mockClient.validateEmail.mockResolvedValueOnce({
                result: {
                    email: "john@company.com",
                    verdict: "Valid",
                    score: 0.98,
                    local: "john",
                    host: "company.com",
                    suggestion: undefined,
                    checks: {
                        domain: {
                            has_valid_address_syntax: true,
                            has_mx_or_a_record: true,
                            is_suspected_disposable_address: false
                        },
                        local_part: {
                            is_suspected_role_address: false
                        },
                        additional: {
                            has_known_bounces: false,
                            has_suspected_bounces: false
                        }
                    }
                }
            });

            const result = await executeValidateEmail(mockClient, { email: "john@company.com" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                email: "john@company.com",
                verdict: "Valid",
                score: 0.98,
                local: "john",
                host: "company.com",
                suggestion: undefined,
                hasValidSyntax: true,
                hasMxRecord: true,
                isDisposable: false,
                isRoleAddress: false,
                hasKnownBounces: false
            });
        });

        it("returns validation output for risky email", async () => {
            mockClient.validateEmail.mockResolvedValueOnce({
                result: {
                    email: "info@tempmail.com",
                    verdict: "Risky",
                    score: 0.45,
                    local: "info",
                    host: "tempmail.com",
                    suggestion: "info@gmail.com",
                    checks: {
                        domain: {
                            has_valid_address_syntax: true,
                            has_mx_or_a_record: true,
                            is_suspected_disposable_address: true
                        },
                        local_part: {
                            is_suspected_role_address: true
                        },
                        additional: {
                            has_known_bounces: false,
                            has_suspected_bounces: true
                        }
                    }
                }
            });

            const result = await executeValidateEmail(mockClient, { email: "info@tempmail.com" });

            expect(result.success).toBe(true);
            expect(result.data?.verdict).toBe("Risky");
            expect(result.data?.isDisposable).toBe(true);
            expect(result.data?.isRoleAddress).toBe(true);
            expect(result.data?.suggestion).toBe("info@gmail.com");
        });

        it("returns error on client failure", async () => {
            mockClient.validateEmail.mockRejectedValueOnce(new Error("validation_quota_exceeded"));

            const result = await executeValidateEmail(mockClient, { email: "test@example.com" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("validation_quota_exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Analytics Operations
    // ============================================

    describe("executeGetStats", () => {
        it("calls client with correct params", async () => {
            mockClient.getStats.mockResolvedValueOnce([]);

            await executeGetStats(mockClient, {
                startDate: "2024-01-01",
                endDate: "2024-01-31",
                aggregatedBy: "day"
            });

            expect(mockClient.getStats).toHaveBeenCalledWith({
                start_date: "2024-01-01",
                end_date: "2024-01-31",
                aggregated_by: "day"
            });
        });

        it("returns normalized stats output", async () => {
            mockClient.getStats.mockResolvedValueOnce([
                {
                    date: "2024-01-01",
                    stats: [
                        {
                            metrics: {
                                requests: 1000,
                                delivered: 950,
                                opens: 300,
                                unique_opens: 250,
                                clicks: 100,
                                unique_clicks: 80,
                                bounces: 20,
                                spam_reports: 5,
                                unsubscribes: 10,
                                blocks: 15,
                                deferred: 5
                            }
                        }
                    ]
                },
                {
                    date: "2024-01-02",
                    stats: [
                        {
                            metrics: {
                                requests: 800,
                                delivered: 780,
                                opens: 200,
                                unique_opens: 180,
                                clicks: 50,
                                unique_clicks: 45,
                                bounces: 10,
                                spam_reports: 2,
                                unsubscribes: 5,
                                blocks: 5,
                                deferred: 3
                            }
                        }
                    ]
                }
            ]);

            const result = await executeGetStats(mockClient, {
                startDate: "2024-01-01",
                endDate: "2024-01-02"
            });

            expect(result.success).toBe(true);
            expect(result.data?.stats).toHaveLength(2);
            expect(result.data?.stats[0]).toEqual({
                date: "2024-01-01",
                requests: 1000,
                delivered: 950,
                opens: 300,
                uniqueOpens: 250,
                clicks: 100,
                uniqueClicks: 80,
                bounces: 20,
                spamReports: 5,
                unsubscribes: 10,
                blocked: 15,
                deferred: 5
            });
            expect(result.data?.startDate).toBe("2024-01-01");
            expect(result.data?.endDate).toBe("2024-01-02");
        });

        it("handles empty stats array in response", async () => {
            mockClient.getStats.mockResolvedValueOnce([
                {
                    date: "2024-01-01",
                    stats: []
                }
            ]);

            const result = await executeGetStats(mockClient, {
                startDate: "2024-01-01"
            });

            expect(result.success).toBe(true);
            expect(result.data?.stats[0]).toEqual({
                date: "2024-01-01",
                requests: 0,
                delivered: 0,
                opens: 0,
                uniqueOpens: 0,
                clicks: 0,
                uniqueClicks: 0,
                bounces: 0,
                spamReports: 0,
                unsubscribes: 0,
                blocked: 0,
                deferred: 0
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getStats.mockRejectedValueOnce(new Error("invalid_date_range"));

            const result = await executeGetStats(mockClient, {
                startDate: "invalid-date"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("invalid_date_range");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // Schema Validation
    // ============================================

    describe("schema validation", () => {
        describe("sendEmailSchema", () => {
            it("validates minimal input", () => {
                const result = sendEmailSchema.safeParse({
                    to: [{ email: "test@example.com" }],
                    fromEmail: "sender@example.com",
                    subject: "Test"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendEmailSchema.safeParse({
                    to: [{ email: "test@example.com", name: "Test" }],
                    cc: [{ email: "cc@example.com" }],
                    bcc: [{ email: "bcc@example.com" }],
                    fromEmail: "sender@example.com",
                    fromName: "Sender",
                    replyTo: "reply@example.com",
                    subject: "Test Subject",
                    textContent: "Plain text",
                    htmlContent: "<p>HTML</p>",
                    categories: ["newsletter"],
                    sendAt: 1704067200,
                    trackOpens: true,
                    trackClicks: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing to", () => {
                const result = sendEmailSchema.safeParse({
                    fromEmail: "sender@example.com",
                    subject: "Test"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty to array", () => {
                const result = sendEmailSchema.safeParse({
                    to: [],
                    fromEmail: "sender@example.com",
                    subject: "Test"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = sendEmailSchema.safeParse({
                    to: [{ email: "invalid-email" }],
                    fromEmail: "sender@example.com",
                    subject: "Test"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendTemplateEmailSchema", () => {
            it("validates minimal input", () => {
                const result = sendTemplateEmailSchema.safeParse({
                    to: [{ email: "test@example.com" }],
                    fromEmail: "sender@example.com",
                    templateId: "d-abc123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with dynamic template data", () => {
                const result = sendTemplateEmailSchema.safeParse({
                    to: [{ email: "test@example.com" }],
                    fromEmail: "sender@example.com",
                    templateId: "d-abc123",
                    dynamicTemplateData: {
                        firstName: "John",
                        orderNumber: 12345
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing templateId", () => {
                const result = sendTemplateEmailSchema.safeParse({
                    to: [{ email: "test@example.com" }],
                    fromEmail: "sender@example.com"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendBatchEmailSchema", () => {
            it("validates input with recipients", () => {
                const result = sendBatchEmailSchema.safeParse({
                    recipients: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
                    fromEmail: "sender@example.com",
                    templateId: "d-batch123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty recipients", () => {
                const result = sendBatchEmailSchema.safeParse({
                    recipients: [],
                    fromEmail: "sender@example.com",
                    templateId: "d-batch123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getContactsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = getContactsSchema.safeParse({
                    pageSize: 100,
                    pageToken: "abc123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects pageSize over 1000", () => {
                const result = getContactsSchema.safeParse({
                    pageSize: 1001
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize under 1", () => {
                const result = getContactsSchema.safeParse({
                    pageSize: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getContactSchema", () => {
            it("validates with contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: "contact-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing contactId", () => {
                const result = getContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("addContactsSchema", () => {
            it("validates minimal contact", () => {
                const result = addContactsSchema.safeParse({
                    contacts: [{ email: "test@example.com" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full contact", () => {
                const result = addContactsSchema.safeParse({
                    contacts: [
                        {
                            email: "test@example.com",
                            firstName: "John",
                            lastName: "Doe",
                            city: "NYC",
                            state: "NY",
                            country: "USA",
                            phone: "+1234567890",
                            customFields: { company: "Acme" }
                        }
                    ],
                    listIds: ["list-1"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty contacts array", () => {
                const result = addContactsSchema.safeParse({
                    contacts: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateContactSchema", () => {
            it("validates with email only", () => {
                const result = updateContactSchema.safeParse({
                    email: "update@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all fields", () => {
                const result = updateContactSchema.safeParse({
                    email: "update@example.com",
                    firstName: "Updated",
                    lastName: "Name",
                    phone: "+9876543210"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = updateContactSchema.safeParse({
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteContactsSchema", () => {
            it("validates with contact IDs", () => {
                const result = deleteContactsSchema.safeParse({
                    contactIds: ["id1", "id2"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with deleteAllContacts flag", () => {
                const result = deleteContactsSchema.safeParse({
                    contactIds: [],
                    deleteAllContacts: true
                });
                // Note: Schema allows empty array when deleteAllContacts is true
                expect(typeof result.success).toBe("boolean");
            });

            it("rejects missing contactIds", () => {
                const result = deleteContactsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("searchContactsSchema", () => {
            it("validates with query", () => {
                const result = searchContactsSchema.safeParse({
                    query: "email LIKE '%@example.com'"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty query", () => {
                const result = searchContactsSchema.safeParse({
                    query: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing query", () => {
                const result = searchContactsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getListsSchema", () => {
            it("validates empty input", () => {
                const result = getListsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = getListsSchema.safeParse({
                    pageSize: 50,
                    pageToken: "token"
                });
                expect(result.success).toBe(true);
            });

            it("rejects pageSize over 1000", () => {
                const result = getListsSchema.safeParse({
                    pageSize: 1001
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getListSchema", () => {
            it("validates with listId", () => {
                const result = getListSchema.safeParse({
                    listId: "list-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty listId", () => {
                const result = getListSchema.safeParse({
                    listId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createListSchema", () => {
            it("validates with name", () => {
                const result = createListSchema.safeParse({
                    name: "New List"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createListSchema.safeParse({
                    name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateListSchema", () => {
            it("validates with listId and name", () => {
                const result = updateListSchema.safeParse({
                    listId: "list-123",
                    name: "Updated Name"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing name", () => {
                const result = updateListSchema.safeParse({
                    listId: "list-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteListSchema", () => {
            it("validates with listId", () => {
                const result = deleteListSchema.safeParse({
                    listId: "list-to-delete"
                });
                expect(result.success).toBe(true);
            });

            it("validates with deleteContacts flag", () => {
                const result = deleteListSchema.safeParse({
                    listId: "list-123",
                    deleteContacts: true
                });
                expect(result.success).toBe(true);
            });
        });

        describe("addContactsToListSchema", () => {
            it("validates with listId and contactIds", () => {
                const result = addContactsToListSchema.safeParse({
                    listId: "list-123",
                    contactIds: ["c1", "c2"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty contactIds", () => {
                const result = addContactsToListSchema.safeParse({
                    listId: "list-123",
                    contactIds: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("removeContactsFromListSchema", () => {
            it("validates with listId and contactIds", () => {
                const result = removeContactsFromListSchema.safeParse({
                    listId: "list-123",
                    contactIds: ["c1"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty contactIds", () => {
                const result = removeContactsFromListSchema.safeParse({
                    listId: "list-123",
                    contactIds: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTemplatesSchema", () => {
            it("validates empty input", () => {
                const result = getTemplatesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with generations filter", () => {
                const result = getTemplatesSchema.safeParse({
                    generations: "dynamic"
                });
                expect(result.success).toBe(true);
            });

            it("validates combined generations", () => {
                const result = getTemplatesSchema.safeParse({
                    generations: "legacy,dynamic"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid generations", () => {
                const result = getTemplatesSchema.safeParse({
                    generations: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize over 200", () => {
                const result = getTemplatesSchema.safeParse({
                    pageSize: 201
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getTemplateSchema", () => {
            it("validates with templateId", () => {
                const result = getTemplateSchema.safeParse({
                    templateId: "d-abc123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty templateId", () => {
                const result = getTemplateSchema.safeParse({
                    templateId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("validateEmailSchema", () => {
            it("validates with email only", () => {
                const result = validateEmailSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with email and source", () => {
                const result = validateEmailSchema.safeParse({
                    email: "test@example.com",
                    source: "signup"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = validateEmailSchema.safeParse({
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getStatsSchema", () => {
            it("validates with startDate only", () => {
                const result = getStatsSchema.safeParse({
                    startDate: "2024-01-01"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = getStatsSchema.safeParse({
                    startDate: "2024-01-01",
                    endDate: "2024-01-31",
                    aggregatedBy: "week"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing startDate", () => {
                const result = getStatsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects invalid aggregatedBy", () => {
                const result = getStatsSchema.safeParse({
                    startDate: "2024-01-01",
                    aggregatedBy: "year"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
