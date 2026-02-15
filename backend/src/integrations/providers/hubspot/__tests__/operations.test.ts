/**
 * HubSpot Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Contact Operations

// Company Operations

// Deal Operations

// Association Operations
import {
    executeCreateAssociation,
    createAssociationSchema,
    executeDeleteAssociation,
    deleteAssociationSchema,
    executeListAssociations,
    listAssociationsSchema,
    executeBatchCreateAssociations,
    batchCreateAssociationsSchema
} from "../operations/associations";
import {
    executeCreateCompany,
    createCompanySchema,
    executeGetCompany,
    getCompanySchema,
    executeUpdateCompany,
    updateCompanySchema,
    executeDeleteCompany,
    deleteCompanySchema,
    executeListCompanies,
    listCompaniesSchema,
    executeSearchCompanies,
    searchCompaniesSchema
} from "../operations/companies";
import {
    executeCreateContact,
    createContactSchema,
    executeGetContact,
    getContactSchema,
    executeUpdateContact,
    updateContactSchema,
    executeDeleteContact,
    deleteContactSchema,
    executeListContacts,
    listContactsSchema,
    executeSearchContacts,
    searchContactsSchema,
    executeBatchCreateContacts,
    batchCreateContactsSchema,
    executeBatchUpdateContacts,
    batchUpdateContactsSchema,
    executeBatchReadContacts,
    batchReadContactsSchema,
    executeBatchUpsertContacts,
    batchUpsertContactsSchema
} from "../operations/contacts";
import {
    executeCreateDeal,
    createDealSchema,
    executeGetDeal,
    getDealSchema,
    executeUpdateDeal,
    updateDealSchema,
    executeDeleteDeal,
    deleteDealSchema,
    executeListDeals,
    listDealsSchema,
    executeSearchDeals,
    searchDealsSchema
} from "../operations/deals";

// Owner Operations

// Engagement Operations - Notes
import {
    executeCreateNote,
    executeGetNote,
    executeUpdateNote,
    executeDeleteNote,
    executeListNotes
} from "../operations/engagements/notes";
import { createNoteSchema } from "../operations/engagements/notes/createNote";
import { deleteNoteSchema } from "../operations/engagements/notes/deleteNote";
import { getNoteSchema } from "../operations/engagements/notes/getNote";
import { listNotesSchema } from "../operations/engagements/notes/listNotes";
import { updateNoteSchema } from "../operations/engagements/notes/updateNote";

// Engagement Operations - Tasks
import {
    executeCreateTask,
    executeGetTask,
    executeUpdateTask,
    executeDeleteTask,
    executeListTasks
} from "../operations/engagements/tasks";
import { createTaskSchema } from "../operations/engagements/tasks/createTask";
import { deleteTaskSchema } from "../operations/engagements/tasks/deleteTask";
import { getTaskSchema } from "../operations/engagements/tasks/getTask";
import { listTasksSchema } from "../operations/engagements/tasks/listTasks";
import { updateTaskSchema } from "../operations/engagements/tasks/updateTask";
import { executeListOwners, executeGetOwner } from "../operations/owners";
import { getOwnerSchema } from "../operations/owners/getOwner";
import { listOwnersSchema } from "../operations/owners/listOwners";

import type { HubspotClient } from "../client/HubspotClient";

// Mock HubspotClient factory
function createMockHubspotClient(): jest.Mocked<HubspotClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<HubspotClient>;
}

// Sample HubSpot response data
const sampleContact = {
    id: "12345",
    properties: {
        email: "test@example.com",
        firstname: "John",
        lastname: "Doe",
        phone: "+1234567890"
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z"
};

const sampleCompany = {
    id: "67890",
    properties: {
        name: "Acme Corp",
        domain: "acme.com",
        industry: "Technology"
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z"
};

const sampleDeal = {
    id: "11111",
    properties: {
        dealname: "Big Deal",
        amount: "50000",
        dealstage: "qualifiedtobuy"
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z"
};

const sampleOwner = {
    id: "owner123",
    email: "owner@example.com",
    firstName: "Jane",
    lastName: "Smith",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    archived: false
};

const sampleNote = {
    id: "note123",
    properties: {
        hs_note_body: "This is a note",
        hs_timestamp: "2024-01-15T10:00:00.000Z"
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z"
};

const sampleTask = {
    id: "task123",
    properties: {
        hs_task_subject: "Follow up",
        hs_task_body: "Need to follow up with client",
        hs_timestamp: "2024-01-15T10:00:00.000Z"
    },
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z"
};

describe("HubSpot Operation Executors", () => {
    let mockClient: jest.Mocked<HubspotClient>;

    beforeEach(() => {
        mockClient = createMockHubspotClient();
    });

    // =========================================================================
    // CONTACT OPERATIONS
    // =========================================================================

    describe("executeCreateContact", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleContact);

            await executeCreateContact(mockClient, {
                properties: {
                    email: "test@example.com",
                    firstname: "John",
                    lastname: "Doe"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts", {
                properties: {
                    email: "test@example.com",
                    firstname: "John",
                    lastname: "Doe"
                },
                associations: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleContact);

            const result = await executeCreateContact(mockClient, {
                properties: { email: "test@example.com" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleContact);
        });

        it("includes associations when provided", async () => {
            mockClient.post.mockResolvedValueOnce(sampleContact);

            const associations = [
                {
                    to: { id: "company123" },
                    types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }]
                }
            ];

            await executeCreateContact(mockClient, {
                properties: { email: "test@example.com" },
                associations
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts", {
                properties: { email: "test@example.com" },
                associations
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Contact already exists"));

            const result = await executeCreateContact(mockClient, {
                properties: { email: "test@example.com" }
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Contact already exists");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce("string error");

            const result = await executeCreateContact(mockClient, {
                properties: { email: "test@example.com" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create contact");
        });
    });

    describe("executeGetContact", () => {
        it("fetches contact by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleContact);

            await executeGetContact(mockClient, {
                contactId: "12345"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/contacts/12345", {});
        });

        it("fetches contact by email", async () => {
            mockClient.get.mockResolvedValueOnce(sampleContact);

            await executeGetContact(mockClient, {
                email: "test@example.com"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/crm/v3/objects/contacts/test%40example.com",
                { idProperty: "email" }
            );
        });

        it("includes properties when specified", async () => {
            mockClient.get.mockResolvedValueOnce(sampleContact);

            await executeGetContact(mockClient, {
                contactId: "12345",
                properties: ["email", "firstname", "lastname"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/contacts/12345", {
                properties: ["email", "firstname", "lastname"]
            });
        });

        it("includes associations when specified", async () => {
            mockClient.get.mockResolvedValueOnce(sampleContact);

            await executeGetContact(mockClient, {
                contactId: "12345",
                associations: ["companies", "deals"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/contacts/12345", {
                associations: ["companies", "deals"]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleContact);

            const result = await executeGetContact(mockClient, {
                contactId: "12345"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleContact);
        });

        it("returns error when contact not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeGetContact(mockClient, {
                contactId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Contact not found");
        });
    });

    describe("executeUpdateContact", () => {
        it("updates contact by ID", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...sampleContact,
                properties: { ...sampleContact.properties, firstname: "Jane" }
            });

            await executeUpdateContact(mockClient, {
                contactId: "12345",
                properties: { firstname: "Jane" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/crm/v3/objects/contacts/12345", {
                properties: { firstname: "Jane" }
            });
        });

        it("updates contact by email", async () => {
            mockClient.patch.mockResolvedValueOnce(sampleContact);

            await executeUpdateContact(mockClient, {
                email: "test@example.com",
                properties: { firstname: "Jane" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith(
                "/crm/v3/objects/contacts/test%40example.com",
                { properties: { firstname: "Jane" } }
            );
        });

        it("returns normalized output on success", async () => {
            const updatedContact = {
                ...sampleContact,
                properties: { ...sampleContact.properties, firstname: "Jane" }
            };
            mockClient.patch.mockResolvedValueOnce(updatedContact);

            const result = await executeUpdateContact(mockClient, {
                contactId: "12345",
                properties: { firstname: "Jane" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedContact);
        });

        it("returns error on client failure", async () => {
            mockClient.patch.mockRejectedValueOnce(new Error("Invalid property"));

            const result = await executeUpdateContact(mockClient, {
                contactId: "12345",
                properties: { invalid_property: "value" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid property");
        });
    });

    describe("executeDeleteContact", () => {
        it("deletes contact by ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteContact(mockClient, {
                contactId: "12345"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/crm/v3/objects/contacts/12345");
        });

        it("returns success with deleted info", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteContact(mockClient, {
                contactId: "12345"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                contactId: "12345"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("Contact not found"));

            const result = await executeDeleteContact(mockClient, {
                contactId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Contact not found");
        });
    });

    describe("executeListContacts", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleContact],
                paging: {}
            });

            await executeListContacts(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/contacts", {
                limit: 10
            });
        });

        it("includes pagination cursor when provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleContact],
                paging: {}
            });

            await executeListContacts(mockClient, {
                limit: 10,
                after: "cursor123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/contacts", {
                limit: 10,
                after: "cursor123"
            });
        });

        it("returns paginated results", async () => {
            const response = {
                results: [sampleContact],
                paging: {
                    next: {
                        after: "nextcursor",
                        link: "https://api.hubapi.com/..."
                    }
                }
            };
            mockClient.get.mockResolvedValueOnce(response);

            const result = await executeListContacts(mockClient, { limit: 10 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(response);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeListContacts(mockClient, { limit: 10 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Unauthorized");
        });
    });

    describe("executeSearchContacts", () => {
        it("calls client with search filters", async () => {
            mockClient.post.mockResolvedValueOnce({
                results: [sampleContact],
                paging: {}
            });

            await executeSearchContacts(mockClient, {
                filterGroups: [
                    {
                        filters: [
                            { propertyName: "email", operator: "CONTAINS", value: "@example.com" }
                        ]
                    }
                ],
                limit: 10
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/search", {
                filterGroups: [
                    {
                        filters: [
                            { propertyName: "email", operator: "CONTAINS", value: "@example.com" }
                        ]
                    }
                ],
                sorts: undefined,
                properties: undefined,
                limit: 10,
                after: undefined
            });
        });

        it("includes sorting when provided", async () => {
            mockClient.post.mockResolvedValueOnce({
                results: [sampleContact],
                paging: {}
            });

            await executeSearchContacts(mockClient, {
                sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
                limit: 10
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/search", {
                filterGroups: undefined,
                sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
                properties: undefined,
                limit: 10,
                after: undefined
            });
        });

        it("returns search results", async () => {
            const response = { results: [sampleContact], paging: {} };
            mockClient.post.mockResolvedValueOnce(response);

            const result = await executeSearchContacts(mockClient, { limit: 10 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(response);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Invalid filter"));

            const result = await executeSearchContacts(mockClient, { limit: 10 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid filter");
        });
    });

    describe("executeBatchCreateContacts", () => {
        it("creates multiple contacts", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact, { ...sampleContact, id: "12346" }],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            await executeBatchCreateContacts(mockClient, {
                inputs: [
                    { properties: { email: "test1@example.com" } },
                    { properties: { email: "test2@example.com" } }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/batch/create", {
                inputs: [
                    { properties: { email: "test1@example.com" } },
                    { properties: { email: "test2@example.com" } }
                ]
            });
        });

        it("returns batch response on success", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            const result = await executeBatchCreateContacts(mockClient, {
                inputs: [{ properties: { email: "test@example.com" } }]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(batchResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Batch limit exceeded"));

            const result = await executeBatchCreateContacts(mockClient, {
                inputs: [{ properties: { email: "test@example.com" } }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Batch limit exceeded");
        });
    });

    describe("executeBatchUpdateContacts", () => {
        it("updates multiple contacts", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            await executeBatchUpdateContacts(mockClient, {
                inputs: [{ id: "12345", properties: { firstname: "Updated" } }]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/batch/update", {
                inputs: [{ id: "12345", properties: { firstname: "Updated" } }]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Some contacts not found"));

            const result = await executeBatchUpdateContacts(mockClient, {
                inputs: [{ id: "invalid", properties: { firstname: "Updated" } }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Some contacts not found");
        });
    });

    describe("executeBatchReadContacts", () => {
        it("reads multiple contacts by IDs", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            await executeBatchReadContacts(mockClient, {
                inputs: [{ id: "12345" }, { id: "12346" }]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/batch/read", {
                inputs: [{ id: "12345" }, { id: "12346" }],
                properties: undefined
            });
        });

        it("includes properties when specified", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            await executeBatchReadContacts(mockClient, {
                inputs: [{ id: "12345" }],
                properties: ["email", "firstname"]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/batch/read", {
                inputs: [{ id: "12345" }],
                properties: ["email", "firstname"]
            });
        });
    });

    describe("executeBatchUpsertContacts", () => {
        it("upserts multiple contacts", async () => {
            const batchResponse = {
                status: "COMPLETE",
                results: [sampleContact],
                startedAt: "2024-01-15T10:00:00.000Z",
                completedAt: "2024-01-15T10:00:01.000Z"
            };
            mockClient.post.mockResolvedValueOnce(batchResponse);

            await executeBatchUpsertContacts(mockClient, {
                inputs: [{ properties: { email: "test@example.com" }, idProperty: "email" }]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/contacts/batch/upsert", {
                inputs: [{ properties: { email: "test@example.com" }, idProperty: "email" }]
            });
        });
    });

    // =========================================================================
    // COMPANY OPERATIONS
    // =========================================================================

    describe("executeCreateCompany", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleCompany);

            await executeCreateCompany(mockClient, {
                properties: {
                    name: "Acme Corp",
                    domain: "acme.com"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/companies", {
                properties: {
                    name: "Acme Corp",
                    domain: "acme.com"
                },
                associations: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleCompany);

            const result = await executeCreateCompany(mockClient, {
                properties: { name: "Acme Corp" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleCompany);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Company already exists"));

            const result = await executeCreateCompany(mockClient, {
                properties: { name: "Acme Corp" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Company already exists");
        });
    });

    describe("executeGetCompany", () => {
        it("fetches company by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleCompany);

            await executeGetCompany(mockClient, {
                companyId: "67890"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/companies/67890", {});
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleCompany);

            const result = await executeGetCompany(mockClient, {
                companyId: "67890"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleCompany);
        });
    });

    describe("executeUpdateCompany", () => {
        it("updates company by ID", async () => {
            mockClient.patch.mockResolvedValueOnce(sampleCompany);

            await executeUpdateCompany(mockClient, {
                companyId: "67890",
                properties: { name: "Updated Corp" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/crm/v3/objects/companies/67890", {
                properties: { name: "Updated Corp" }
            });
        });
    });

    describe("executeDeleteCompany", () => {
        it("deletes company by ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteCompany(mockClient, {
                companyId: "67890"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/crm/v3/objects/companies/67890");
            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                companyId: "67890"
            });
        });
    });

    describe("executeListCompanies", () => {
        it("calls client with params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleCompany],
                paging: {}
            });

            await executeListCompanies(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/companies", {
                limit: 10
            });
        });
    });

    describe("executeSearchCompanies", () => {
        it("searches companies with filters", async () => {
            mockClient.post.mockResolvedValueOnce({
                results: [sampleCompany],
                paging: {}
            });

            await executeSearchCompanies(mockClient, {
                filterGroups: [
                    {
                        filters: [{ propertyName: "domain", operator: "EQ", value: "acme.com" }]
                    }
                ],
                limit: 10
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/companies/search", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "domain", operator: "EQ", value: "acme.com" }]
                    }
                ],
                sorts: undefined,
                properties: undefined,
                limit: 10,
                after: undefined
            });
        });
    });

    // =========================================================================
    // DEAL OPERATIONS
    // =========================================================================

    describe("executeCreateDeal", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleDeal);

            await executeCreateDeal(mockClient, {
                properties: {
                    dealname: "Big Deal",
                    amount: "50000"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/deals", {
                properties: {
                    dealname: "Big Deal",
                    amount: "50000"
                },
                associations: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleDeal);

            const result = await executeCreateDeal(mockClient, {
                properties: { dealname: "Big Deal" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleDeal);
        });
    });

    describe("executeGetDeal", () => {
        it("fetches deal by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleDeal);

            await executeGetDeal(mockClient, {
                dealId: "11111"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/deals/11111", {});
        });

        it("includes properties and associations", async () => {
            mockClient.get.mockResolvedValueOnce(sampleDeal);

            await executeGetDeal(mockClient, {
                dealId: "11111",
                properties: ["dealname", "amount"],
                associations: ["contacts", "companies"]
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/deals/11111", {
                properties: ["dealname", "amount"],
                associations: ["contacts", "companies"]
            });
        });
    });

    describe("executeUpdateDeal", () => {
        it("updates deal by ID", async () => {
            mockClient.patch.mockResolvedValueOnce(sampleDeal);

            await executeUpdateDeal(mockClient, {
                dealId: "11111",
                properties: { amount: "75000" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/crm/v3/objects/deals/11111", {
                properties: { amount: "75000" }
            });
        });
    });

    describe("executeDeleteDeal", () => {
        it("deletes deal by ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteDeal(mockClient, {
                dealId: "11111"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/crm/v3/objects/deals/11111");
            expect(result.success).toBe(true);
        });
    });

    describe("executeListDeals", () => {
        it("lists deals with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleDeal],
                paging: {}
            });

            await executeListDeals(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/deals", {
                limit: 10
            });
        });
    });

    describe("executeSearchDeals", () => {
        it("searches deals with filters", async () => {
            mockClient.post.mockResolvedValueOnce({
                results: [sampleDeal],
                paging: {}
            });

            await executeSearchDeals(mockClient, {
                filterGroups: [
                    {
                        filters: [{ propertyName: "amount", operator: "GT", value: 10000 }]
                    }
                ],
                limit: 10
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/deals/search", {
                filterGroups: [
                    {
                        filters: [{ propertyName: "amount", operator: "GT", value: 10000 }]
                    }
                ],
                sorts: undefined,
                properties: undefined,
                limit: 10,
                after: undefined
            });
        });
    });

    // =========================================================================
    // ASSOCIATION OPERATIONS
    // =========================================================================

    describe("executeCreateAssociation", () => {
        it("creates association between objects", async () => {
            mockClient.put.mockResolvedValueOnce({});

            await executeCreateAssociation(mockClient, {
                fromObjectType: "contacts",
                fromObjectId: "12345",
                toObjectType: "companies",
                toObjectId: "67890",
                associationTypeId: 1
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/crm/v3/objects/contacts/12345/associations/companies/67890/1"
            );
        });

        it("returns success on association created", async () => {
            mockClient.put.mockResolvedValueOnce({});

            const result = await executeCreateAssociation(mockClient, {
                fromObjectType: "contacts",
                fromObjectId: "12345",
                toObjectType: "companies",
                toObjectId: "67890",
                associationTypeId: 1
            });

            expect(result.success).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Invalid association type"));

            const result = await executeCreateAssociation(mockClient, {
                fromObjectType: "contacts",
                fromObjectId: "12345",
                toObjectType: "companies",
                toObjectId: "67890",
                associationTypeId: 999
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid association type");
        });
    });

    describe("executeDeleteAssociation", () => {
        it("deletes association between objects", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteAssociation(mockClient, {
                fromObjectType: "contacts",
                fromObjectId: "12345",
                toObjectType: "companies",
                toObjectId: "67890",
                associationTypeId: 1
            });

            expect(mockClient.delete).toHaveBeenCalledWith(
                "/crm/v3/objects/contacts/12345/associations/companies/67890/1"
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                fromObjectType: "contacts",
                fromObjectId: "12345",
                toObjectType: "companies",
                toObjectId: "67890"
            });
        });
    });

    describe("executeListAssociations", () => {
        it("lists associations for an object", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [{ id: "67890", type: "company_to_contact" }]
            });

            await executeListAssociations(mockClient, {
                objectType: "contacts",
                objectId: "12345",
                toObjectType: "companies"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/crm/v3/objects/contacts/12345/associations/companies"
            );
        });
    });

    describe("executeBatchCreateAssociations", () => {
        it("creates multiple associations", async () => {
            mockClient.post.mockResolvedValueOnce({ results: [] });

            await executeBatchCreateAssociations(mockClient, {
                fromObjectType: "contacts",
                toObjectType: "companies",
                inputs: [{ from: { id: "12345" }, to: { id: "67890" }, type: "contact_to_company" }]
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/crm/v3/associations/contacts/companies/batch/create",
                {
                    inputs: [
                        { from: { id: "12345" }, to: { id: "67890" }, type: "contact_to_company" }
                    ]
                }
            );
        });
    });

    // =========================================================================
    // OWNER OPERATIONS
    // =========================================================================

    describe("executeListOwners", () => {
        it("lists owners with default params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleOwner],
                paging: {}
            });

            await executeListOwners(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/owners", {
                limit: 10
            });
        });

        it("includes archived filter when specified", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleOwner],
                paging: {}
            });

            await executeListOwners(mockClient, {
                limit: 10,
                archived: true
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/owners", {
                limit: 10,
                archived: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleOwner],
                paging: {}
            });

            const result = await executeListOwners(mockClient, { limit: 10 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                results: [sampleOwner],
                paging: {}
            });
        });
    });

    describe("executeGetOwner", () => {
        it("fetches owner by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleOwner);

            await executeGetOwner(mockClient, {
                ownerId: "owner123"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/owners/owner123");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleOwner);

            const result = await executeGetOwner(mockClient, {
                ownerId: "owner123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleOwner);
        });
    });

    // =========================================================================
    // ENGAGEMENT OPERATIONS - NOTES
    // =========================================================================

    describe("executeCreateNote", () => {
        it("creates a note", async () => {
            mockClient.post.mockResolvedValueOnce(sampleNote);

            await executeCreateNote(mockClient, {
                properties: {
                    hs_note_body: "This is a note"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/notes", {
                properties: { hs_note_body: "This is a note" },
                associations: undefined
            });
        });

        it("includes associations when provided", async () => {
            mockClient.post.mockResolvedValueOnce(sampleNote);

            const associations = [
                {
                    to: { id: "12345" },
                    types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]
                }
            ];

            await executeCreateNote(mockClient, {
                properties: { hs_note_body: "Note with association" },
                associations
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/notes", {
                properties: { hs_note_body: "Note with association" },
                associations
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleNote);

            const result = await executeCreateNote(mockClient, {
                properties: { hs_note_body: "Test note" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleNote);
        });
    });

    describe("executeGetNote", () => {
        it("fetches note by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleNote);

            await executeGetNote(mockClient, { noteId: "note123" });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/notes/note123", {});
        });
    });

    describe("executeUpdateNote", () => {
        it("updates note by ID", async () => {
            mockClient.patch.mockResolvedValueOnce(sampleNote);

            await executeUpdateNote(mockClient, {
                noteId: "note123",
                properties: { hs_note_body: "Updated note" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/crm/v3/objects/notes/note123", {
                properties: { hs_note_body: "Updated note" }
            });
        });
    });

    describe("executeDeleteNote", () => {
        it("deletes note by ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteNote(mockClient, { noteId: "note123" });

            expect(mockClient.delete).toHaveBeenCalledWith("/crm/v3/objects/notes/note123");
            expect(result.success).toBe(true);
        });
    });

    describe("executeListNotes", () => {
        it("lists notes with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleNote],
                paging: {}
            });

            await executeListNotes(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/notes", {
                limit: 10
            });
        });
    });

    // =========================================================================
    // ENGAGEMENT OPERATIONS - TASKS
    // =========================================================================

    describe("executeCreateTask", () => {
        it("creates a task", async () => {
            mockClient.post.mockResolvedValueOnce(sampleTask);

            await executeCreateTask(mockClient, {
                properties: {
                    hs_task_subject: "Follow up",
                    hs_task_body: "Need to follow up"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/crm/v3/objects/tasks", {
                properties: {
                    hs_task_subject: "Follow up",
                    hs_task_body: "Need to follow up"
                },
                associations: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleTask);

            const result = await executeCreateTask(mockClient, {
                properties: { hs_task_subject: "Test task" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(sampleTask);
        });
    });

    describe("executeGetTask", () => {
        it("fetches task by ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleTask);

            await executeGetTask(mockClient, { taskId: "task123" });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/tasks/task123", {});
        });
    });

    describe("executeUpdateTask", () => {
        it("updates task by ID", async () => {
            mockClient.patch.mockResolvedValueOnce(sampleTask);

            await executeUpdateTask(mockClient, {
                taskId: "task123",
                properties: { hs_task_subject: "Updated task" }
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/crm/v3/objects/tasks/task123", {
                properties: { hs_task_subject: "Updated task" }
            });
        });
    });

    describe("executeDeleteTask", () => {
        it("deletes task by ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteTask(mockClient, { taskId: "task123" });

            expect(mockClient.delete).toHaveBeenCalledWith("/crm/v3/objects/tasks/task123");
            expect(result.success).toBe(true);
        });
    });

    describe("executeListTasks", () => {
        it("lists tasks with pagination", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [sampleTask],
                paging: {}
            });

            await executeListTasks(mockClient, { limit: 10 });

            expect(mockClient.get).toHaveBeenCalledWith("/crm/v3/objects/tasks", {
                limit: 10
            });
        });
    });

    // =========================================================================
    // SCHEMA VALIDATION TESTS
    // =========================================================================

    describe("schema validation", () => {
        describe("createContactSchema", () => {
            it("validates minimal input", () => {
                const result = createContactSchema.safeParse({
                    properties: { email: "test@example.com" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with associations", () => {
                const result = createContactSchema.safeParse({
                    properties: { email: "test@example.com" },
                    associations: [
                        {
                            to: { id: "123" },
                            types: [
                                { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }
                            ]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing properties", () => {
                const result = createContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getContactSchema", () => {
            it("validates with contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: "12345"
                });
                expect(result.success).toBe(true);
            });

            it("validates with email", () => {
                const result = getContactSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects without contactId or email", () => {
                const result = getContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects invalid email format", () => {
                const result = getContactSchema.safeParse({
                    email: "invalid-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateContactSchema", () => {
            it("validates with contactId", () => {
                const result = updateContactSchema.safeParse({
                    contactId: "12345",
                    properties: { firstname: "Updated" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with email", () => {
                const result = updateContactSchema.safeParse({
                    email: "test@example.com",
                    properties: { firstname: "Updated" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects without contactId or email", () => {
                const result = updateContactSchema.safeParse({
                    properties: { firstname: "Updated" }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteContactSchema", () => {
            it("validates with contactId", () => {
                const result = deleteContactSchema.safeParse({
                    contactId: "12345"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = deleteContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listContactsSchema", () => {
            it("validates empty input (uses defaults)", () => {
                const result = listContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listContactsSchema.parse({});
                expect(result.limit).toBe(10);
            });

            it("validates with all options", () => {
                const result = listContactsSchema.safeParse({
                    limit: 50,
                    after: "cursor123",
                    properties: ["email", "firstname"],
                    associations: ["companies"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid limit (> 100)", () => {
                const result = listContactsSchema.safeParse({
                    limit: 150
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid limit (< 1)", () => {
                const result = listContactsSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchContactsSchema", () => {
            it("validates empty input", () => {
                const result = searchContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filter groups", () => {
                const result = searchContactsSchema.safeParse({
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: "email",
                                    operator: "CONTAINS",
                                    value: "@example.com"
                                }
                            ]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates with sorting", () => {
                const result = searchContactsSchema.safeParse({
                    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid operator", () => {
                const result = searchContactsSchema.safeParse({
                    filterGroups: [
                        {
                            filters: [{ propertyName: "email", operator: "INVALID", value: "test" }]
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid sort direction", () => {
                const result = searchContactsSchema.safeParse({
                    sorts: [{ propertyName: "createdate", direction: "INVALID" }]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchCreateContactsSchema", () => {
            it("validates with valid inputs", () => {
                const result = batchCreateContactsSchema.safeParse({
                    inputs: [
                        { properties: { email: "test1@example.com" } },
                        { properties: { email: "test2@example.com" } }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty inputs array", () => {
                const result = batchCreateContactsSchema.safeParse({
                    inputs: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects inputs exceeding 100", () => {
                const inputs = Array.from({ length: 101 }, (_, i) => ({
                    properties: { email: `test${i}@example.com` }
                }));
                const result = batchCreateContactsSchema.safeParse({ inputs });
                expect(result.success).toBe(false);
            });
        });

        describe("batchUpdateContactsSchema", () => {
            it("validates with valid inputs", () => {
                const result = batchUpdateContactsSchema.safeParse({
                    inputs: [{ id: "123", properties: { firstname: "Updated" } }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing id", () => {
                const result = batchUpdateContactsSchema.safeParse({
                    inputs: [{ properties: { firstname: "Updated" } }]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchReadContactsSchema", () => {
            it("validates with valid inputs", () => {
                const result = batchReadContactsSchema.safeParse({
                    inputs: [{ id: "123" }, { id: "456" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates with properties", () => {
                const result = batchReadContactsSchema.safeParse({
                    inputs: [{ id: "123" }],
                    properties: ["email", "firstname"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("batchUpsertContactsSchema", () => {
            it("validates with valid inputs", () => {
                const result = batchUpsertContactsSchema.safeParse({
                    inputs: [{ properties: { email: "test@example.com" }, idProperty: "email" }]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("createCompanySchema", () => {
            it("validates minimal input", () => {
                const result = createCompanySchema.safeParse({
                    properties: { name: "Acme Corp" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getCompanySchema", () => {
            it("validates with companyId", () => {
                const result = getCompanySchema.safeParse({
                    companyId: "67890"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing companyId", () => {
                const result = getCompanySchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateCompanySchema", () => {
            it("validates with companyId and properties", () => {
                const result = updateCompanySchema.safeParse({
                    companyId: "67890",
                    properties: { name: "Updated Corp" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteCompanySchema", () => {
            it("validates with companyId", () => {
                const result = deleteCompanySchema.safeParse({
                    companyId: "67890"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listCompaniesSchema", () => {
            it("validates empty input", () => {
                const result = listCompaniesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listCompaniesSchema.parse({});
                expect(result.limit).toBe(10);
            });
        });

        describe("searchCompaniesSchema", () => {
            it("validates with filter groups", () => {
                const result = searchCompaniesSchema.safeParse({
                    filterGroups: [
                        {
                            filters: [{ propertyName: "domain", operator: "EQ", value: "acme.com" }]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("createDealSchema", () => {
            it("validates minimal input", () => {
                const result = createDealSchema.safeParse({
                    properties: { dealname: "Big Deal" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getDealSchema", () => {
            it("validates with dealId", () => {
                const result = getDealSchema.safeParse({
                    dealId: "11111"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing dealId", () => {
                const result = getDealSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateDealSchema", () => {
            it("validates with dealId and properties", () => {
                const result = updateDealSchema.safeParse({
                    dealId: "11111",
                    properties: { amount: "75000" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteDealSchema", () => {
            it("validates with dealId", () => {
                const result = deleteDealSchema.safeParse({
                    dealId: "11111"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listDealsSchema", () => {
            it("validates empty input", () => {
                const result = listDealsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("searchDealsSchema", () => {
            it("validates with filter groups", () => {
                const result = searchDealsSchema.safeParse({
                    filterGroups: [
                        {
                            filters: [{ propertyName: "amount", operator: "GT", value: 10000 }]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("createAssociationSchema", () => {
            it("validates with all required fields", () => {
                const result = createAssociationSchema.safeParse({
                    fromObjectType: "contacts",
                    fromObjectId: "12345",
                    toObjectType: "companies",
                    toObjectId: "67890",
                    associationTypeId: 1
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = createAssociationSchema.safeParse({
                    fromObjectType: "contacts"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteAssociationSchema", () => {
            it("validates with all required fields", () => {
                const result = deleteAssociationSchema.safeParse({
                    fromObjectType: "contacts",
                    fromObjectId: "12345",
                    toObjectType: "companies",
                    toObjectId: "67890",
                    associationTypeId: 1
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listAssociationsSchema", () => {
            it("validates with all required fields", () => {
                const result = listAssociationsSchema.safeParse({
                    objectType: "contacts",
                    objectId: "12345",
                    toObjectType: "companies"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("batchCreateAssociationsSchema", () => {
            it("validates with all required fields", () => {
                const result = batchCreateAssociationsSchema.safeParse({
                    fromObjectType: "contacts",
                    toObjectType: "companies",
                    inputs: [{ from: { id: "123" }, to: { id: "456" }, type: "contact_to_company" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty inputs", () => {
                const result = batchCreateAssociationsSchema.safeParse({
                    fromObjectType: "contacts",
                    toObjectType: "companies",
                    inputs: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listOwnersSchema", () => {
            it("validates empty input", () => {
                const result = listOwnersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listOwnersSchema.parse({});
                expect(result.limit).toBe(10);
            });

            it("validates with archived filter", () => {
                const result = listOwnersSchema.safeParse({
                    archived: true
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getOwnerSchema", () => {
            it("validates with ownerId", () => {
                const result = getOwnerSchema.safeParse({
                    ownerId: "owner123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing ownerId", () => {
                const result = getOwnerSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createNoteSchema", () => {
            it("validates minimal input", () => {
                const result = createNoteSchema.safeParse({
                    properties: { hs_note_body: "Test note" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with associations", () => {
                const result = createNoteSchema.safeParse({
                    properties: { hs_note_body: "Test note" },
                    associations: [
                        {
                            to: { id: "123" },
                            types: [
                                { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }
                            ]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getNoteSchema", () => {
            it("validates with noteId", () => {
                const result = getNoteSchema.safeParse({
                    noteId: "note123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing noteId", () => {
                const result = getNoteSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateNoteSchema", () => {
            it("validates with noteId and properties", () => {
                const result = updateNoteSchema.safeParse({
                    noteId: "note123",
                    properties: { hs_note_body: "Updated note" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteNoteSchema", () => {
            it("validates with noteId", () => {
                const result = deleteNoteSchema.safeParse({
                    noteId: "note123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listNotesSchema", () => {
            it("validates empty input", () => {
                const result = listNotesSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("createTaskSchema", () => {
            it("validates minimal input", () => {
                const result = createTaskSchema.safeParse({
                    properties: { hs_task_subject: "Follow up" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with associations", () => {
                const result = createTaskSchema.safeParse({
                    properties: { hs_task_subject: "Follow up" },
                    associations: [
                        {
                            to: { id: "123" },
                            types: [
                                { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }
                            ]
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getTaskSchema", () => {
            it("validates with taskId", () => {
                const result = getTaskSchema.safeParse({
                    taskId: "task123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing taskId", () => {
                const result = getTaskSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateTaskSchema", () => {
            it("validates with taskId and properties", () => {
                const result = updateTaskSchema.safeParse({
                    taskId: "task123",
                    properties: { hs_task_subject: "Updated task" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteTaskSchema", () => {
            it("validates with taskId", () => {
                const result = deleteTaskSchema.safeParse({
                    taskId: "task123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listTasksSchema", () => {
            it("validates empty input", () => {
                const result = listTasksSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });
    });
});
