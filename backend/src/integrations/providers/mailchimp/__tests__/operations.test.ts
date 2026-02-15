/**
 * Mailchimp Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Member operations
import { executeAddMember, addMemberSchema } from "../operations/addMember";
import { executeAddTagsToMember, addTagsToMemberSchema } from "../operations/addTagsToMember";
import { executeArchiveMember, archiveMemberSchema } from "../operations/archiveMember";
import { executeCreateCampaign, createCampaignSchema } from "../operations/createCampaign";
import { executeCreateList, createListSchema } from "../operations/createList";
import {
    executeDeleteMemberPermanently,
    deleteMemberPermanentlySchema
} from "../operations/deleteMemberPermanently";
import { executeGetCampaign, getCampaignSchema } from "../operations/getCampaign";
import { executeGetCampaigns, getCampaignsSchema } from "../operations/getCampaigns";
import { executeGetList, getListSchema } from "../operations/getList";
import { executeGetLists, getListsSchema } from "../operations/getLists";
import { executeGetMember, getMemberSchema } from "../operations/getMember";
import { executeGetMembers, getMembersSchema } from "../operations/getMembers";

// Tag operations
import {
    executeRemoveTagsFromMember,
    removeTagsFromMemberSchema
} from "../operations/removeTagsFromMember";
import { executeGetTags, getTagsSchema } from "../operations/getTags";

// List operations
import { executeUpdateList, updateListSchema } from "../operations/updateList";

// Segment operations
import { executeGetSegments, getSegmentsSchema } from "../operations/getSegments";
import { executeGetSegmentMembers, getSegmentMembersSchema } from "../operations/getSegmentMembers";

// Campaign operations
import { executeUpdateCampaign, updateCampaignSchema } from "../operations/updateCampaign";
import { executeSendCampaign, sendCampaignSchema } from "../operations/sendCampaign";
import { executeScheduleCampaign, scheduleCampaignSchema } from "../operations/scheduleCampaign";
import {
    executeUnscheduleCampaign,
    unscheduleCampaignSchema
} from "../operations/unscheduleCampaign";

// Template operations
import { executeGetTemplates, getTemplatesSchema } from "../operations/getTemplates";
import { executeGetTemplate, getTemplateSchema } from "../operations/getTemplate";
import { executeUpdateMember, updateMemberSchema } from "../operations/updateMember";

import type { MailchimpClient, MailchimpMember, MailchimpList } from "../client/MailchimpClient";
import type {
    MailchimpMemberOutput,
    MailchimpListOutput,
    MailchimpTagOutput,
    MailchimpSegmentOutput,
    MailchimpCampaignOutput,
    MailchimpTemplateOutput
} from "../operations/types";

// Result data interfaces for type-safe assertions
interface MembersResultData {
    members: MailchimpMemberOutput[];
    totalItems: number;
    hasMore: boolean;
}

interface TagsResultData {
    tags: MailchimpTagOutput[];
    totalItems: number;
    hasMore: boolean;
}

interface ListsResultData {
    lists: MailchimpListOutput[];
    totalItems: number;
    hasMore: boolean;
}

interface SegmentsResultData {
    segments: MailchimpSegmentOutput[];
    totalItems: number;
    hasMore: boolean;
}

interface CampaignsResultData {
    campaigns: MailchimpCampaignOutput[];
    totalItems: number;
    hasMore: boolean;
}

interface TemplatesResultData {
    templates: MailchimpTemplateOutput[];
    totalItems: number;
    hasMore: boolean;
}

// Mock MailchimpClient factory
function createMockMailchimpClient(): jest.Mocked<MailchimpClient> {
    return {
        // List operations
        getLists: jest.fn(),
        getList: jest.fn(),
        createList: jest.fn(),
        updateList: jest.fn(),

        // Member operations
        getMembers: jest.fn(),
        getMember: jest.fn(),
        addMember: jest.fn(),
        updateMember: jest.fn(),
        archiveMember: jest.fn(),
        deleteMemberPermanently: jest.fn(),

        // Tag operations
        getTags: jest.fn(),
        addTagsToMember: jest.fn(),
        removeTagsFromMember: jest.fn(),

        // Segment operations
        getSegments: jest.fn(),
        getSegmentMembers: jest.fn(),

        // Campaign operations
        getCampaigns: jest.fn(),
        getCampaign: jest.fn(),
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        sendCampaign: jest.fn(),
        scheduleCampaign: jest.fn(),
        unscheduleCampaign: jest.fn(),

        // Template operations
        getTemplates: jest.fn(),
        getTemplate: jest.fn(),

        // Base API methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<MailchimpClient>;
}

// Test fixtures
const mockMember: MailchimpMember = {
    id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
    email_address: "john.smith@techstartup.io",
    unique_email_id: "unique123",
    status: "subscribed",
    merge_fields: {
        FNAME: "John",
        LNAME: "Smith"
    },
    full_name: "John Smith",
    vip: false,
    member_rating: 4,
    last_changed: "2024-01-15T10:30:00Z",
    source: "API - Generic",
    tags_count: 2,
    tags: [
        { id: 10001, name: "Newsletter" },
        { id: 10002, name: "Product Updates" }
    ],
    list_id: "a1b2c3d4e5"
};

const mockList: MailchimpList = {
    id: "a1b2c3d4e5",
    name: "Main Newsletter Subscribers",
    contact: {
        company: "Acme Software Inc",
        address1: "123 Tech Boulevard",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "US"
    },
    permission_reminder: "You signed up for our newsletter",
    campaign_defaults: {
        from_name: "Acme Software Team",
        from_email: "hello@acmesoftware.com",
        subject: "Updates from Acme",
        language: "en"
    },
    email_type_option: true,
    date_created: "2022-03-15T08:00:00Z",
    list_rating: 5,
    subscribe_url_short: "https://short.url",
    subscribe_url_long: "https://long.url",
    beamer_address: "beamer@acme.com",
    visibility: "pub",
    double_optin: true,
    marketing_permissions: false,
    stats: {
        member_count: 15847,
        unsubscribe_count: 892,
        cleaned_count: 234,
        member_count_since_send: 100,
        unsubscribe_count_since_send: 5,
        cleaned_count_since_send: 2,
        campaign_count: 156,
        merge_field_count: 5,
        avg_sub_rate: 0.05,
        avg_unsub_rate: 0.01,
        target_sub_rate: 0.1,
        open_rate: 0.35,
        click_rate: 0.12
    }
};

describe("Mailchimp Operation Executors", () => {
    let mockClient: jest.Mocked<MailchimpClient>;

    beforeEach(() => {
        mockClient = createMockMailchimpClient();
    });

    // ============================================
    // MEMBER OPERATIONS
    // ============================================

    describe("executeAddMember", () => {
        it("calls client with correct params", async () => {
            mockClient.addMember.mockResolvedValueOnce(mockMember);

            await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed",
                firstName: "John",
                lastName: "Smith"
            });

            expect(mockClient.addMember).toHaveBeenCalledWith("a1b2c3d4e5", {
                email_address: "john.smith@techstartup.io",
                status: "subscribed",
                email_type: undefined,
                merge_fields: {
                    FNAME: "John",
                    LNAME: "Smith"
                },
                language: undefined,
                vip: undefined,
                tags: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.addMember.mockResolvedValueOnce(mockMember);

            const result = await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                email: "john.smith@techstartup.io",
                status: "subscribed",
                firstName: "John",
                lastName: "Smith",
                fullName: "John Smith",
                mergeFields: { FNAME: "John", LNAME: "Smith" },
                language: undefined,
                vip: false,
                memberRating: 4,
                lastChanged: "2024-01-15T10:30:00Z",
                source: "API - Generic",
                tagsCount: 2,
                tags: [
                    { id: 10001, name: "Newsletter" },
                    { id: 10002, name: "Product Updates" }
                ]
            });
        });

        it("passes additional merge fields", async () => {
            mockClient.addMember.mockResolvedValueOnce(mockMember);

            await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed",
                firstName: "John",
                lastName: "Smith",
                mergeFields: { COMPANY: "Tech Startup Inc" }
            });

            expect(mockClient.addMember).toHaveBeenCalledWith("a1b2c3d4e5", {
                email_address: "john.smith@techstartup.io",
                status: "subscribed",
                email_type: undefined,
                merge_fields: {
                    COMPANY: "Tech Startup Inc",
                    FNAME: "John",
                    LNAME: "Smith"
                },
                language: undefined,
                vip: undefined,
                tags: undefined
            });
        });

        it("passes tags when provided", async () => {
            mockClient.addMember.mockResolvedValueOnce(mockMember);

            await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed",
                tags: ["Newsletter", "VIP"]
            });

            expect(mockClient.addMember).toHaveBeenCalledWith("a1b2c3d4e5", {
                email_address: "john.smith@techstartup.io",
                status: "subscribed",
                email_type: undefined,
                merge_fields: undefined,
                language: undefined,
                vip: undefined,
                tags: ["Newsletter", "VIP"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.addMember.mockRejectedValueOnce(
                new Error("john.smith@techstartup.io is already a list member")
            );

            const result = await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "john.smith@techstartup.io is already a list member"
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.addMember.mockRejectedValueOnce("string error");

            const result = await executeAddMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "subscribed"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to add member");
        });
    });

    describe("executeGetMember", () => {
        it("calls client with correct params", async () => {
            mockClient.getMember.mockResolvedValueOnce(mockMember);

            await executeGetMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io"
            });

            expect(mockClient.getMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "john.smith@techstartup.io"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getMember.mockResolvedValueOnce(mockMember);

            const result = await executeGetMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                email: "john.smith@techstartup.io",
                status: "subscribed"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getMember.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetMembers", () => {
        it("calls client with correct params", async () => {
            mockClient.getMembers.mockResolvedValueOnce({
                members: [mockMember],
                total_items: 1
            });

            await executeGetMembers(mockClient, {
                listId: "a1b2c3d4e5",
                count: 10,
                offset: 0,
                status: "subscribed"
            });

            expect(mockClient.getMembers).toHaveBeenCalledWith("a1b2c3d4e5", {
                count: 10,
                offset: 0,
                status: "subscribed",
                since_last_changed: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getMembers.mockResolvedValueOnce({
                members: [mockMember],
                total_items: 100
            });

            const result = await executeGetMembers(mockClient, {
                listId: "a1b2c3d4e5",
                count: 10
            });

            expect(result.success).toBe(true);
            const data = result.data as MembersResultData;
            expect(data.members).toHaveLength(1);
            expect(data.totalItems).toBe(100);
            expect(data.hasMore).toBe(true);
        });

        it("returns hasMore false when no more items", async () => {
            mockClient.getMembers.mockResolvedValueOnce({
                members: [mockMember],
                total_items: 1
            });

            const result = await executeGetMembers(mockClient, {
                listId: "a1b2c3d4e5"
            });

            const data = result.data as MembersResultData;
            expect(data.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getMembers.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeGetMembers(mockClient, {
                listId: "a1b2c3d4e5"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateMember", () => {
        it("calls client with correct params", async () => {
            mockClient.updateMember.mockResolvedValueOnce(mockMember);

            await executeUpdateMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                firstName: "Jonathan",
                lastName: "Smith-Williams"
            });

            expect(mockClient.updateMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "john.smith@techstartup.io",
                {
                    merge_fields: {
                        FNAME: "Jonathan",
                        LNAME: "Smith-Williams"
                    }
                }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.updateMember.mockResolvedValueOnce(mockMember);

            const result = await executeUpdateMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                firstName: "Jonathan"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                email: "john.smith@techstartup.io"
            });
        });

        it("handles status updates", async () => {
            mockClient.updateMember.mockResolvedValueOnce({
                ...mockMember,
                status: "unsubscribed"
            });

            await executeUpdateMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                status: "unsubscribed"
            });

            expect(mockClient.updateMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "john.smith@techstartup.io",
                {
                    status: "unsubscribed"
                }
            );
        });

        it("returns error on client failure", async () => {
            mockClient.updateMember.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeUpdateMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com",
                firstName: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeArchiveMember", () => {
        it("calls client with correct params", async () => {
            mockClient.archiveMember.mockResolvedValueOnce();

            await executeArchiveMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "old.subscriber@defunct-company.com"
            });

            expect(mockClient.archiveMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "old.subscriber@defunct-company.com"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.archiveMember.mockResolvedValueOnce();

            const result = await executeArchiveMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "old.subscriber@defunct-company.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                archived: true,
                email: "old.subscriber@defunct-company.com",
                listId: "a1b2c3d4e5"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.archiveMember.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeArchiveMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteMemberPermanently", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteMemberPermanently.mockResolvedValueOnce();

            await executeDeleteMemberPermanently(mockClient, {
                listId: "a1b2c3d4e5",
                email: "gdpr.request@european-user.eu"
            });

            expect(mockClient.deleteMemberPermanently).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "gdpr.request@european-user.eu"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteMemberPermanently.mockResolvedValueOnce();

            const result = await executeDeleteMemberPermanently(mockClient, {
                listId: "a1b2c3d4e5",
                email: "gdpr.request@european-user.eu"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                email: "gdpr.request@european-user.eu",
                listId: "a1b2c3d4e5"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteMemberPermanently.mockRejectedValueOnce(
                new Error("Resource not found")
            );

            const result = await executeDeleteMemberPermanently(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // TAG OPERATIONS
    // ============================================

    describe("executeAddTagsToMember", () => {
        it("calls client with correct params", async () => {
            mockClient.addTagsToMember.mockResolvedValueOnce();

            await executeAddTagsToMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                tags: ["Newsletter", "Product Updates", "Beta Tester"]
            });

            expect(mockClient.addTagsToMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "john.smith@techstartup.io",
                ["Newsletter", "Product Updates", "Beta Tester"]
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.addTagsToMember.mockResolvedValueOnce();

            const result = await executeAddTagsToMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                tags: ["Newsletter", "VIP"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                added: true,
                email: "john.smith@techstartup.io",
                tags: ["Newsletter", "VIP"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.addTagsToMember.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeAddTagsToMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com",
                tags: ["Test Tag"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeRemoveTagsFromMember", () => {
        it("calls client with correct params", async () => {
            mockClient.removeTagsFromMember.mockResolvedValueOnce();

            await executeRemoveTagsFromMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                tags: ["Beta Tester", "2023-Campaign"]
            });

            expect(mockClient.removeTagsFromMember).toHaveBeenCalledWith(
                "a1b2c3d4e5",
                "john.smith@techstartup.io",
                ["Beta Tester", "2023-Campaign"]
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.removeTagsFromMember.mockResolvedValueOnce();

            const result = await executeRemoveTagsFromMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "john.smith@techstartup.io",
                tags: ["Beta Tester"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                removed: true,
                email: "john.smith@techstartup.io",
                tags: ["Beta Tester"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.removeTagsFromMember.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeRemoveTagsFromMember(mockClient, {
                listId: "a1b2c3d4e5",
                email: "nonexistent@example.com",
                tags: ["Test Tag"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeGetTags", () => {
        it("calls client with correct params", async () => {
            mockClient.getTags.mockResolvedValueOnce({
                tags: [{ id: 10001, name: "Newsletter", member_count: 12453 }],
                total_items: 1
            });

            await executeGetTags(mockClient, {
                listId: "a1b2c3d4e5",
                count: 10,
                offset: 0
            });

            expect(mockClient.getTags).toHaveBeenCalledWith("a1b2c3d4e5", {
                count: 10,
                offset: 0
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getTags.mockResolvedValueOnce({
                tags: [
                    { id: 10001, name: "Newsletter", member_count: 12453 },
                    { id: 10002, name: "VIP", member_count: 156 }
                ],
                total_items: 50
            });

            const result = await executeGetTags(mockClient, {
                listId: "a1b2c3d4e5"
            });

            expect(result.success).toBe(true);
            const data = result.data as TagsResultData;
            expect(data.tags).toHaveLength(2);
            expect(data.tags[0]).toEqual({
                id: 10001,
                name: "Newsletter",
                memberCount: 12453
            });
            expect(data.totalItems).toBe(50);
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getTags.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetTags(mockClient, {
                listId: "nonexistent123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // LIST OPERATIONS
    // ============================================

    describe("executeGetLists", () => {
        it("calls client with default params", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                lists: [],
                total_items: 0
            });

            await executeGetLists(mockClient, {});

            expect(mockClient.getLists).toHaveBeenCalledWith({
                count: undefined,
                offset: undefined,
                sortField: undefined,
                sortDir: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                lists: [],
                total_items: 0
            });

            await executeGetLists(mockClient, {
                count: 50,
                offset: 10,
                sortField: "date_created",
                sortDir: "DESC"
            });

            expect(mockClient.getLists).toHaveBeenCalledWith({
                count: 50,
                offset: 10,
                sortField: "date_created",
                sortDir: "DESC"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                lists: [mockList],
                total_items: 3
            });

            const result = await executeGetLists(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as ListsResultData;
            expect(data.lists).toHaveLength(1);
            expect(data.lists[0]).toEqual({
                id: "a1b2c3d4e5",
                name: "Main Newsletter Subscribers",
                memberCount: 15847,
                unsubscribeCount: 892,
                cleanedCount: 234,
                campaignCount: 156,
                dateCreated: "2022-03-15T08:00:00Z",
                visibility: "pub",
                doubleOptin: true
            });
        });

        it("returns hasMore correctly", async () => {
            mockClient.getLists.mockResolvedValueOnce({
                lists: [mockList],
                total_items: 10
            });

            const result = await executeGetLists(mockClient, { count: 1 });

            const data = result.data as ListsResultData;
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getLists.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeGetLists(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetList", () => {
        it("calls client with correct params", async () => {
            mockClient.getList.mockResolvedValueOnce(mockList);

            await executeGetList(mockClient, {
                listId: "a1b2c3d4e5"
            });

            expect(mockClient.getList).toHaveBeenCalledWith("a1b2c3d4e5");
        });

        it("returns normalized output on success", async () => {
            mockClient.getList.mockResolvedValueOnce(mockList);

            const result = await executeGetList(mockClient, {
                listId: "a1b2c3d4e5"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "a1b2c3d4e5",
                name: "Main Newsletter Subscribers",
                memberCount: 15847,
                unsubscribeCount: 892,
                cleanedCount: 234,
                campaignCount: 156,
                dateCreated: "2022-03-15T08:00:00Z",
                visibility: "pub",
                doubleOptin: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getList.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetList(mockClient, {
                listId: "nonexistent123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateList", () => {
        it("calls client with correct params", async () => {
            mockClient.createList.mockResolvedValueOnce(mockList);

            // Note: createListSchema has language default of "en", so we need to pass
            // the validated params (with default applied) to the executor
            const params = createListSchema.parse({
                name: "Product Launch Newsletter",
                company: "Acme Software Inc",
                address1: "123 Tech Boulevard",
                city: "San Francisco",
                state: "CA",
                zip: "94105",
                country: "US",
                permissionReminder: "You signed up for updates",
                fromName: "Acme Software Team",
                fromEmail: "hello@acmesoftware.com",
                subject: "Updates from Acme"
            });

            await executeCreateList(mockClient, params);

            expect(mockClient.createList).toHaveBeenCalledWith({
                name: "Product Launch Newsletter",
                contact: {
                    company: "Acme Software Inc",
                    address1: "123 Tech Boulevard",
                    address2: undefined,
                    city: "San Francisco",
                    state: "CA",
                    zip: "94105",
                    country: "US",
                    phone: undefined
                },
                permission_reminder: "You signed up for updates",
                campaign_defaults: {
                    from_name: "Acme Software Team",
                    from_email: "hello@acmesoftware.com",
                    subject: "Updates from Acme",
                    language: "en"
                },
                email_type_option: undefined,
                double_optin: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createList.mockResolvedValueOnce(mockList);

            const params = createListSchema.parse({
                name: "Product Launch Newsletter",
                company: "Acme Software Inc",
                address1: "123 Tech Boulevard",
                city: "San Francisco",
                state: "CA",
                zip: "94105",
                country: "US",
                permissionReminder: "You signed up for updates",
                fromName: "Acme Software Team",
                fromEmail: "hello@acmesoftware.com",
                subject: "Updates from Acme"
            });

            const result = await executeCreateList(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "a1b2c3d4e5",
                name: "Main Newsletter Subscribers"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createList.mockRejectedValueOnce(new Error("Invalid email domain"));

            const params = createListSchema.parse({
                name: "Test List",
                company: "Test Co",
                address1: "123 Test St",
                city: "Test City",
                state: "TS",
                zip: "12345",
                country: "US",
                permissionReminder: "Test reminder",
                fromName: "Test",
                fromEmail: "invalid@unverified-domain.fake",
                subject: "Test"
            });

            const result = await executeCreateList(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateList", () => {
        it("calls client with correct params", async () => {
            mockClient.updateList.mockResolvedValueOnce(mockList);

            await executeUpdateList(mockClient, {
                listId: "a1b2c3d4e5",
                name: "Main Newsletter Subscribers 2024",
                permissionReminder: "Updated permission reminder"
            });

            expect(mockClient.updateList).toHaveBeenCalledWith("a1b2c3d4e5", {
                name: "Main Newsletter Subscribers 2024",
                permission_reminder: "Updated permission reminder"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.updateList.mockResolvedValueOnce(mockList);

            const result = await executeUpdateList(mockClient, {
                listId: "a1b2c3d4e5",
                name: "Updated Name"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "a1b2c3d4e5"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateList.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeUpdateList(mockClient, {
                listId: "nonexistent123",
                name: "Updated Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // SEGMENT OPERATIONS
    // ============================================

    describe("executeGetSegments", () => {
        it("calls client with correct params", async () => {
            mockClient.getSegments.mockResolvedValueOnce({
                segments: [],
                total_items: 0
            });

            await executeGetSegments(mockClient, {
                listId: "a1b2c3d4e5",
                count: 10,
                type: "saved"
            });

            expect(mockClient.getSegments).toHaveBeenCalledWith("a1b2c3d4e5", {
                count: 10,
                offset: undefined,
                type: "saved"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getSegments.mockResolvedValueOnce({
                segments: [
                    {
                        id: 501,
                        name: "Highly Engaged",
                        member_count: 3421,
                        type: "saved",
                        created_at: "2023-02-15T10:00:00Z",
                        updated_at: "2024-01-15T08:00:00Z",
                        list_id: "a1b2c3d4e5"
                    }
                ],
                total_items: 12
            });

            const result = await executeGetSegments(mockClient, {
                listId: "a1b2c3d4e5"
            });

            expect(result.success).toBe(true);
            const data = result.data as SegmentsResultData;
            expect(data.segments).toHaveLength(1);
            expect(data.segments[0]).toEqual({
                id: 501,
                name: "Highly Engaged",
                memberCount: 3421,
                type: "saved",
                createdAt: "2023-02-15T10:00:00Z",
                updatedAt: "2024-01-15T08:00:00Z"
            });
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getSegments.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetSegments(mockClient, {
                listId: "nonexistent123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetSegmentMembers", () => {
        it("calls client with correct params", async () => {
            mockClient.getSegmentMembers.mockResolvedValueOnce({
                members: [],
                total_items: 0
            });

            await executeGetSegmentMembers(mockClient, {
                listId: "a1b2c3d4e5",
                segmentId: 503,
                count: 10
            });

            expect(mockClient.getSegmentMembers).toHaveBeenCalledWith("a1b2c3d4e5", 503, {
                count: 10,
                offset: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getSegmentMembers.mockResolvedValueOnce({
                members: [mockMember],
                total_items: 156
            });

            const result = await executeGetSegmentMembers(mockClient, {
                listId: "a1b2c3d4e5",
                segmentId: 503
            });

            expect(result.success).toBe(true);
            const data = result.data as MembersResultData;
            expect(data.members).toHaveLength(1);
            expect(data.totalItems).toBe(156);
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getSegmentMembers.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetSegmentMembers(mockClient, {
                listId: "a1b2c3d4e5",
                segmentId: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // CAMPAIGN OPERATIONS
    // ============================================

    describe("executeGetCampaigns", () => {
        it("calls client with default params", async () => {
            mockClient.getCampaigns.mockResolvedValueOnce({
                campaigns: [],
                total_items: 0
            });

            await executeGetCampaigns(mockClient, {});

            expect(mockClient.getCampaigns).toHaveBeenCalledWith({
                count: undefined,
                offset: undefined,
                type: undefined,
                status: undefined,
                list_id: undefined,
                sort_field: undefined,
                sort_dir: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getCampaigns.mockResolvedValueOnce({
                campaigns: [
                    {
                        id: "campaign_abc123",
                        type: "regular",
                        create_time: "2024-01-15T10:00:00Z",
                        status: "sent",
                        send_time: "2024-01-16T14:00:00Z",
                        emails_sent: 15234,
                        settings: {
                            subject_line: "Test Campaign",
                            title: "Test Title",
                            from_name: "Acme Team",
                            reply_to: "hello@acme.com"
                        },
                        recipients: {
                            list_id: "a1b2c3d4e5",
                            list_name: "Main Newsletter",
                            recipient_count: 15000
                        },
                        report_summary: {
                            open_rate: 0.35,
                            click_rate: 0.12
                        }
                    }
                ],
                total_items: 156
            });

            const result = await executeGetCampaigns(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as CampaignsResultData;
            expect(data.campaigns).toHaveLength(1);
            expect(data.campaigns[0]).toMatchObject({
                id: "campaign_abc123",
                type: "regular",
                status: "sent"
            });
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getCampaigns.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeGetCampaigns(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.getCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "sent"
            });

            await executeGetCampaign(mockClient, {
                campaignId: "campaign_abc123"
            });

            expect(mockClient.getCampaign).toHaveBeenCalledWith("campaign_abc123");
        });

        it("returns normalized output on success", async () => {
            mockClient.getCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "sent",
                send_time: "2024-01-16T14:00:00Z",
                emails_sent: 15234,
                settings: {
                    subject_line: "Test Campaign"
                }
            });

            const result = await executeGetCampaign(mockClient, {
                campaignId: "campaign_abc123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "campaign_abc123",
                type: "regular",
                status: "sent",
                emailsSent: 15234
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getCampaign.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetCampaign(mockClient, {
                campaignId: "nonexistent_campaign"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.createCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save"
            });

            await executeCreateCampaign(mockClient, {
                type: "regular",
                listId: "a1b2c3d4e5",
                subjectLine: "Test Subject",
                title: "Test Campaign",
                fromName: "Acme Team",
                replyTo: "hello@acme.com",
                trackOpens: true,
                trackClicks: true
            });

            expect(mockClient.createCampaign).toHaveBeenCalledWith({
                type: "regular",
                recipients: {
                    list_id: "a1b2c3d4e5",
                    segment_opts: undefined
                },
                settings: {
                    subject_line: "Test Subject",
                    preview_text: undefined,
                    title: "Test Campaign",
                    from_name: "Acme Team",
                    reply_to: "hello@acme.com",
                    template_id: undefined
                },
                tracking: {
                    opens: true,
                    html_clicks: true,
                    text_clicks: true
                }
            });
        });

        it("passes segment ID when provided", async () => {
            mockClient.createCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save"
            });

            await executeCreateCampaign(mockClient, {
                type: "regular",
                listId: "a1b2c3d4e5",
                segmentId: 501,
                subjectLine: "Test Subject"
            });

            expect(mockClient.createCampaign).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipients: {
                        list_id: "a1b2c3d4e5",
                        segment_opts: { saved_segment_id: 501 }
                    }
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.createCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save",
                settings: {
                    subject_line: "Test Subject",
                    title: "Test Campaign"
                },
                recipients: {
                    list_id: "a1b2c3d4e5",
                    list_name: "Main Newsletter",
                    recipient_count: 15000
                }
            });

            const result = await executeCreateCampaign(mockClient, {
                type: "regular",
                listId: "a1b2c3d4e5",
                subjectLine: "Test Subject",
                title: "Test Campaign"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "campaign_abc123",
                type: "regular",
                status: "save",
                listId: "a1b2c3d4e5"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createCampaign.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeCreateCampaign(mockClient, {
                type: "regular",
                listId: "nonexistent123",
                subjectLine: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.updateCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save"
            });

            await executeUpdateCampaign(mockClient, {
                campaignId: "campaign_abc123",
                subjectLine: "Updated Subject",
                previewText: "Updated preview"
            });

            expect(mockClient.updateCampaign).toHaveBeenCalledWith("campaign_abc123", {
                settings: {
                    subject_line: "Updated Subject",
                    preview_text: "Updated preview",
                    title: undefined,
                    from_name: undefined,
                    reply_to: undefined,
                    template_id: undefined
                }
            });
        });

        it("handles tracking updates", async () => {
            mockClient.updateCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save"
            });

            await executeUpdateCampaign(mockClient, {
                campaignId: "campaign_abc123",
                trackOpens: true,
                trackClicks: false
            });

            expect(mockClient.updateCampaign).toHaveBeenCalledWith("campaign_abc123", {
                tracking: {
                    opens: true,
                    html_clicks: false,
                    text_clicks: false
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.updateCampaign.mockResolvedValueOnce({
                id: "campaign_abc123",
                type: "regular",
                create_time: "2024-01-15T10:00:00Z",
                status: "save",
                settings: {
                    subject_line: "Updated Subject"
                }
            });

            const result = await executeUpdateCampaign(mockClient, {
                campaignId: "campaign_abc123",
                subjectLine: "Updated Subject"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: "campaign_abc123",
                subjectLine: "Updated Subject"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateCampaign.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeUpdateCampaign(mockClient, {
                campaignId: "nonexistent_campaign",
                subjectLine: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeSendCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.sendCampaign.mockResolvedValueOnce();

            await executeSendCampaign(mockClient, {
                campaignId: "campaign_ready_to_send"
            });

            expect(mockClient.sendCampaign).toHaveBeenCalledWith("campaign_ready_to_send");
        });

        it("returns normalized output on success", async () => {
            mockClient.sendCampaign.mockResolvedValueOnce();

            const result = await executeSendCampaign(mockClient, {
                campaignId: "campaign_ready_to_send"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sent: true,
                campaignId: "campaign_ready_to_send"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.sendCampaign.mockRejectedValueOnce(
                new Error("Campaign cannot be sent. Missing required content.")
            );

            const result = await executeSendCampaign(mockClient, {
                campaignId: "campaign_incomplete"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeScheduleCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.scheduleCampaign.mockResolvedValueOnce();

            await executeScheduleCampaign(mockClient, {
                campaignId: "campaign_draft456",
                scheduleTime: "2024-02-01T15:00:00Z"
            });

            expect(mockClient.scheduleCampaign).toHaveBeenCalledWith(
                "campaign_draft456",
                "2024-02-01T15:00:00Z",
                undefined,
                undefined
            );
        });

        it("passes batch delivery options when provided", async () => {
            mockClient.scheduleCampaign.mockResolvedValueOnce();

            await executeScheduleCampaign(mockClient, {
                campaignId: "campaign_draft456",
                scheduleTime: "2024-02-01T15:00:00Z",
                timewarp: true,
                batchCount: 5,
                batchDelay: 10
            });

            expect(mockClient.scheduleCampaign).toHaveBeenCalledWith(
                "campaign_draft456",
                "2024-02-01T15:00:00Z",
                true,
                { batch_count: 5, batch_delay: 10 }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.scheduleCampaign.mockResolvedValueOnce();

            const result = await executeScheduleCampaign(mockClient, {
                campaignId: "campaign_draft456",
                scheduleTime: "2024-02-01T15:00:00Z"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                scheduled: true,
                campaignId: "campaign_draft456",
                scheduleTime: "2024-02-01T15:00:00Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.scheduleCampaign.mockRejectedValueOnce(
                new Error("Schedule time must be in the future")
            );

            const result = await executeScheduleCampaign(mockClient, {
                campaignId: "campaign_draft456",
                scheduleTime: "2020-01-01T10:00:00Z"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUnscheduleCampaign", () => {
        it("calls client with correct params", async () => {
            mockClient.unscheduleCampaign.mockResolvedValueOnce();

            await executeUnscheduleCampaign(mockClient, {
                campaignId: "campaign_sched789"
            });

            expect(mockClient.unscheduleCampaign).toHaveBeenCalledWith("campaign_sched789");
        });

        it("returns normalized output on success", async () => {
            mockClient.unscheduleCampaign.mockResolvedValueOnce();

            const result = await executeUnscheduleCampaign(mockClient, {
                campaignId: "campaign_sched789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                unscheduled: true,
                campaignId: "campaign_sched789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.unscheduleCampaign.mockRejectedValueOnce(
                new Error("Campaign is not currently scheduled")
            );

            const result = await executeUnscheduleCampaign(mockClient, {
                campaignId: "campaign_draft456"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================
    // TEMPLATE OPERATIONS
    // ============================================

    describe("executeGetTemplates", () => {
        it("calls client with default params", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({
                templates: [],
                total_items: 0
            });

            await executeGetTemplates(mockClient, {});

            expect(mockClient.getTemplates).toHaveBeenCalledWith({
                count: undefined,
                offset: undefined,
                type: undefined,
                category: undefined,
                folder_id: undefined,
                sort_field: undefined,
                sort_dir: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getTemplates.mockResolvedValueOnce({
                templates: [
                    {
                        id: 12345,
                        name: "Modern Newsletter - Blue Theme",
                        type: "user",
                        category: "Newsletter",
                        active: true,
                        drag_and_drop: true,
                        responsive: true,
                        date_created: "2023-06-15T10:00:00Z",
                        date_edited: "2024-01-10T14:30:00Z"
                    }
                ],
                total_items: 23
            });

            const result = await executeGetTemplates(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as TemplatesResultData;
            expect(data.templates).toHaveLength(1);
            expect(data.templates[0]).toEqual({
                id: 12345,
                name: "Modern Newsletter - Blue Theme",
                type: "user",
                category: "Newsletter",
                active: true,
                dragAndDrop: true,
                responsive: true,
                dateCreated: "2023-06-15T10:00:00Z",
                dateEdited: "2024-01-10T14:30:00Z"
            });
            expect(data.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getTemplates.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeGetTemplates(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetTemplate", () => {
        it("calls client with correct params", async () => {
            mockClient.getTemplate.mockResolvedValueOnce({
                id: 12345,
                name: "Modern Newsletter - Blue Theme",
                type: "user",
                category: "Newsletter",
                active: true,
                drag_and_drop: true,
                responsive: true,
                date_created: "2023-06-15T10:00:00Z"
            });

            await executeGetTemplate(mockClient, {
                templateId: 12345
            });

            expect(mockClient.getTemplate).toHaveBeenCalledWith(12345);
        });

        it("returns normalized output on success", async () => {
            mockClient.getTemplate.mockResolvedValueOnce({
                id: 12345,
                name: "Modern Newsletter - Blue Theme",
                type: "user",
                category: "Newsletter",
                active: true,
                drag_and_drop: true,
                responsive: true,
                date_created: "2023-06-15T10:00:00Z",
                date_edited: "2024-01-10T14:30:00Z"
            });

            const result = await executeGetTemplate(mockClient, {
                templateId: 12345
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: 12345,
                name: "Modern Newsletter - Blue Theme",
                type: "user",
                category: "Newsletter",
                active: true,
                dragAndDrop: true,
                responsive: true,
                dateCreated: "2023-06-15T10:00:00Z",
                dateEdited: "2024-01-10T14:30:00Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getTemplate.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetTemplate(mockClient, {
                templateId: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================
    // SCHEMA VALIDATION
    // ============================================

    describe("schema validation", () => {
        describe("addMemberSchema", () => {
            it("validates minimal input", () => {
                const result = addMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    status: "subscribed"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = addMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    status: "subscribed",
                    emailType: "html",
                    firstName: "John",
                    lastName: "Smith",
                    mergeFields: { COMPANY: "Acme" },
                    language: "en",
                    vip: true,
                    tags: ["Newsletter"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing listId", () => {
                const result = addMemberSchema.safeParse({
                    email: "test@example.com",
                    status: "subscribed"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = addMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "invalid-email",
                    status: "subscribed"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid status", () => {
                const result = addMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    status: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getMemberSchema", () => {
            it("validates input", () => {
                const result = getMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty listId", () => {
                const result = getMemberSchema.safeParse({
                    listId: "",
                    email: "test@example.com"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getMembersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getMembersSchema.safeParse({
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });

            it("validates with count", () => {
                const result = getMembersSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    count: 100
                });
                expect(result.success).toBe(true);
            });

            it("rejects count over 1000", () => {
                const result = getMembersSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    count: 2000
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative offset", () => {
                const result = getMembersSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    offset: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateMemberSchema", () => {
            it("validates minimal input", () => {
                const result = updateMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with updates", () => {
                const result = updateMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    newEmail: "new@example.com",
                    status: "unsubscribed",
                    firstName: "John"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("archiveMemberSchema", () => {
            it("validates input", () => {
                const result = archiveMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteMemberPermanentlySchema", () => {
            it("validates input", () => {
                const result = deleteMemberPermanentlySchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("addTagsToMemberSchema", () => {
            it("validates input", () => {
                const result = addTagsToMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: ["Newsletter", "VIP"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty tags array", () => {
                const result = addTagsToMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty tag name", () => {
                const result = addTagsToMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: [""]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("removeTagsFromMemberSchema", () => {
            it("validates input", () => {
                const result = removeTagsFromMemberSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: ["Newsletter"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getTagsSchema", () => {
            it("validates input", () => {
                const result = getTagsSchema.safeParse({
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = getTagsSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    count: 50,
                    offset: 10
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getListsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getListsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with sorting", () => {
                const result = getListsSchema.safeParse({
                    sortField: "date_created",
                    sortDir: "DESC"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getListSchema", () => {
            it("validates input", () => {
                const result = getListSchema.safeParse({
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("createListSchema", () => {
            it("validates minimal input", () => {
                const result = createListSchema.safeParse({
                    name: "Test List",
                    company: "Test Co",
                    address1: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US",
                    permissionReminder: "You signed up",
                    fromName: "Test",
                    fromEmail: "test@example.com",
                    subject: "Test Subject"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing required fields", () => {
                const result = createListSchema.safeParse({
                    name: "Test List"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createListSchema.safeParse({
                    name: "Test List",
                    company: "Test Co",
                    address1: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US",
                    permissionReminder: "You signed up",
                    fromName: "Test",
                    fromEmail: "invalid",
                    subject: "Test Subject"
                });
                expect(result.success).toBe(false);
            });

            it("applies default language", () => {
                const result = createListSchema.parse({
                    name: "Test List",
                    company: "Test Co",
                    address1: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US",
                    permissionReminder: "You signed up",
                    fromName: "Test",
                    fromEmail: "test@example.com",
                    subject: "Test Subject"
                });
                expect(result.language).toBe("en");
            });
        });

        describe("updateListSchema", () => {
            it("validates minimal input", () => {
                const result = updateListSchema.safeParse({
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });

            it("validates with updates", () => {
                const result = updateListSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    name: "Updated Name",
                    doubleOptin: true
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getSegmentsSchema", () => {
            it("validates minimal input", () => {
                const result = getSegmentsSchema.safeParse({
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });

            it("validates with type filter", () => {
                const result = getSegmentsSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    type: "saved"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getSegmentMembersSchema", () => {
            it("validates input", () => {
                const result = getSegmentMembersSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    segmentId: 501
                });
                expect(result.success).toBe(true);
            });

            it("rejects non-positive segmentId", () => {
                const result = getSegmentMembersSchema.safeParse({
                    listId: "a1b2c3d4e5",
                    segmentId: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCampaignsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getCampaignsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = getCampaignsSchema.safeParse({
                    type: "regular",
                    status: "sent",
                    listId: "a1b2c3d4e5",
                    sortField: "send_time",
                    sortDir: "DESC"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getCampaignSchema", () => {
            it("validates input", () => {
                const result = getCampaignSchema.safeParse({
                    campaignId: "campaign_abc123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty campaignId", () => {
                const result = getCampaignSchema.safeParse({
                    campaignId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createCampaignSchema", () => {
            it("validates minimal input", () => {
                const result = createCampaignSchema.safeParse({
                    type: "regular",
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createCampaignSchema.safeParse({
                    type: "regular",
                    listId: "a1b2c3d4e5",
                    segmentId: 501,
                    subjectLine: "Test Subject",
                    previewText: "Preview",
                    title: "Test Campaign",
                    fromName: "Test",
                    replyTo: "test@example.com",
                    templateId: 12345,
                    trackOpens: true,
                    trackClicks: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid campaign type", () => {
                const result = createCampaignSchema.safeParse({
                    type: "invalid",
                    listId: "a1b2c3d4e5"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateCampaignSchema", () => {
            it("validates minimal input", () => {
                const result = updateCampaignSchema.safeParse({
                    campaignId: "campaign_abc123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with updates", () => {
                const result = updateCampaignSchema.safeParse({
                    campaignId: "campaign_abc123",
                    subjectLine: "Updated Subject",
                    trackOpens: false
                });
                expect(result.success).toBe(true);
            });
        });

        describe("sendCampaignSchema", () => {
            it("validates input", () => {
                const result = sendCampaignSchema.safeParse({
                    campaignId: "campaign_abc123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("scheduleCampaignSchema", () => {
            it("validates minimal input", () => {
                const result = scheduleCampaignSchema.safeParse({
                    campaignId: "campaign_abc123",
                    scheduleTime: "2024-02-01T15:00:00Z"
                });
                expect(result.success).toBe(true);
            });

            it("validates with batch delivery", () => {
                const result = scheduleCampaignSchema.safeParse({
                    campaignId: "campaign_abc123",
                    scheduleTime: "2024-02-01T15:00:00Z",
                    timewarp: true,
                    batchCount: 5,
                    batchDelay: 10
                });
                expect(result.success).toBe(true);
            });
        });

        describe("unscheduleCampaignSchema", () => {
            it("validates input", () => {
                const result = unscheduleCampaignSchema.safeParse({
                    campaignId: "campaign_abc123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getTemplatesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getTemplatesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with filters", () => {
                const result = getTemplatesSchema.safeParse({
                    type: "user",
                    category: "Newsletter",
                    sortField: "date_created",
                    sortDir: "DESC"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getTemplateSchema", () => {
            it("validates input", () => {
                const result = getTemplateSchema.safeParse({
                    templateId: 12345
                });
                expect(result.success).toBe(true);
            });

            it("rejects non-positive templateId", () => {
                const result = getTemplateSchema.safeParse({
                    templateId: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-integer templateId", () => {
                const result = getTemplateSchema.safeParse({
                    templateId: 12.5
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
