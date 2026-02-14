/**
 * Tests for PersonaInstanceDeliverableRepository
 */

const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaInstanceDeliverableRepository } from "../PersonaInstanceDeliverableRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaInstanceDeliverableRow,
    generateId
} from "./setup";

describe("PersonaInstanceDeliverableRepository", () => {
    let repository: PersonaInstanceDeliverableRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaInstanceDeliverableRepository();
    });

    describe("create", () => {
        it("should create a markdown deliverable with content", async () => {
            const instanceId = generateId();
            const content = "# Research Report\n\nThis is the analysis.";
            const input = {
                instance_id: instanceId,
                name: "Research Report",
                description: "Comprehensive analysis",
                type: "markdown" as const,
                content
            };

            const mockRow = generatePersonaInstanceDeliverableRow({
                instance_id: instanceId,
                name: "Research Report",
                description: "Comprehensive analysis",
                type: "markdown",
                content,
                preview: content,
                file_size_bytes: Buffer.byteLength(content, "utf8")
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_instance_deliverables"),
                [
                    instanceId,
                    "Research Report",
                    "Comprehensive analysis",
                    "markdown",
                    content,
                    null, // file_url
                    expect.any(Number), // file_size_bytes calculated from content
                    null, // file_extension
                    expect.any(String) // preview
                ]
            );
            expect(result.instance_id).toBe(instanceId);
            expect(result.type).toBe("markdown");
            expect(result.content).toBe(content);
        });

        it("should create a deliverable with file_url", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                name: "Generated PDF",
                type: "pdf" as const,
                file_url: "gs://bucket/reports/report.pdf",
                file_size_bytes: 102400,
                file_extension: "pdf"
            };

            const mockRow = generatePersonaInstanceDeliverableRow({
                instance_id: instanceId,
                name: "Generated PDF",
                type: "pdf",
                content: null,
                file_url: input.file_url,
                file_size_bytes: 102400,
                file_extension: "pdf",
                preview: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.file_url).toBe("gs://bucket/reports/report.pdf");
            expect(result.content).toBeNull();
        });

        it("should generate preview for markdown content", async () => {
            const instanceId = generateId();
            const longContent = "# Title\n\n" + "Lorem ipsum ".repeat(100);
            const input = {
                instance_id: instanceId,
                name: "Long Document",
                type: "markdown" as const,
                content: longContent
            };

            const mockRow = generatePersonaInstanceDeliverableRow({
                preview: longContent.substring(0, 500) + "..."
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            const queryCall = mockQuery.mock.calls[0];
            const previewArg = queryCall[1][8];
            expect(previewArg).toContain("...");
            expect(previewArg.length).toBeLessThanOrEqual(503); // 500 + "..."
        });

        it("should generate preview for CSV showing first lines", async () => {
            const instanceId = generateId();
            const csvContent = [
                "name,age,city",
                "Alice,30,NYC",
                "Bob,25,LA",
                "Charlie,35,Chicago",
                "David,28,Houston",
                "Eve,32,Phoenix",
                "Frank,40,Seattle"
            ].join("\n");

            const input = {
                instance_id: instanceId,
                name: "Data Export",
                type: "csv" as const,
                content: csvContent
            };

            const expectedPreview =
                "name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago\nDavid,28,Houston\n...";

            const mockRow = generatePersonaInstanceDeliverableRow({
                type: "csv",
                preview: expectedPreview
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            const queryCall = mockQuery.mock.calls[0];
            const previewArg = queryCall[1][8];
            expect(previewArg).toContain("name,age,city");
            expect(previewArg).toContain("...");
        });

        it("should generate pretty-printed preview for JSON", async () => {
            const instanceId = generateId();
            const jsonContent = JSON.stringify({ name: "Test", data: [1, 2, 3] });
            const input = {
                instance_id: instanceId,
                name: "JSON Data",
                type: "json" as const,
                content: jsonContent
            };

            const mockRow = generatePersonaInstanceDeliverableRow({ type: "json" });
            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            const queryCall = mockQuery.mock.calls[0];
            const previewArg = queryCall[1][8];
            // Pretty-printed JSON should have newlines
            expect(previewArg).toContain("\n");
        });

        it("should return null preview for PDF type", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                name: "Document",
                type: "pdf" as const,
                file_url: "gs://bucket/doc.pdf"
            };

            const mockRow = generatePersonaInstanceDeliverableRow({
                type: "pdf",
                preview: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            const queryCall = mockQuery.mock.calls[0];
            const previewArg = queryCall[1][8];
            expect(previewArg).toBeNull();
        });
    });

    describe("findById", () => {
        it("should return deliverable when found", async () => {
            const id = generateId();
            const mockRow = generatePersonaInstanceDeliverableRow({ id });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.persona_instance_deliverables WHERE id = $1"),
                [id]
            );
            expect(result).not.toBeNull();
            expect(result?.id).toBe(id);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByInstanceId", () => {
        it("should return all deliverables ordered by created_at ASC", async () => {
            const instanceId = generateId();
            const mockDeliverables = [
                generatePersonaInstanceDeliverableRow({
                    instance_id: instanceId,
                    name: "First"
                }),
                generatePersonaInstanceDeliverableRow({
                    instance_id: instanceId,
                    name: "Second"
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockDeliverables));

            const result = await repository.findByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                [instanceId]
            );
            expect(result).toHaveLength(2);
        });

        it("should return empty array when no deliverables", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceId("instance-id");

            expect(result).toEqual([]);
        });
    });

    describe("getSummariesByInstanceId", () => {
        it("should return summaries without full content", async () => {
            const instanceId = generateId();
            const createdAt = new Date();
            const mockSummaries = [
                {
                    id: generateId(),
                    name: "Report",
                    description: "A report",
                    type: "markdown",
                    file_size_bytes: 1024,
                    file_extension: null,
                    preview: "# Preview",
                    created_at: createdAt
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockSummaries));

            const result = await repository.getSummariesByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT id, name, description, type, file_size_bytes, file_extension, preview, created_at"),
                [instanceId]
            );
            expect(result).toHaveLength(1);
            expect(result[0]).not.toHaveProperty("content");
            expect(result[0]).not.toHaveProperty("file_url");
            expect(result[0].created_at).toBe(createdAt.toISOString());
        });

        it("should return empty array when no deliverables", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getSummariesByInstanceId("instance-id");

            expect(result).toEqual([]);
        });
    });

    describe("getContent", () => {
        it("should return content and file_url for a deliverable", async () => {
            const id = generateId();
            const mockData = {
                content: "# Report content",
                file_url: null,
                type: "markdown"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockData]));

            const result = await repository.getContent(id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT content, file_url, type"),
                [id]
            );
            expect(result).toEqual(mockData);
        });

        it("should return file_url for file-based deliverable", async () => {
            const id = generateId();
            const mockData = {
                content: null,
                file_url: "gs://bucket/file.pdf",
                type: "pdf"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockData]));

            const result = await repository.getContent(id);

            expect(result?.file_url).toBe("gs://bucket/file.pdf");
            expect(result?.content).toBeNull();
        });

        it("should return null when deliverable not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getContent("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("update", () => {
        it("should update name", async () => {
            const id = generateId();
            const mockRow = generatePersonaInstanceDeliverableRow({
                id,
                name: "Updated Name"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(id, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET name = $1"),
                ["Updated Name", id]
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should update content and regenerate preview", async () => {
            const id = generateId();
            const newContent = "# New Content";
            const mockRow = generatePersonaInstanceDeliverableRow({
                id,
                content: newContent,
                preview: newContent
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(id, { content: newContent });

            // Should have content, preview, and file_size_bytes in SET clause
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("content = $1"),
                expect.arrayContaining([newContent])
            );
            expect(result?.content).toBe(newContent);
        });

        it("should return original when no updates provided", async () => {
            const id = generateId();
            const mockRow = generatePersonaInstanceDeliverableRow({ id });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(id, {});

            // Should call findById instead of update
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.persona_instance_deliverables WHERE id"),
                [id]
            );
            expect(result).not.toBeNull();
        });

        it("should return null when deliverable not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.update("non-existent", { name: "New Name" });

            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        it("should delete a deliverable and return true", async () => {
            const id = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_instance_deliverables WHERE id = $1"),
                [id]
            );
            expect(result).toBe(true);
        });

        it("should return false when deliverable not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("deleteByInstanceId", () => {
        it("should delete all deliverables for an instance", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_instance_deliverables WHERE instance_id = $1"),
                [instanceId]
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no deliverables to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("countByInstanceId", () => {
        it("should return count of deliverables", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockCountResult(3));

            const result = await repository.countByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT COUNT(*) as count"),
                [instanceId]
            );
            expect(result).toBe(3);
        });

        it("should return 0 when no deliverables", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should preserve all fields in mapping", async () => {
            const createdAt = new Date();
            const mockRow = generatePersonaInstanceDeliverableRow({
                name: "Test",
                description: "Description",
                type: "code",
                content: "console.log('test')",
                file_url: null,
                file_size_bytes: 20,
                file_extension: "js",
                preview: "console.log...",
                created_at: createdAt
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(mockRow.id);

            expect(result?.name).toBe("Test");
            expect(result?.description).toBe("Description");
            expect(result?.type).toBe("code");
            expect(result?.content).toBe("console.log('test')");
            expect(result?.file_url).toBeNull();
            expect(result?.file_size_bytes).toBe(20);
            expect(result?.file_extension).toBe("js");
            expect(result?.preview).toBe("console.log...");
        });
    });
});
