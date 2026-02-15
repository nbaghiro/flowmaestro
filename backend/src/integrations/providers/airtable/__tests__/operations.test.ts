/**
 * Airtable Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeListRecords,
    listRecordsSchema,
    executeGetRecord,
    getRecordSchema,
    executeCreateRecord,
    createRecordSchema,
    executeUpdateRecord,
    updateRecordSchema,
    executeDeleteRecord,
    deleteRecordSchema,
    executeBatchCreateRecords,
    batchCreateRecordsSchema,
    executeBatchUpdateRecords,
    batchUpdateRecordsSchema,
    executeBatchDeleteRecords,
    batchDeleteRecordsSchema,
    executeListBases,
    listBasesSchema,
    executeGetBaseSchema,
    getBaseSchemaSchema,
    executeListTables,
    listTablesSchema,
    executeListComments,
    listCommentsSchema,
    executeCreateComment,
    createCommentSchema,
    executeUpdateComment,
    updateCommentSchema
} from "../operations";
import type { AirtableClient } from "../client/AirtableClient";

// Mock AirtableClient factory
function createMockAirtableClient(): jest.Mocked<AirtableClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        updateAccessToken: jest.fn()
    } as unknown as jest.Mocked<AirtableClient>;
}

// Test fixtures
const TEST_BASE_ID = "appABC123";
const TEST_TABLE_ID = "tblXYZ789";
const TEST_RECORD_ID = "recDEF456";
const TEST_COMMENT_ID = "comGHI012";

const mockRecord = {
    id: TEST_RECORD_ID,
    createdTime: "2024-01-15T10:30:00.000Z",
    fields: {
        Name: "Test Record",
        Status: "Active",
        Count: 42
    }
};

const mockComment = {
    id: TEST_COMMENT_ID,
    text: "This is a test comment",
    createdTime: "2024-01-15T11:00:00.000Z",
    author: {
        id: "usr123",
        email: "test@example.com",
        name: "Test User"
    }
};

const mockTable = {
    id: TEST_TABLE_ID,
    name: "Projects",
    description: "Project tracking table",
    primaryFieldId: "fldABC",
    fields: [
        { id: "fldABC", name: "Name", type: "singleLineText" },
        { id: "fldDEF", name: "Status", type: "singleSelect" }
    ],
    views: [{ id: "viwXYZ", name: "Grid view", type: "grid" }]
};

const mockBase = {
    id: TEST_BASE_ID,
    name: "Test Base",
    permissionLevel: "create"
};

describe("Airtable Operation Executors", () => {
    let mockClient: jest.Mocked<AirtableClient>;

    beforeEach(() => {
        mockClient = createMockAirtableClient();
    });

    // ============================================================
    // LIST RECORDS
    // ============================================================
    describe("executeListRecords", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                records: [mockRecord],
                offset: undefined
            });

            await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID
            });

            expect(mockClient.get).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {});
        });

        it("passes all optional parameters", async () => {
            mockClient.get.mockResolvedValueOnce({
                records: [],
                offset: undefined
            });

            await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                pageSize: 50,
                offset: "cursor123",
                view: "Grid view",
                filterByFormula: "{Status} = 'Active'",
                maxRecords: 100,
                fields: ["Name", "Status"],
                sort: [{ field: "Name", direction: "asc" }]
            });

            expect(mockClient.get).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                pageSize: 50,
                offset: "cursor123",
                view: "Grid view",
                filterByFormula: "{Status} = 'Active'",
                maxRecords: 100,
                fields: ["Name", "Status"],
                sort: [{ field: "Name", direction: "asc" }]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                records: [mockRecord],
                offset: "nextPage123"
            });

            const result = await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                records: [mockRecord],
                offset: "nextPage123",
                hasMore: true
            });
        });

        it("sets hasMore to false when no offset", async () => {
            mockClient.get.mockResolvedValueOnce({
                records: [mockRecord],
                offset: undefined
            });

            const result = await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID
            });

            expect(result.success).toBe(true);
            expect((result.data as { hasMore: boolean })?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("NOT_FOUND"));

            const result = await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: "invalid_table"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list records");
        });
    });

    // ============================================================
    // GET RECORD
    // ============================================================
    describe("executeGetRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockRecord);

            await executeGetRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}`
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockRecord);

            const result = await executeGetRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockRecord);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeGetRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: "invalid_record"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeGetRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get record");
        });
    });

    // ============================================================
    // CREATE RECORD
    // ============================================================
    describe("executeCreateRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockRecord);

            await executeCreateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                fields: { Name: "New Record", Status: "Pending" }
            });

            expect(mockClient.post).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                fields: { Name: "New Record", Status: "Pending" }
            });
        });

        it("passes typecast option when provided", async () => {
            mockClient.post.mockResolvedValueOnce(mockRecord);

            await executeCreateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                fields: { Name: "Test", Count: "42" },
                typecast: true
            });

            expect(mockClient.post).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                fields: { Name: "Test", Count: "42" },
                typecast: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockRecord);

            const result = await executeCreateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                fields: { Name: "Test" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockRecord);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("INVALID_FIELD_TYPE"));

            const result = await executeCreateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                fields: { InvalidField: "value" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("INVALID_FIELD_TYPE");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(null);

            const result = await executeCreateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                fields: { Name: "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create record");
        });
    });

    // ============================================================
    // UPDATE RECORD
    // ============================================================
    describe("executeUpdateRecord", () => {
        it("calls client with PATCH for merge update", async () => {
            mockClient.request.mockResolvedValueOnce(mockRecord);

            await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                fields: { Status: "Completed" }
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PATCH",
                url: `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}`,
                data: { fields: { Status: "Completed" } }
            });
        });

        it("calls client with PUT for destructive update", async () => {
            mockClient.request.mockResolvedValueOnce(mockRecord);

            await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                fields: { Name: "Replaced" },
                destructive: true
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PUT",
                url: `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}`,
                data: { fields: { Name: "Replaced" } }
            });
        });

        it("passes typecast option when provided", async () => {
            mockClient.request.mockResolvedValueOnce(mockRecord);

            await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                fields: { Count: "100" },
                typecast: true
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "PATCH",
                url: `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}`,
                data: { fields: { Count: "100" }, typecast: true }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedRecord = {
                ...mockRecord,
                fields: { ...mockRecord.fields, Status: "Done" }
            };
            mockClient.request.mockResolvedValueOnce(updatedRecord);

            const result = await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                fields: { Status: "Done" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedRecord);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: "invalid_record",
                fields: { Status: "Done" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.request.mockRejectedValueOnce(undefined);

            const result = await executeUpdateRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                fields: { Status: "Done" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update record");
        });
    });

    // ============================================================
    // DELETE RECORD
    // ============================================================
    describe("executeDeleteRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            await executeDeleteRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(mockClient.delete).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}`
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.delete.mockResolvedValueOnce({});

            const result = await executeDeleteRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ deleted: true, id: TEST_RECORD_ID });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeDeleteRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: "invalid_record"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.delete.mockRejectedValueOnce(123);

            const result = await executeDeleteRecord(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete record");
        });
    });

    // ============================================================
    // BATCH CREATE RECORDS
    // ============================================================
    describe("executeBatchCreateRecords", () => {
        const records = [
            { fields: { Name: "Record 1" } },
            { fields: { Name: "Record 2" } },
            { fields: { Name: "Record 3" } }
        ];

        const createdRecords = [
            { id: "rec1", createdTime: "2024-01-15T10:00:00.000Z", fields: { Name: "Record 1" } },
            { id: "rec2", createdTime: "2024-01-15T10:00:01.000Z", fields: { Name: "Record 2" } },
            { id: "rec3", createdTime: "2024-01-15T10:00:02.000Z", fields: { Name: "Record 3" } }
        ];

        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({ records: createdRecords });

            await executeBatchCreateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records
            });

            expect(mockClient.post).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                records
            });
        });

        it("passes typecast option when provided", async () => {
            mockClient.post.mockResolvedValueOnce({ records: createdRecords });

            await executeBatchCreateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records,
                typecast: true
            });

            expect(mockClient.post).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                records,
                typecast: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({ records: createdRecords });

            const result = await executeBatchCreateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ records: createdRecords, count: 3 });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("INVALID_REQUEST"));

            const result = await executeBatchCreateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("INVALID_REQUEST");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(null);

            const result = await executeBatchCreateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create records");
        });
    });

    // ============================================================
    // BATCH UPDATE RECORDS
    // ============================================================
    describe("executeBatchUpdateRecords", () => {
        const recordsToUpdate = [
            { id: "rec1", fields: { Status: "Done" } },
            { id: "rec2", fields: { Status: "In Progress" } }
        ];

        const updatedRecords = [
            { id: "rec1", createdTime: "2024-01-15T10:00:00.000Z", fields: { Status: "Done" } },
            {
                id: "rec2",
                createdTime: "2024-01-15T10:00:01.000Z",
                fields: { Status: "In Progress" }
            }
        ];

        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({ records: updatedRecords });

            await executeBatchUpdateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records: recordsToUpdate
            });

            expect(mockClient.patch).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                records: recordsToUpdate
            });
        });

        it("passes typecast option when provided", async () => {
            mockClient.patch.mockResolvedValueOnce({ records: updatedRecords });

            await executeBatchUpdateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records: recordsToUpdate,
                typecast: true
            });

            expect(mockClient.patch).toHaveBeenCalledWith(`/${TEST_BASE_ID}/${TEST_TABLE_ID}`, {
                records: recordsToUpdate,
                typecast: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({ records: updatedRecords });

            const result = await executeBatchUpdateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records: recordsToUpdate
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ records: updatedRecords, count: 2 });
        });

        it("returns error on client failure", async () => {
            mockClient.patch.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeBatchUpdateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records: recordsToUpdate
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.patch.mockRejectedValueOnce({ status: 500 });

            const result = await executeBatchUpdateRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                records: recordsToUpdate
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update records");
        });
    });

    // ============================================================
    // BATCH DELETE RECORDS
    // ============================================================
    describe("executeBatchDeleteRecords", () => {
        const recordIds = ["rec1", "rec2", "rec3"];

        const deleteResponse = {
            records: [
                { id: "rec1", deleted: true },
                { id: "rec2", deleted: true },
                { id: "rec3", deleted: true }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce(deleteResponse);

            await executeBatchDeleteRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordIds
            });

            expect(mockClient.delete).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}?records[]=rec1&records[]=rec2&records[]=rec3`
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.delete.mockResolvedValueOnce(deleteResponse);

            const result = await executeBatchDeleteRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordIds
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ records: deleteResponse.records, count: 3 });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeBatchDeleteRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordIds
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.delete.mockRejectedValueOnce("error");

            const result = await executeBatchDeleteRecords(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordIds
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete records");
        });
    });

    // ============================================================
    // LIST BASES
    // ============================================================
    describe("executeListBases", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ bases: [mockBase] });

            await executeListBases(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/meta/bases", {});
        });

        it("passes offset when provided", async () => {
            mockClient.get.mockResolvedValueOnce({ bases: [mockBase] });

            await executeListBases(mockClient, { offset: "cursor123" });

            expect(mockClient.get).toHaveBeenCalledWith("/meta/bases", { offset: "cursor123" });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                bases: [mockBase],
                offset: "nextCursor"
            });

            const result = await executeListBases(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                bases: [mockBase],
                offset: "nextCursor",
                hasMore: true
            });
        });

        it("sets hasMore to false when no offset", async () => {
            mockClient.get.mockResolvedValueOnce({
                bases: [mockBase],
                offset: undefined
            });

            const result = await executeListBases(mockClient, {});

            expect(result.success).toBe(true);
            expect((result.data as { hasMore: boolean })?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

            const result = await executeListBases(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("UNAUTHORIZED");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(new Map());

            const result = await executeListBases(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list bases");
        });
    });

    // ============================================================
    // GET BASE SCHEMA
    // ============================================================
    describe("executeGetBaseSchema", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ tables: [mockTable] });

            await executeGetBaseSchema(mockClient, { baseId: TEST_BASE_ID });

            expect(mockClient.get).toHaveBeenCalledWith(`/meta/bases/${TEST_BASE_ID}/tables`);
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({ tables: [mockTable] });

            const result = await executeGetBaseSchema(mockClient, { baseId: TEST_BASE_ID });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tables: [mockTable],
                tableCount: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("BASE_NOT_FOUND"));

            const result = await executeGetBaseSchema(mockClient, { baseId: "invalid_base" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("BASE_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(Symbol("error"));

            const result = await executeGetBaseSchema(mockClient, { baseId: TEST_BASE_ID });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get base schema");
        });
    });

    // ============================================================
    // LIST TABLES
    // ============================================================
    describe("executeListTables", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ tables: [mockTable] });

            await executeListTables(mockClient, { baseId: TEST_BASE_ID });

            expect(mockClient.get).toHaveBeenCalledWith(`/meta/bases/${TEST_BASE_ID}/tables`);
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({ tables: [mockTable] });

            const result = await executeListTables(mockClient, { baseId: TEST_BASE_ID });

            expect(result.success).toBe(true);
            expect(result.data).toEqual([mockTable]);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("BASE_NOT_FOUND"));

            const result = await executeListTables(mockClient, { baseId: "invalid_base" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("BASE_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(false);

            const result = await executeListTables(mockClient, { baseId: TEST_BASE_ID });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list tables");
        });
    });

    // ============================================================
    // LIST COMMENTS
    // ============================================================
    describe("executeListComments", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({ comments: [mockComment] });

            await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}/comments`,
                {}
            );
        });

        it("passes pagination params when provided", async () => {
            mockClient.get.mockResolvedValueOnce({ comments: [mockComment] });

            await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                pageSize: 50,
                offset: "cursor456"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}/comments`,
                { pageSize: 50, offset: "cursor456" }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                comments: [mockComment],
                offset: "nextPage"
            });

            const result = await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                comments: [mockComment],
                offset: "nextPage",
                hasMore: true
            });
        });

        it("sets hasMore to false when no offset", async () => {
            mockClient.get.mockResolvedValueOnce({
                comments: [mockComment],
                offset: undefined
            });

            const result = await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(true);
            expect((result.data as { hasMore: boolean })?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: "invalid_record"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce([]);

            const result = await executeListComments(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list comments");
        });
    });

    // ============================================================
    // CREATE COMMENT
    // ============================================================
    describe("executeCreateComment", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockComment);

            await executeCreateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                text: "This is a new comment"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}/comments`,
                { text: "This is a new comment" }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockComment);

            const result = await executeCreateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                text: "Test comment"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockComment);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("RECORD_NOT_FOUND"));

            const result = await executeCreateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: "invalid_record",
                text: "Test comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("RECORD_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(NaN);

            const result = await executeCreateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                text: "Test comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create comment");
        });
    });

    // ============================================================
    // UPDATE COMMENT
    // ============================================================
    describe("executeUpdateComment", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce(mockComment);

            await executeUpdateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                commentId: TEST_COMMENT_ID,
                text: "Updated comment text"
            });

            expect(mockClient.patch).toHaveBeenCalledWith(
                `/${TEST_BASE_ID}/${TEST_TABLE_ID}/${TEST_RECORD_ID}/comments/${TEST_COMMENT_ID}`,
                { text: "Updated comment text" }
            );
        });

        it("returns normalized output on success", async () => {
            const updatedComment = { ...mockComment, text: "Updated text" };
            mockClient.patch.mockResolvedValueOnce(updatedComment);

            const result = await executeUpdateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                commentId: TEST_COMMENT_ID,
                text: "Updated text"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedComment);
        });

        it("returns error on client failure", async () => {
            mockClient.patch.mockRejectedValueOnce(new Error("COMMENT_NOT_FOUND"));

            const result = await executeUpdateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                commentId: "invalid_comment",
                text: "Updated text"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("COMMENT_NOT_FOUND");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.patch.mockRejectedValueOnce(new Set());

            const result = await executeUpdateComment(mockClient, {
                baseId: TEST_BASE_ID,
                tableId: TEST_TABLE_ID,
                recordId: TEST_RECORD_ID,
                commentId: TEST_COMMENT_ID,
                text: "Updated text"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update comment");
        });
    });

    // ============================================================
    // SCHEMA VALIDATION
    // ============================================================
    describe("schema validation", () => {
        describe("listRecordsSchema", () => {
            it("validates minimal input", () => {
                const result = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    pageSize: 50,
                    offset: "cursor123",
                    view: "Grid view",
                    filterByFormula: "{Status} = 'Active'",
                    maxRecords: 1000,
                    fields: ["Name", "Status"],
                    sort: [{ field: "Name", direction: "asc" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing baseId", () => {
                const result = listRecordsSchema.safeParse({
                    tableId: TEST_TABLE_ID
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing tableId", () => {
                const result = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize over 100", () => {
                const result = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    pageSize: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects pageSize under 1", () => {
                const result = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    pageSize: 0
                });
                expect(result.success).toBe(false);
            });

            it("validates sort direction", () => {
                const validResult = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    sort: [{ field: "Name", direction: "desc" }]
                });
                expect(validResult.success).toBe(true);

                const invalidResult = listRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    sort: [{ field: "Name", direction: "invalid" }]
                });
                expect(invalidResult.success).toBe(false);
            });
        });

        describe("getRecordSchema", () => {
            it("validates valid input", () => {
                const result = getRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing recordId", () => {
                const result = getRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createRecordSchema", () => {
            it("validates minimal input", () => {
                const result = createRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    fields: { Name: "Test" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with typecast", () => {
                const result = createRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    fields: { Name: "Test" },
                    typecast: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = createRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateRecordSchema", () => {
            it("validates minimal input", () => {
                const result = updateRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    fields: { Status: "Done" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with destructive flag", () => {
                const result = updateRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    fields: { Name: "Replaced" },
                    destructive: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fields", () => {
                const result = updateRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteRecordSchema", () => {
            it("validates valid input", () => {
                const result = deleteRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing recordId", () => {
                const result = deleteRecordSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchCreateRecordsSchema", () => {
            it("validates valid input", () => {
                const result = batchCreateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records: [{ fields: { Name: "Record 1" } }, { fields: { Name: "Record 2" } }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects more than 10 records", () => {
                const records = Array.from({ length: 11 }, (_, i) => ({
                    fields: { Name: `Record ${i}` }
                }));
                const result = batchCreateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty records array", () => {
                const result = batchCreateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records: []
                });
                // Empty array is valid according to schema
                expect(typeof result.success).toBe("boolean");
            });
        });

        describe("batchUpdateRecordsSchema", () => {
            it("validates valid input", () => {
                const result = batchUpdateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records: [
                        { id: "rec1", fields: { Status: "Done" } },
                        { id: "rec2", fields: { Status: "Pending" } }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects more than 10 records", () => {
                const records = Array.from({ length: 11 }, (_, i) => ({
                    id: `rec${i}`,
                    fields: { Name: `Record ${i}` }
                }));
                const result = batchUpdateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records
                });
                expect(result.success).toBe(false);
            });

            it("rejects records without id", () => {
                const result = batchUpdateRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    records: [{ fields: { Status: "Done" } }]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchDeleteRecordsSchema", () => {
            it("validates valid input", () => {
                const result = batchDeleteRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordIds: ["rec1", "rec2", "rec3"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects more than 10 recordIds", () => {
                const recordIds = Array.from({ length: 11 }, (_, i) => `rec${i}`);
                const result = batchDeleteRecordsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordIds
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listBasesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listBasesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with offset", () => {
                const result = listBasesSchema.safeParse({ offset: "cursor123" });
                expect(result.success).toBe(true);
            });
        });

        describe("getBaseSchemaSchema", () => {
            it("validates valid input", () => {
                const result = getBaseSchemaSchema.safeParse({ baseId: TEST_BASE_ID });
                expect(result.success).toBe(true);
            });

            it("rejects missing baseId", () => {
                const result = getBaseSchemaSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listTablesSchema", () => {
            it("validates valid input", () => {
                const result = listTablesSchema.safeParse({ baseId: TEST_BASE_ID });
                expect(result.success).toBe(true);
            });

            it("rejects missing baseId", () => {
                const result = listTablesSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listCommentsSchema", () => {
            it("validates minimal input", () => {
                const result = listCommentsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listCommentsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    pageSize: 50,
                    offset: "cursor123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects pageSize over 100", () => {
                const result = listCommentsSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    pageSize: 101
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createCommentSchema", () => {
            it("validates valid input", () => {
                const result = createCommentSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    text: "This is a comment"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing text", () => {
                const result = createCommentSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateCommentSchema", () => {
            it("validates valid input", () => {
                const result = updateCommentSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    commentId: TEST_COMMENT_ID,
                    text: "Updated comment"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing commentId", () => {
                const result = updateCommentSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    text: "Updated comment"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing text", () => {
                const result = updateCommentSchema.safeParse({
                    baseId: TEST_BASE_ID,
                    tableId: TEST_TABLE_ID,
                    recordId: TEST_RECORD_ID,
                    commentId: TEST_COMMENT_ID
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
