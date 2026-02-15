/**
 * Pipedrive Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Deal operations
import {
    executeCreateActivity,
    createActivitySchema,
    executeGetActivity,
    getActivitySchema,
    executeUpdateActivity,
    updateActivitySchema,
    executeDeleteActivity,
    deleteActivitySchema,
    executeListActivities,
    listActivitiesSchema
} from "../operations/activities";
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

// Person operations
import {
    executeCreateLead,
    createLeadSchema,
    executeGetLead,
    getLeadSchema,
    executeUpdateLead,
    updateLeadSchema,
    executeDeleteLead,
    deleteLeadSchema,
    executeListLeads,
    listLeadsSchema
} from "../operations/leads";
import {
    executeCreateOrganization,
    createOrganizationSchema,
    executeGetOrganization,
    getOrganizationSchema,
    executeUpdateOrganization,
    updateOrganizationSchema,
    executeDeleteOrganization,
    deleteOrganizationSchema,
    executeListOrganizations,
    listOrganizationsSchema,
    executeSearchOrganizations,
    searchOrganizationsSchema
} from "../operations/organizations";
import {
    executeCreatePerson,
    createPersonSchema,
    executeGetPerson,
    getPersonSchema,
    executeUpdatePerson,
    updatePersonSchema,
    executeDeletePerson,
    deletePersonSchema,
    executeListPersons,
    listPersonsSchema,
    executeSearchPersons,
    searchPersonsSchema
} from "../operations/persons";

// Organization operations

// Lead operations

// Activity operations

import type { PipedriveClient } from "../client/PipedriveClient";
import type {
    PipedriveResponse,
    PipedriveListResponse,
    PipedriveSearchResult,
    PipedriveDeal,
    PipedrivePerson,
    PipedriveOrganization,
    PipedriveLead,
    PipedriveActivity
} from "../operations/types";

// Mock PipedriveClient factory
function createMockPipedriveClient(): jest.Mocked<PipedriveClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<PipedriveClient>;
}

// Sample fixtures
const sampleDeal: PipedriveDeal = {
    id: 12345,
    title: "Acme Corp - Enterprise License",
    value: 50000,
    currency: "USD",
    status: "open",
    stage_id: 3,
    pipeline_id: 1,
    person_id: 67890,
    org_id: 11111,
    user_id: 1001,
    expected_close_date: "2024-03-15",
    won_time: null,
    lost_time: null,
    lost_reason: null,
    visible_to: "3",
    add_time: "2024-01-15T10:00:00.000Z",
    update_time: "2024-02-10T14:30:00.000Z",
    close_time: null
};

const samplePerson: PipedrivePerson = {
    id: 67890,
    name: "Sarah Johnson",
    first_name: "Sarah",
    last_name: "Johnson",
    email: [{ value: "sarah.johnson@acme.com", label: "work", primary: true }],
    phone: [{ value: "+1-555-1234", label: "work", primary: true }],
    org_id: 11111,
    owner_id: 1001,
    visible_to: "3",
    add_time: "2024-01-12T10:00:00.000Z",
    update_time: "2024-02-08T15:30:00.000Z",
    active_flag: true
};

const sampleOrganization: PipedriveOrganization = {
    id: 11111,
    name: "Acme Corporation",
    owner_id: 1001,
    address: "500 Enterprise Blvd, Suite 100, New York, NY 10001",
    address_country: "United States",
    cc_email: "acme-corp@pipedrivemail.com",
    visible_to: "3",
    add_time: "2024-01-10T09:00:00.000Z",
    update_time: "2024-02-05T14:30:00.000Z",
    active_flag: true
};

const sampleLead: PipedriveLead = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Inbound - Website Contact Form",
    owner_id: 1001,
    person_id: 67894,
    organization_id: 11115,
    expected_close_date: "2024-03-31",
    value: { amount: 25000, currency: "USD" },
    label_ids: ["11111111-2222-3333-4444-555555555555"],
    is_archived: false,
    add_time: "2024-02-10T15:00:00.000Z",
    update_time: "2024-02-11T09:30:00.000Z"
};

const sampleActivity: PipedriveActivity = {
    id: 98765,
    type: "call",
    subject: "Follow-up call with Sarah",
    done: false,
    due_date: "2024-02-15",
    due_time: "10:30:00",
    duration: "00:30:00",
    user_id: 1001,
    person_id: 67890,
    org_id: null,
    deal_id: 12345,
    lead_id: null,
    note: "Discuss pricing options and contract terms",
    location: null,
    public_description: null,
    busy_flag: false,
    add_time: "2024-02-10T14:30:00.000Z",
    update_time: null,
    marked_as_done_time: null
};

describe("Pipedrive Operation Executors", () => {
    let mockClient: jest.Mocked<PipedriveClient>;

    beforeEach(() => {
        mockClient = createMockPipedriveClient();
    });

    // ==================== DEAL OPERATIONS ====================
    describe("Deal Operations", () => {
        describe("executeCreateDeal", () => {
            it("calls client with correct params", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleDeal
                } as PipedriveResponse<PipedriveDeal>);

                await executeCreateDeal(mockClient, {
                    title: "Acme Corp - Enterprise License",
                    value: 50000,
                    currency: "USD"
                });

                expect(mockClient.post).toHaveBeenCalledWith("/deals", {
                    title: "Acme Corp - Enterprise License",
                    value: 50000,
                    currency: "USD"
                });
            });

            it("returns normalized output on success", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleDeal
                } as PipedriveResponse<PipedriveDeal>);

                const result = await executeCreateDeal(mockClient, {
                    title: "Acme Corp - Enterprise License"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(sampleDeal);
            });

            it("returns error when API fails to create deal", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveDeal>);

                const result = await executeCreateDeal(mockClient, {
                    title: "Test Deal"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to create deal");
            });

            it("returns error on client exception", async () => {
                mockClient.post.mockRejectedValueOnce(new Error("Network error"));

                const result = await executeCreateDeal(mockClient, {
                    title: "Test Deal"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Network error");
            });
        });

        describe("executeGetDeal", () => {
            it("calls client with correct params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: sampleDeal
                } as PipedriveResponse<PipedriveDeal>);

                await executeGetDeal(mockClient, { id: 12345 });

                expect(mockClient.get).toHaveBeenCalledWith("/deals/12345");
            });

            it("returns normalized output on success", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: sampleDeal
                } as PipedriveResponse<PipedriveDeal>);

                const result = await executeGetDeal(mockClient, { id: 12345 });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(sampleDeal);
            });

            it("returns not_found error when deal does not exist", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveDeal>);

                const result = await executeGetDeal(mockClient, { id: 99999999 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("not_found");
                expect(result.error?.message).toBe("Deal with ID 99999999 not found");
            });

            it("returns error on client exception", async () => {
                mockClient.get.mockRejectedValueOnce(new Error("Server error"));

                const result = await executeGetDeal(mockClient, { id: 12345 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.retryable).toBe(true);
            });
        });

        describe("executeUpdateDeal", () => {
            it("calls client with id in URL and data in body", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: true,
                    data: { ...sampleDeal, value: 55000 }
                } as PipedriveResponse<PipedriveDeal>);

                await executeUpdateDeal(mockClient, {
                    id: 12345,
                    value: 55000,
                    probability: 75
                });

                expect(mockClient.put).toHaveBeenCalledWith("/deals/12345", {
                    value: 55000,
                    probability: 75
                });
            });

            it("returns normalized output on success", async () => {
                const updatedDeal = { ...sampleDeal, value: 55000 };
                mockClient.put.mockResolvedValueOnce({
                    success: true,
                    data: updatedDeal
                } as PipedriveResponse<PipedriveDeal>);

                const result = await executeUpdateDeal(mockClient, {
                    id: 12345,
                    value: 55000
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(updatedDeal);
            });

            it("returns error when API fails", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveDeal>);

                const result = await executeUpdateDeal(mockClient, {
                    id: 12345,
                    value: 55000
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to update deal");
            });
        });

        describe("executeDeleteDeal", () => {
            it("calls client with correct URL", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: 12345 }
                } as PipedriveResponse<{ id: number }>);

                await executeDeleteDeal(mockClient, { id: 12345 });

                expect(mockClient.delete).toHaveBeenCalledWith("/deals/12345");
            });

            it("returns normalized output on success", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: 12345 }
                } as PipedriveResponse<{ id: number }>);

                const result = await executeDeleteDeal(mockClient, { id: 12345 });

                expect(result.success).toBe(true);
                expect(result.data).toEqual({ deleted: true, id: 12345 });
            });

            it("returns error when API fails", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: false
                } as PipedriveResponse<{ id: number }>);

                const result = await executeDeleteDeal(mockClient, { id: 12345 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
            });
        });

        describe("executeListDeals", () => {
            it("calls client with default params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleDeal],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveDeal>);

                await executeListDeals(mockClient, { start: 0, limit: 50 });

                expect(mockClient.get).toHaveBeenCalledWith("/deals", {
                    start: 0,
                    limit: 50
                });
            });

            it("calls client with filter params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleDeal],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveDeal>);

                await executeListDeals(mockClient, {
                    start: 0,
                    limit: 50,
                    status: "open",
                    user_id: 1001,
                    stage_id: 3,
                    sort: "add_time DESC"
                });

                expect(mockClient.get).toHaveBeenCalledWith("/deals", {
                    start: 0,
                    limit: 50,
                    status: "open",
                    user_id: 1001,
                    stage_id: 3,
                    sort: "add_time DESC"
                });
            });

            it("returns normalized output with pagination", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleDeal],
                    additional_data: {
                        pagination: {
                            start: 0,
                            limit: 50,
                            more_items_in_collection: true,
                            next_start: 50
                        }
                    }
                } as PipedriveListResponse<PipedriveDeal>);

                const result = await executeListDeals(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(true);
                expect(result.data?.deals).toHaveLength(1);
                expect(result.data?.pagination?.more_items_in_collection).toBe(true);
                expect(result.data?.pagination?.next_start).toBe(50);
            });

            it("handles empty results", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: null,
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveDeal>);

                const result = await executeListDeals(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(true);
                expect(result.data?.deals).toEqual([]);
            });

            it("returns error on client exception", async () => {
                mockClient.get.mockRejectedValueOnce(new Error("Rate limit exceeded"));

                const result = await executeListDeals(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.retryable).toBe(true);
            });
        });

        describe("executeSearchDeals", () => {
            it("calls client with search params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: sampleDeal, result_score: 1.0 }]
                    },
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveSearchResult<PipedriveDeal>);

                await executeSearchDeals(mockClient, {
                    term: "Enterprise",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(mockClient.get).toHaveBeenCalledWith("/deals/search", {
                    term: "Enterprise",
                    item_types: "deal",
                    start: 0,
                    limit: 50
                });
            });

            it("calls client with optional filters", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: sampleDeal, result_score: 1.0 }]
                    }
                } as PipedriveSearchResult<PipedriveDeal>);

                await executeSearchDeals(mockClient, {
                    term: "Enterprise",
                    start: 0,
                    limit: 50,
                    exact_match: true,
                    status: "open",
                    person_id: 67890,
                    org_id: 11111
                });

                expect(mockClient.get).toHaveBeenCalledWith("/deals/search", {
                    term: "Enterprise",
                    item_types: "deal",
                    start: 0,
                    limit: 50,
                    exact_match: true,
                    status: "open",
                    person_id: 67890,
                    org_id: 11111
                });
            });

            it("extracts items from search result", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [
                            { item: sampleDeal, result_score: 1.0 },
                            { item: { ...sampleDeal, id: 12346 }, result_score: 0.8 }
                        ]
                    }
                } as PipedriveSearchResult<PipedriveDeal>);

                const result = await executeSearchDeals(mockClient, {
                    term: "Enterprise",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(result.success).toBe(true);
                expect(result.data?.deals).toHaveLength(2);
            });

            it("handles empty search results", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: null
                } as PipedriveSearchResult<PipedriveDeal>);

                const result = await executeSearchDeals(mockClient, {
                    term: "NonexistentTerm",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(result.success).toBe(true);
                expect(result.data?.deals).toEqual([]);
            });
        });
    });

    // ==================== PERSON OPERATIONS ====================
    describe("Person Operations", () => {
        describe("executeCreatePerson", () => {
            it("calls client with correct params", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: samplePerson
                } as PipedriveResponse<PipedrivePerson>);

                await executeCreatePerson(mockClient, {
                    name: "Sarah Johnson",
                    email: [{ value: "sarah.johnson@acme.com", label: "work", primary: true }],
                    org_id: 11111
                });

                expect(mockClient.post).toHaveBeenCalledWith("/persons", {
                    name: "Sarah Johnson",
                    email: [{ value: "sarah.johnson@acme.com", label: "work", primary: true }],
                    org_id: 11111
                });
            });

            it("returns normalized output on success", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: samplePerson
                } as PipedriveResponse<PipedrivePerson>);

                const result = await executeCreatePerson(mockClient, {
                    name: "Sarah Johnson"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(samplePerson);
            });

            it("returns error when API fails", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedrivePerson>);

                const result = await executeCreatePerson(mockClient, {
                    name: "Test Person"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to create contact");
            });
        });

        describe("executeGetPerson", () => {
            it("calls client with correct params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: samplePerson
                } as PipedriveResponse<PipedrivePerson>);

                await executeGetPerson(mockClient, { id: 67890 });

                expect(mockClient.get).toHaveBeenCalledWith("/persons/67890");
            });

            it("returns not_found error when person does not exist", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedrivePerson>);

                const result = await executeGetPerson(mockClient, { id: 99999999 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("not_found");
                expect(result.error?.message).toBe("Contact with ID 99999999 not found");
            });
        });

        describe("executeUpdatePerson", () => {
            it("calls client with id in URL and data in body", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: true,
                    data: { ...samplePerson, name: "Sarah J. Johnson" }
                } as PipedriveResponse<PipedrivePerson>);

                await executeUpdatePerson(mockClient, {
                    id: 67890,
                    name: "Sarah J. Johnson"
                });

                expect(mockClient.put).toHaveBeenCalledWith("/persons/67890", {
                    name: "Sarah J. Johnson"
                });
            });

            it("returns error when API fails", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedrivePerson>);

                const result = await executeUpdatePerson(mockClient, {
                    id: 67890,
                    name: "Updated Name"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to update contact");
            });
        });

        describe("executeDeletePerson", () => {
            it("returns normalized output on success", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: 67890 }
                } as PipedriveResponse<{ id: number }>);

                const result = await executeDeletePerson(mockClient, { id: 67890 });

                expect(result.success).toBe(true);
                expect(result.data).toEqual({ deleted: true, id: 67890 });
            });
        });

        describe("executeListPersons", () => {
            it("calls client with filter params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [samplePerson],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedrivePerson>);

                await executeListPersons(mockClient, {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    org_id: 11111,
                    filter_id: 5,
                    sort: "name ASC"
                });

                expect(mockClient.get).toHaveBeenCalledWith("/persons", {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    org_id: 11111,
                    filter_id: 5,
                    sort: "name ASC"
                });
            });

            it("returns normalized output with pagination", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [samplePerson],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedrivePerson>);

                const result = await executeListPersons(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(true);
                expect(result.data?.persons).toHaveLength(1);
            });
        });

        describe("executeSearchPersons", () => {
            it("calls client with search params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: samplePerson, result_score: 1.0 }]
                    }
                } as PipedriveSearchResult<PipedrivePerson>);

                await executeSearchPersons(mockClient, {
                    term: "Johnson",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(mockClient.get).toHaveBeenCalledWith("/persons/search", {
                    term: "Johnson",
                    item_types: "person",
                    start: 0,
                    limit: 50
                });
            });

            it("extracts items from search result", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: samplePerson, result_score: 1.0 }]
                    }
                } as PipedriveSearchResult<PipedrivePerson>);

                const result = await executeSearchPersons(mockClient, {
                    term: "Johnson",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(result.success).toBe(true);
                expect(result.data?.persons).toHaveLength(1);
            });
        });
    });

    // ==================== ORGANIZATION OPERATIONS ====================
    describe("Organization Operations", () => {
        describe("executeCreateOrganization", () => {
            it("calls client with correct params", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleOrganization
                } as PipedriveResponse<PipedriveOrganization>);

                await executeCreateOrganization(mockClient, {
                    name: "Acme Corporation",
                    address: "500 Enterprise Blvd"
                });

                expect(mockClient.post).toHaveBeenCalledWith("/organizations", {
                    name: "Acme Corporation",
                    address: "500 Enterprise Blvd"
                });
            });

            it("returns normalized output on success", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleOrganization
                } as PipedriveResponse<PipedriveOrganization>);

                const result = await executeCreateOrganization(mockClient, {
                    name: "Acme Corporation"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(sampleOrganization);
            });

            it("returns error when API fails", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveOrganization>);

                const result = await executeCreateOrganization(mockClient, {
                    name: "Test Org"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to create organization");
            });
        });

        describe("executeGetOrganization", () => {
            it("returns not_found error when organization does not exist", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveOrganization>);

                const result = await executeGetOrganization(mockClient, { id: 99999999 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("not_found");
                expect(result.error?.message).toBe("Organization with ID 99999999 not found");
            });
        });

        describe("executeUpdateOrganization", () => {
            it("calls client with id in URL and data in body", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: true,
                    data: { ...sampleOrganization, address: "New Address" }
                } as PipedriveResponse<PipedriveOrganization>);

                await executeUpdateOrganization(mockClient, {
                    id: 11111,
                    address: "New Address"
                });

                expect(mockClient.put).toHaveBeenCalledWith("/organizations/11111", {
                    address: "New Address"
                });
            });
        });

        describe("executeDeleteOrganization", () => {
            it("returns normalized output on success", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: 11111 }
                } as PipedriveResponse<{ id: number }>);

                const result = await executeDeleteOrganization(mockClient, { id: 11111 });

                expect(result.success).toBe(true);
                expect(result.data).toEqual({ deleted: true, id: 11111 });
            });
        });

        describe("executeListOrganizations", () => {
            it("calls client with filter params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleOrganization],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveOrganization>);

                await executeListOrganizations(mockClient, {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    filter_id: 5,
                    sort: "name ASC"
                });

                expect(mockClient.get).toHaveBeenCalledWith("/organizations", {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    filter_id: 5,
                    sort: "name ASC"
                });
            });

            it("returns normalized output with pagination", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleOrganization],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveOrganization>);

                const result = await executeListOrganizations(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(true);
                expect(result.data?.organizations).toHaveLength(1);
            });
        });

        describe("executeSearchOrganizations", () => {
            it("calls client with search params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: sampleOrganization, result_score: 1.0 }]
                    }
                } as PipedriveSearchResult<PipedriveOrganization>);

                await executeSearchOrganizations(mockClient, {
                    term: "Tech",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(mockClient.get).toHaveBeenCalledWith("/organizations/search", {
                    term: "Tech",
                    item_types: "organization",
                    start: 0,
                    limit: 50
                });
            });

            it("extracts items from search result", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: {
                        items: [{ item: sampleOrganization, result_score: 1.0 }]
                    }
                } as PipedriveSearchResult<PipedriveOrganization>);

                const result = await executeSearchOrganizations(mockClient, {
                    term: "Tech",
                    start: 0,
                    limit: 50,
                    exact_match: false
                });

                expect(result.success).toBe(true);
                expect(result.data?.organizations).toHaveLength(1);
            });
        });
    });

    // ==================== LEAD OPERATIONS ====================
    describe("Lead Operations", () => {
        describe("executeCreateLead", () => {
            it("calls client with correct params", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleLead
                } as PipedriveResponse<PipedriveLead>);

                await executeCreateLead(mockClient, {
                    title: "Inbound - Website Contact Form",
                    value: { amount: 25000, currency: "USD" }
                });

                expect(mockClient.post).toHaveBeenCalledWith("/leads", {
                    title: "Inbound - Website Contact Form",
                    value: { amount: 25000, currency: "USD" }
                });
            });

            it("returns normalized output on success", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleLead
                } as PipedriveResponse<PipedriveLead>);

                const result = await executeCreateLead(mockClient, {
                    title: "Inbound - Website Contact Form"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(sampleLead);
            });

            it("returns error when API fails", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveLead>);

                const result = await executeCreateLead(mockClient, {
                    title: "Test Lead"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to create lead");
            });
        });

        describe("executeGetLead", () => {
            it("calls client with UUID", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: sampleLead
                } as PipedriveResponse<PipedriveLead>);

                await executeGetLead(mockClient, { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });

                expect(mockClient.get).toHaveBeenCalledWith(
                    "/leads/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                );
            });

            it("returns not_found error when lead does not exist", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveLead>);

                const result = await executeGetLead(mockClient, {
                    id: "00000000-0000-0000-0000-000000000000"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("not_found");
                expect(result.error?.message).toBe(
                    "Lead with ID 00000000-0000-0000-0000-000000000000 not found"
                );
            });
        });

        describe("executeUpdateLead", () => {
            it("calls client with PATCH method", async () => {
                mockClient.patch.mockResolvedValueOnce({
                    success: true,
                    data: { ...sampleLead, title: "Updated Title" }
                } as PipedriveResponse<PipedriveLead>);

                await executeUpdateLead(mockClient, {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Updated Title"
                });

                expect(mockClient.patch).toHaveBeenCalledWith(
                    "/leads/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    { title: "Updated Title" }
                );
            });

            it("returns error when API fails", async () => {
                mockClient.patch.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveLead>);

                const result = await executeUpdateLead(mockClient, {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    title: "Updated"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to update lead");
            });
        });

        describe("executeDeleteLead", () => {
            it("returns normalized output on success", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
                } as PipedriveResponse<{ id: string }>);

                const result = await executeDeleteLead(mockClient, {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual({
                    deleted: true,
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                });
            });
        });

        describe("executeListLeads", () => {
            it("calls client with filter params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleLead],
                    additional_data: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                });

                await executeListLeads(mockClient, {
                    start: 0,
                    limit: 50,
                    archived_status: "not_archived",
                    owner_id: 1001,
                    sort: "add_time DESC"
                });

                expect(mockClient.get).toHaveBeenCalledWith("/leads", {
                    start: 0,
                    limit: 50,
                    archived_status: "not_archived",
                    owner_id: 1001,
                    sort: "add_time DESC"
                });
            });

            it("returns normalized output with pagination", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleLead],
                    additional_data: {
                        start: 0,
                        limit: 50,
                        more_items_in_collection: false
                    }
                });

                const result = await executeListLeads(mockClient, {
                    start: 0,
                    limit: 50,
                    archived_status: "not_archived"
                });

                expect(result.success).toBe(true);
                expect(result.data?.leads).toHaveLength(1);
            });
        });
    });

    // ==================== ACTIVITY OPERATIONS ====================
    describe("Activity Operations", () => {
        describe("executeCreateActivity", () => {
            it("calls client with correct params", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleActivity
                } as PipedriveResponse<PipedriveActivity>);

                await executeCreateActivity(mockClient, {
                    subject: "Follow-up call with Sarah",
                    type: "call",
                    due_date: "2024-02-15",
                    deal_id: 12345
                });

                expect(mockClient.post).toHaveBeenCalledWith("/activities", {
                    subject: "Follow-up call with Sarah",
                    type: "call",
                    due_date: "2024-02-15",
                    deal_id: 12345
                });
            });

            it("returns normalized output on success", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: true,
                    data: sampleActivity
                } as PipedriveResponse<PipedriveActivity>);

                const result = await executeCreateActivity(mockClient, {
                    subject: "Follow-up call",
                    type: "call"
                });

                expect(result.success).toBe(true);
                expect(result.data).toEqual(sampleActivity);
            });

            it("returns error when API fails", async () => {
                mockClient.post.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveActivity>);

                const result = await executeCreateActivity(mockClient, {
                    subject: "Test Activity",
                    type: "call"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to create activity");
            });
        });

        describe("executeGetActivity", () => {
            it("calls client with correct params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: sampleActivity
                } as PipedriveResponse<PipedriveActivity>);

                await executeGetActivity(mockClient, { id: 98765 });

                expect(mockClient.get).toHaveBeenCalledWith("/activities/98765");
            });

            it("returns not_found error when activity does not exist", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveActivity>);

                const result = await executeGetActivity(mockClient, { id: 99999999 });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("not_found");
                expect(result.error?.message).toBe("Activity with ID 99999999 not found");
            });
        });

        describe("executeUpdateActivity", () => {
            it("calls client with id in URL and data in body", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: true,
                    data: { ...sampleActivity, done: true }
                } as PipedriveResponse<PipedriveActivity>);

                await executeUpdateActivity(mockClient, {
                    id: 98765,
                    done: "1"
                });

                expect(mockClient.put).toHaveBeenCalledWith("/activities/98765", {
                    done: "1"
                });
            });

            it("returns error when API fails", async () => {
                mockClient.put.mockResolvedValueOnce({
                    success: false,
                    data: null
                } as unknown as PipedriveResponse<PipedriveActivity>);

                const result = await executeUpdateActivity(mockClient, {
                    id: 98765,
                    done: "1"
                });

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("server_error");
                expect(result.error?.message).toBe("Failed to update activity");
            });
        });

        describe("executeDeleteActivity", () => {
            it("returns normalized output on success", async () => {
                mockClient.delete.mockResolvedValueOnce({
                    success: true,
                    data: { id: 98765 }
                } as PipedriveResponse<{ id: number }>);

                const result = await executeDeleteActivity(mockClient, { id: 98765 });

                expect(result.success).toBe(true);
                expect(result.data).toEqual({ deleted: true, id: 98765 });
            });
        });

        describe("executeListActivities", () => {
            it("calls client with filter params", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleActivity],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveActivity>);

                await executeListActivities(mockClient, {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    type: "call",
                    done: "0",
                    start_date: "2024-02-01",
                    end_date: "2024-02-28"
                });

                expect(mockClient.get).toHaveBeenCalledWith("/activities", {
                    start: 0,
                    limit: 50,
                    user_id: 1001,
                    type: "call",
                    done: "0",
                    start_date: "2024-02-01",
                    end_date: "2024-02-28"
                });
            });

            it("returns normalized output with pagination", async () => {
                mockClient.get.mockResolvedValueOnce({
                    success: true,
                    data: [sampleActivity],
                    additional_data: {
                        pagination: { start: 0, limit: 50, more_items_in_collection: false }
                    }
                } as PipedriveListResponse<PipedriveActivity>);

                const result = await executeListActivities(mockClient, { start: 0, limit: 50 });

                expect(result.success).toBe(true);
                expect(result.data?.activities).toHaveLength(1);
            });
        });
    });

    // ==================== SCHEMA VALIDATION ====================
    describe("Schema Validation", () => {
        describe("Deal Schemas", () => {
            describe("createDealSchema", () => {
                it("validates minimal input", () => {
                    const result = createDealSchema.safeParse({
                        title: "Test Deal"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates full input", () => {
                    const result = createDealSchema.safeParse({
                        title: "Enterprise Deal",
                        value: 50000,
                        currency: "USD",
                        person_id: 123,
                        org_id: 456,
                        stage_id: 1,
                        status: "open",
                        expected_close_date: "2024-03-15",
                        probability: 75,
                        visible_to: "3"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects missing title", () => {
                    const result = createDealSchema.safeParse({
                        value: 50000
                    });
                    expect(result.success).toBe(false);
                });

                it("rejects invalid currency code length", () => {
                    const result = createDealSchema.safeParse({
                        title: "Test",
                        currency: "US"
                    });
                    expect(result.success).toBe(false);
                });

                it("rejects invalid probability", () => {
                    const result = createDealSchema.safeParse({
                        title: "Test",
                        probability: 150
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getDealSchema", () => {
                it("validates id", () => {
                    const result = getDealSchema.safeParse({ id: 12345 });
                    expect(result.success).toBe(true);
                });

                it("rejects non-integer id", () => {
                    const result = getDealSchema.safeParse({ id: 123.45 });
                    expect(result.success).toBe(false);
                });
            });

            describe("updateDealSchema", () => {
                it("validates with just id", () => {
                    const result = updateDealSchema.safeParse({ id: 12345 });
                    expect(result.success).toBe(true);
                });

                it("validates with optional fields", () => {
                    const result = updateDealSchema.safeParse({
                        id: 12345,
                        title: "Updated",
                        value: 60000,
                        status: "won"
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("deleteDealSchema", () => {
                it("validates id", () => {
                    const result = deleteDealSchema.safeParse({ id: 12345 });
                    expect(result.success).toBe(true);
                });
            });

            describe("listDealsSchema", () => {
                it("validates empty input (uses defaults)", () => {
                    const result = listDealsSchema.safeParse({});
                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.start).toBe(0);
                        expect(result.data.limit).toBe(50);
                    }
                });

                it("validates with filters", () => {
                    const result = listDealsSchema.safeParse({
                        status: "open",
                        user_id: 1001,
                        stage_id: 3,
                        sort: "add_time DESC"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects limit over 500", () => {
                    const result = listDealsSchema.safeParse({
                        limit: 1000
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("searchDealsSchema", () => {
                it("validates minimal input", () => {
                    const result = searchDealsSchema.safeParse({
                        term: "Enterprise"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects empty search term", () => {
                    const result = searchDealsSchema.safeParse({
                        term: ""
                    });
                    expect(result.success).toBe(false);
                });
            });
        });

        describe("Person Schemas", () => {
            describe("createPersonSchema", () => {
                it("validates minimal input", () => {
                    const result = createPersonSchema.safeParse({
                        name: "John Smith"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with email and phone", () => {
                    const result = createPersonSchema.safeParse({
                        name: "John Smith",
                        email: [{ value: "john@example.com", label: "work", primary: true }],
                        phone: [{ value: "+1-555-1234", label: "work", primary: true }]
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid email format", () => {
                    const result = createPersonSchema.safeParse({
                        name: "John Smith",
                        email: [{ value: "not-an-email", label: "work", primary: true }]
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("listPersonsSchema", () => {
                it("validates with filters", () => {
                    const result = listPersonsSchema.safeParse({
                        user_id: 1001,
                        org_id: 11111,
                        filter_id: 5
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("searchPersonsSchema", () => {
                it("validates with field filter", () => {
                    const result = searchPersonsSchema.safeParse({
                        term: "Johnson",
                        fields: "email"
                    });
                    expect(result.success).toBe(true);
                });
            });
        });

        describe("Organization Schemas", () => {
            describe("createOrganizationSchema", () => {
                it("validates minimal input", () => {
                    const result = createOrganizationSchema.safeParse({
                        name: "Acme Corp"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with all fields", () => {
                    const result = createOrganizationSchema.safeParse({
                        name: "Acme Corp",
                        owner_id: 1001,
                        address: "123 Main St",
                        visible_to: "5"
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("searchOrganizationsSchema", () => {
                it("validates with exact match", () => {
                    const result = searchOrganizationsSchema.safeParse({
                        term: "Acme",
                        exact_match: true
                    });
                    expect(result.success).toBe(true);
                });
            });
        });

        describe("Lead Schemas", () => {
            describe("createLeadSchema", () => {
                it("validates minimal input", () => {
                    const result = createLeadSchema.safeParse({
                        title: "New Lead"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with value object", () => {
                    const result = createLeadSchema.safeParse({
                        title: "New Lead",
                        value: { amount: 10000, currency: "USD" }
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid currency in value", () => {
                    const result = createLeadSchema.safeParse({
                        title: "New Lead",
                        value: { amount: 10000, currency: "INVALID" }
                    });
                    expect(result.success).toBe(false);
                });

                it("validates label_ids as UUIDs", () => {
                    const result = createLeadSchema.safeParse({
                        title: "New Lead",
                        label_ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid UUID in label_ids", () => {
                    const result = createLeadSchema.safeParse({
                        title: "New Lead",
                        label_ids: ["not-a-uuid"]
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getLeadSchema", () => {
                it("validates UUID", () => {
                    const result = getLeadSchema.safeParse({
                        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects non-UUID", () => {
                    const result = getLeadSchema.safeParse({
                        id: "12345"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("updateLeadSchema", () => {
                it("validates nullable fields", () => {
                    const result = updateLeadSchema.safeParse({
                        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        person_id: null,
                        value: null
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("listLeadsSchema", () => {
                it("validates archived_status enum", () => {
                    const result = listLeadsSchema.safeParse({
                        archived_status: "archived"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates sort enum", () => {
                    const result = listLeadsSchema.safeParse({
                        sort: "add_time DESC"
                    });
                    expect(result.success).toBe(true);
                });
            });
        });

        describe("Activity Schemas", () => {
            describe("createActivitySchema", () => {
                it("validates minimal input", () => {
                    const result = createActivitySchema.safeParse({
                        subject: "Call with client",
                        type: "call"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with all optional fields", () => {
                    const result = createActivitySchema.safeParse({
                        subject: "Call with client",
                        type: "call",
                        done: "0",
                        due_date: "2024-02-15",
                        due_time: "10:30",
                        duration: "00:30",
                        user_id: 1001,
                        deal_id: 12345,
                        person_id: 67890,
                        org_id: 11111,
                        lead_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        note: "Important call",
                        location: "Conference Room",
                        busy_flag: true
                    });
                    expect(result.success).toBe(true);
                });

                it("validates done as enum", () => {
                    const result = createActivitySchema.safeParse({
                        subject: "Task",
                        type: "task",
                        done: "1"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid done value", () => {
                    const result = createActivitySchema.safeParse({
                        subject: "Task",
                        type: "task",
                        done: "2"
                    });
                    expect(result.success).toBe(false);
                });

                it("validates lead_id as UUID", () => {
                    const result = createActivitySchema.safeParse({
                        subject: "Task",
                        type: "task",
                        lead_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("listActivitiesSchema", () => {
                it("validates date filters", () => {
                    const result = listActivitiesSchema.safeParse({
                        start_date: "2024-02-01",
                        end_date: "2024-02-28"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates done filter", () => {
                    const result = listActivitiesSchema.safeParse({
                        done: "0"
                    });
                    expect(result.success).toBe(true);
                });
            });
        });
    });
});
