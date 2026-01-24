/**
 * KnowledgeDocumentRepository Tests
 *
 * Tests for knowledge document CRUD operations including status management,
 * processing state, and bulk operations.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { KnowledgeDocumentRepository } from "../KnowledgeDocumentRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateKnowledgeDocumentRow,
    generateId
} from "./setup";

describe("KnowledgeDocumentRepository", () => {
    let repository: KnowledgeDocumentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new KnowledgeDocumentRepository();
    });

    describe("create", () => {
        it("should insert a new document with all fields", async () => {
            const input = {
                knowledge_base_id: generateId(),
                name: "Test Document.pdf",
                source_type: "file" as const,
                file_path: "/uploads/test.pdf",
                file_type: "pdf" as const,
                file_size: BigInt(1024),
                metadata: { author: "Test Author" }
            };

            const mockRow = generateKnowledgeDocumentRow({
                knowledge_base_id: input.knowledge_base_id,
                name: input.name,
                source_type: input.source_type,
                file_path: input.file_path,
                file_type: input.file_type,
                file_size: Number(input.file_size),
                status: "pending"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.knowledge_documents"),
                expect.arrayContaining([
                    input.knowledge_base_id,
                    input.name,
                    input.source_type,
                    null, // source_url
                    input.file_path,
                    input.file_type,
                    input.file_size,
                    JSON.stringify(input.metadata),
                    "pending"
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.status).toBe("pending");
        });

        it("should insert a URL-based document", async () => {
            const input = {
                knowledge_base_id: generateId(),
                name: "External Article",
                source_type: "url" as const,
                source_url: "https://example.com/article",
                file_type: "html" as const
            };

            const mockRow = generateKnowledgeDocumentRow({
                knowledge_base_id: input.knowledge_base_id,
                name: input.name,
                source_type: "url",
                source_url: input.source_url,
                file_path: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.source_type).toBe("url");
            expect(result.source_url).toBe(input.source_url);
        });

        it("should use default values when not specified", async () => {
            const input = {
                knowledge_base_id: generateId(),
                name: "Basic Doc",
                source_type: "file" as const,
                file_type: "txt" as const
            };

            const mockRow = generateKnowledgeDocumentRow({
                knowledge_base_id: input.knowledge_base_id,
                metadata: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([null, null, JSON.stringify({}), "pending"])
            );
        });
    });

    describe("findById", () => {
        it("should return document when found", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({ id: documentId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                documentId
            ]);
            expect(result?.id).toBe(documentId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByKnowledgeBaseId", () => {
        it("should return paginated documents with total count", async () => {
            const knowledgeBaseId = generateId();
            const mockDocuments = [
                generateKnowledgeDocumentRow({ knowledge_base_id: knowledgeBaseId }),
                generateKnowledgeDocumentRow({ knowledge_base_id: knowledgeBaseId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockDocuments));

            const result = await repository.findByKnowledgeBaseId(knowledgeBaseId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.documents).toHaveLength(2);
        });

        it("should filter by status when provided", async () => {
            const knowledgeBaseId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateKnowledgeDocumentRow()]));

            await repository.findByKnowledgeBaseId(knowledgeBaseId, { status: "ready" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND status = $2"),
                expect.arrayContaining([knowledgeBaseId, "ready"])
            );
        });

        it("should use default pagination values", async () => {
            const knowledgeBaseId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByKnowledgeBaseId(knowledgeBaseId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([knowledgeBaseId, 50, 0])
            );
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                name: "Updated Document"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(documentId, { name: "Updated Document" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.knowledge_documents"),
                expect.arrayContaining(["Updated Document", documentId])
            );
            expect(result?.name).toBe("Updated Document");
        });

        it("should update content field", async () => {
            const documentId = generateId();
            const content = "Extracted document content...";
            const mockRow = generateKnowledgeDocumentRow({ id: documentId, content });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(documentId, { content });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("content = $"),
                expect.arrayContaining([content])
            );
        });

        it("should stringify metadata when updating", async () => {
            const documentId = generateId();
            const metadata = { processed: true, pages: 10 };
            const mockRow = generateKnowledgeDocumentRow({ id: documentId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(documentId, { metadata });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(metadata)])
            );
        });

        it("should return existing document when no updates provided", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({ id: documentId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(documentId, {});

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [documentId]);
            expect(result?.id).toBe(documentId);
        });

        it("should update status and error_message", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                status: "failed",
                error_message: "Processing failed"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(documentId, {
                status: "failed",
                error_message: "Processing failed"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining(["failed", "Processing failed", documentId])
            );
        });

        it("should update processing timestamps", async () => {
            const documentId = generateId();
            const startedAt = new Date();
            const completedAt = new Date();
            const mockRow = generateKnowledgeDocumentRow({ id: documentId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(documentId, {
                processing_started_at: startedAt,
                processing_completed_at: completedAt
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("processing_started_at = $"),
                expect.arrayContaining([startedAt, completedAt])
            );
        });
    });

    describe("delete", () => {
        it("should hard delete document and return true", async () => {
            const documentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(documentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.knowledge_documents"),
                [documentId]
            );
            expect(result).toBe(true);
        });

        it("should return false when document not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("updateStatus", () => {
        it("should update status to processing and set processing_started_at", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                status: "processing"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateStatus(documentId, "processing");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("processing_started_at = CURRENT_TIMESTAMP"),
                expect.arrayContaining(["processing"])
            );
            expect(result?.status).toBe("processing");
        });

        it("should update status to ready and set processing_completed_at", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                status: "ready"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateStatus(documentId, "ready");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("processing_completed_at = CURRENT_TIMESTAMP"),
                expect.arrayContaining(["ready"])
            );
            expect(result?.status).toBe("ready");
        });

        it("should update status to failed with error message", async () => {
            const documentId = generateId();
            const errorMessage = "Failed to extract text";
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                status: "failed",
                error_message: errorMessage
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateStatus(documentId, "failed", errorMessage);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("error_message = $"),
                expect.arrayContaining(["failed", errorMessage])
            );
            expect(result?.status).toBe("failed");
        });
    });

    describe("deleteByKnowledgeBaseId", () => {
        it("should delete all documents in knowledge base", async () => {
            const knowledgeBaseId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByKnowledgeBaseId(knowledgeBaseId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.knowledge_documents"),
                [knowledgeBaseId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE knowledge_base_id = $1"),
                [knowledgeBaseId]
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no documents found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByKnowledgeBaseId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const documentId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                created_at: now,
                updated_at: now,
                processing_started_at: now,
                processing_completed_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.processing_started_at).toBeInstanceOf(Date);
            expect(result?.processing_completed_at).toBeInstanceOf(Date);
        });

        it("should handle null processing dates", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                processing_started_at: null,
                processing_completed_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.processing_started_at).toBeNull();
            expect(result?.processing_completed_at).toBeNull();
        });

        it("should parse metadata from JSON string", async () => {
            const documentId = generateId();
            const metadata = { pages: 10, author: "Test" };
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.metadata).toEqual(metadata);
        });

        it("should handle metadata already parsed by pg", async () => {
            const documentId = generateId();
            const metadata = { pages: 10, author: "Test" };
            const mockRow = {
                ...generateKnowledgeDocumentRow({ id: documentId }),
                metadata // Already an object
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.metadata).toEqual(metadata);
        });

        it("should convert file_size to BigInt", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                file_size: 1073741824 // 1GB
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.file_size).toBe(BigInt(1073741824));
        });

        it("should handle null file_size", async () => {
            const documentId = generateId();
            const mockRow = generateKnowledgeDocumentRow({
                id: documentId,
                file_size: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(documentId);

            expect(result?.file_size).toBeNull();
        });
    });
});
