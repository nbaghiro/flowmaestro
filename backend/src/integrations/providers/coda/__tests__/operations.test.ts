/**
 * Coda Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeAddRow, addRowSchema } from "../operations/addRow";
import { executeGetTables, getTablesSchema } from "../operations/getTables";
import { executeListDocs, listDocsSchema } from "../operations/listDocs";
import type { CodaClient } from "../client/CodaClient";
import type { CodaDocsResponse, CodaTablesResponse, CodaAddRowResponse } from "../operations/types";

// Mock CodaClient factory
function createMockCodaClient(): jest.Mocked<CodaClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<CodaClient>;
}

describe("Coda Operation Executors", () => {
    let mockClient: jest.Mocked<CodaClient>;

    beforeEach(() => {
        mockClient = createMockCodaClient();
    });

    describe("executeListDocs", () => {
        it("calls client with default params", async () => {
            const mockResponse: CodaDocsResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListDocs(mockClient, { limit: 100 });

            expect(mockClient.get).toHaveBeenCalledWith("/docs", { limit: 100 });
        });

        it("calls client with custom limit", async () => {
            const mockResponse: CodaDocsResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListDocs(mockClient, { limit: 50 });

            expect(mockClient.get).toHaveBeenCalledWith("/docs", { limit: 50 });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: CodaDocsResponse = {
                items: [
                    {
                        id: "AbCDeFGH",
                        type: "doc",
                        href: "https://coda.io/apis/v1/docs/AbCDeFGH",
                        browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                        name: "Q1 2024 Product Roadmap",
                        owner: "sarah@example.com",
                        ownerName: "Sarah Chen",
                        createdAt: "2024-01-05T09:30:00.000Z",
                        updatedAt: "2024-01-28T14:22:15.000Z"
                    },
                    {
                        id: "IjKLmNoP",
                        type: "doc",
                        href: "https://coda.io/apis/v1/docs/IjKLmNoP",
                        browserLink: "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP",
                        name: "Engineering Team Wiki",
                        owner: "marcus@example.com",
                        ownerName: "Marcus Johnson",
                        createdAt: "2023-11-12T16:45:00.000Z",
                        updatedAt: "2024-01-27T11:08:42.000Z"
                    }
                ],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListDocs(mockClient, { limit: 100 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                documents: [
                    {
                        id: "AbCDeFGH",
                        name: "Q1 2024 Product Roadmap",
                        owner: "Sarah Chen",
                        browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                        createdAt: "2024-01-05T09:30:00.000Z",
                        updatedAt: "2024-01-28T14:22:15.000Z"
                    },
                    {
                        id: "IjKLmNoP",
                        name: "Engineering Team Wiki",
                        owner: "Marcus Johnson",
                        browserLink: "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP",
                        createdAt: "2023-11-12T16:45:00.000Z",
                        updatedAt: "2024-01-27T11:08:42.000Z"
                    }
                ],
                nextPageToken: undefined
            });
        });

        it("returns nextPageToken when pagination available", async () => {
            const mockResponse: CodaDocsResponse = {
                items: [
                    {
                        id: "AbCDeFGH",
                        type: "doc",
                        href: "https://coda.io/apis/v1/docs/AbCDeFGH",
                        browserLink: "https://coda.io/d/Test_dAbCDeFGH",
                        name: "Test Doc",
                        owner: "test@example.com",
                        ownerName: "Test User",
                        createdAt: "2024-01-01T00:00:00.000Z",
                        updatedAt: "2024-01-01T00:00:00.000Z"
                    }
                ],
                nextPageToken: "eyJsYXN0SWQiOiJBYkNEZUZHSCJ9"
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListDocs(mockClient, { limit: 1 });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("nextPageToken", "eyJsYXN0SWQiOiJBYkNEZUZHSCJ9");
        });

        it("handles empty documents list", async () => {
            const mockResponse: CodaDocsResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListDocs(mockClient, { limit: 100 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                documents: [],
                nextPageToken: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Coda API key is invalid or expired"));

            const result = await executeListDocs(mockClient, { limit: 100 });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Coda API key is invalid or expired");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListDocs(mockClient, { limit: 100 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list documents");
        });

        it("handles rate limit errors", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Rate limited. Please try again later.")
            );

            const result = await executeListDocs(mockClient, { limit: 100 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Rate limited. Please try again later.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetTables", () => {
        it("calls client with correct params", async () => {
            const mockResponse: CodaTablesResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeGetTables(mockClient, { docId: "AbCDeFGH", limit: 100 });

            expect(mockClient.get).toHaveBeenCalledWith("/docs/AbCDeFGH/tables", { limit: 100 });
        });

        it("calls client with custom limit", async () => {
            const mockResponse: CodaTablesResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeGetTables(mockClient, { docId: "AbCDeFGH", limit: 50 });

            expect(mockClient.get).toHaveBeenCalledWith("/docs/AbCDeFGH/tables", { limit: 50 });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: CodaTablesResponse = {
                items: [
                    {
                        id: "grid-tasks",
                        type: "table",
                        href: "https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-tasks",
                        browserLink:
                            "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks",
                        name: "Tasks",
                        parent: {
                            id: "AbCDeFGH",
                            type: "doc",
                            href: "https://coda.io/apis/v1/docs/AbCDeFGH",
                            browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                            name: "Q1 2024 Product Roadmap"
                        }
                    },
                    {
                        id: "grid-milestones",
                        type: "table",
                        href: "https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-milestones",
                        browserLink:
                            "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Milestones_tugrid-milestones",
                        name: "Milestones",
                        parent: {
                            id: "AbCDeFGH",
                            type: "doc",
                            href: "https://coda.io/apis/v1/docs/AbCDeFGH",
                            browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                            name: "Q1 2024 Product Roadmap"
                        }
                    }
                ],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTables(mockClient, { docId: "AbCDeFGH", limit: 100 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tables: [
                    {
                        id: "grid-tasks",
                        name: "Tasks",
                        browserLink:
                            "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks"
                    },
                    {
                        id: "grid-milestones",
                        name: "Milestones",
                        browserLink:
                            "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Milestones_tugrid-milestones"
                    }
                ],
                nextPageToken: undefined
            });
        });

        it("returns nextPageToken when pagination available", async () => {
            const mockResponse: CodaTablesResponse = {
                items: [
                    {
                        id: "grid-tasks",
                        type: "table",
                        href: "https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-tasks",
                        browserLink:
                            "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks",
                        name: "Tasks",
                        parent: {
                            id: "AbCDeFGH",
                            type: "doc",
                            href: "https://coda.io/apis/v1/docs/AbCDeFGH",
                            browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                            name: "Q1 2024 Product Roadmap"
                        }
                    }
                ],
                nextPageToken: "eyJsYXN0SWQiOiJncmlkLXRhc2tzIn0"
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTables(mockClient, { docId: "AbCDeFGH", limit: 1 });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("nextPageToken", "eyJsYXN0SWQiOiJncmlkLXRhc2tzIn0");
        });

        it("handles empty tables list", async () => {
            const mockResponse: CodaTablesResponse = {
                items: [],
                nextPageToken: undefined
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeGetTables(mockClient, {
                docId: "EmptyDoc123",
                limit: 100
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tables: [],
                nextPageToken: undefined
            });
        });

        it("returns error on document not found", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Resource not found. Check document or table ID.")
            );

            const result = await executeGetTables(mockClient, {
                docId: "NonexistentDoc",
                limit: 100
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found. Check document or table ID.");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on permission denied", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Permission denied. Check API key permissions.")
            );

            const result = await executeGetTables(mockClient, {
                docId: "PrivateDoc456",
                limit: 100
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied. Check API key permissions.");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce({ weird: "error" });

            const result = await executeGetTables(mockClient, { docId: "AbCDeFGH", limit: 100 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get tables");
        });
    });

    describe("executeAddRow", () => {
        it("calls client with correct params", async () => {
            const mockResponse: CodaAddRowResponse = {
                requestId: "req-abc123def456",
                addedRowIds: ["i-row-a1b2c3d4e5"]
            };
            mockClient.post.mockResolvedValueOnce(mockResponse);

            await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-tasks",
                cells: {
                    "Task Name": "Implement user authentication",
                    Status: "Not Started",
                    Priority: "High"
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/docs/AbCDeFGH/tables/grid-tasks/rows", {
                rows: [
                    {
                        cells: [
                            { column: "Task Name", value: "Implement user authentication" },
                            { column: "Status", value: "Not Started" },
                            { column: "Priority", value: "High" }
                        ]
                    }
                ]
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: CodaAddRowResponse = {
                requestId: "req-abc123def456",
                addedRowIds: ["i-row-a1b2c3d4e5"]
            };
            mockClient.post.mockResolvedValueOnce(mockResponse);

            const result = await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-tasks",
                cells: {
                    "Task Name": "Test task"
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                requestId: "req-abc123def456",
                rowIds: ["i-row-a1b2c3d4e5"]
            });
        });

        it("handles multiple cell types correctly", async () => {
            const mockResponse: CodaAddRowResponse = {
                requestId: "req-multi123",
                addedRowIds: ["i-row-multi456"]
            };
            mockClient.post.mockResolvedValueOnce(mockResponse);

            await executeAddRow(mockClient, {
                docId: "IjKLmNoP",
                tableId: "grid-onboarding",
                cells: {
                    "Employee Name": "Chris Park",
                    "Completed Orientation": true,
                    "Completed Security Training": false,
                    "Days Since Start": 5,
                    "Completion Percentage": 45.5,
                    Tags: ["new-hire", "engineering"]
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/docs/IjKLmNoP/tables/grid-onboarding/rows",
                {
                    rows: [
                        {
                            cells: [
                                { column: "Employee Name", value: "Chris Park" },
                                { column: "Completed Orientation", value: true },
                                { column: "Completed Security Training", value: false },
                                { column: "Days Since Start", value: 5 },
                                { column: "Completion Percentage", value: 45.5 },
                                { column: "Tags", value: ["new-hire", "engineering"] }
                            ]
                        }
                    ]
                }
            );
        });

        it("returns error on document not found", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Resource not found. Check document or table ID.")
            );

            const result = await executeAddRow(mockClient, {
                docId: "NonexistentDoc",
                tableId: "grid-tasks",
                cells: { "Task Name": "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found. Check document or table ID.");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on table not found", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Resource not found. Check document or table ID.")
            );

            const result = await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-nonexistent",
                cells: { "Task Name": "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found. Check document or table ID.");
        });

        it("returns error on permission denied", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Permission denied. Check API key permissions.")
            );

            const result = await executeAddRow(mockClient, {
                docId: "ReadOnlyDoc789",
                tableId: "grid-tasks",
                cells: { "Task Name": "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied. Check API key permissions.");
        });

        it("returns error on rate limit", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Rate limited. Please try again later.")
            );

            const result = await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-tasks",
                cells: { "Task Name": "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Rate limited. Please try again later.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(null);

            const result = await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-tasks",
                cells: { "Task Name": "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to add row");
        });

        it("handles API validation errors", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error('Coda API error: Unknown column: "NonexistentColumn"')
            );

            const result = await executeAddRow(mockClient, {
                docId: "AbCDeFGH",
                tableId: "grid-tasks",
                cells: {
                    NonexistentColumn: "value",
                    "Task Name": "Test"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe(
                'Coda API error: Unknown column: "NonexistentColumn"'
            );
        });
    });

    describe("schema validation", () => {
        describe("listDocsSchema", () => {
            it("validates empty input with defaults", () => {
                const result = listDocsSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(100);
                }
            });

            it("validates with custom limit", () => {
                const result = listDocsSchema.safeParse({ limit: 50 });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(50);
                }
            });

            it("rejects limit below minimum", () => {
                const result = listDocsSchema.safeParse({ limit: 0 });
                expect(result.success).toBe(false);
            });

            it("rejects limit above maximum", () => {
                const result = listDocsSchema.safeParse({ limit: 501 });
                expect(result.success).toBe(false);
            });

            it("rejects negative limit", () => {
                const result = listDocsSchema.safeParse({ limit: -1 });
                expect(result.success).toBe(false);
            });

            it("applies default limit when not provided", () => {
                const result = listDocsSchema.parse({});
                expect(result.limit).toBe(100);
            });
        });

        describe("getTablesSchema", () => {
            it("validates minimal input", () => {
                const result = getTablesSchema.safeParse({ docId: "AbCDeFGH" });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getTablesSchema.safeParse({
                    docId: "AbCDeFGH",
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing docId", () => {
                const result = getTablesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects limit below minimum", () => {
                const result = getTablesSchema.safeParse({
                    docId: "AbCDeFGH",
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit above maximum", () => {
                const result = getTablesSchema.safeParse({
                    docId: "AbCDeFGH",
                    limit: 501
                });
                expect(result.success).toBe(false);
            });

            it("applies default limit when not provided", () => {
                const result = getTablesSchema.parse({ docId: "AbCDeFGH" });
                expect(result.limit).toBe(100);
            });
        });

        describe("addRowSchema", () => {
            it("validates minimal input", () => {
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: { "Task Name": "Test" }
                });
                expect(result.success).toBe(true);
            });

            it("validates input with multiple cells", () => {
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test",
                        Status: "Not Started",
                        Priority: "High",
                        "Estimated Hours": 8
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates input with various value types", () => {
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        Name: "Test",
                        Count: 42,
                        Active: true,
                        Tags: ["a", "b"],
                        Score: 3.14
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing docId", () => {
                const result = addRowSchema.safeParse({
                    tableId: "grid-tasks",
                    cells: { "Task Name": "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing tableId", () => {
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    cells: { "Task Name": "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing cells", () => {
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks"
                });
                expect(result.success).toBe(false);
            });

            it("accepts empty cells object", () => {
                // Note: empty cells may be valid at schema level but rejected by API
                const result = addRowSchema.safeParse({
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {}
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
