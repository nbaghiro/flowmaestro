/**
 * KnowledgeBaseRepository Tests
 *
 * Tests for knowledge base CRUD operations including config merging,
 * folder filtering, and stats aggregation.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { KnowledgeBaseRepository } from "../KnowledgeBaseRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateKnowledgeBaseRow,
    generateId
} from "./setup";

describe("KnowledgeBaseRepository", () => {
    let repository: KnowledgeBaseRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new KnowledgeBaseRepository();
    });

    describe("create", () => {
        it("should insert a new knowledge base with default config", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "My Knowledge Base"
            };

            const mockRow = generateKnowledgeBaseRow({
                ...input,
                config: JSON.stringify({
                    embeddingModel: "text-embedding-3-small",
                    embeddingProvider: "openai",
                    chunkSize: 1000,
                    chunkOverlap: 200,
                    embeddingDimensions: 1536
                })
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.knowledge_bases"),
                expect.arrayContaining([input.user_id, input.workspace_id, input.name])
            );
            expect(result.name).toBe(input.name);
            expect(result.config.embeddingModel).toBe("text-embedding-3-small");
        });

        it("should merge custom config with defaults", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Custom KB",
                config: {
                    chunkSize: 500,
                    chunkOverlap: 100
                }
            };

            const mockRow = generateKnowledgeBaseRow({
                ...input,
                config: JSON.stringify({
                    embeddingModel: "text-embedding-3-small",
                    embeddingProvider: "openai",
                    chunkSize: 500,
                    chunkOverlap: 100,
                    embeddingDimensions: 1536
                })
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.config.chunkSize).toBe(500);
            expect(result.config.chunkOverlap).toBe(100);
            expect(result.config.embeddingModel).toBe("text-embedding-3-small");
        });

        it("should handle description", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Described KB",
                description: "A knowledge base for testing"
            };

            const mockRow = generateKnowledgeBaseRow(input);

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.description).toBe(input.description);
        });
    });

    describe("findById", () => {
        it("should return knowledge base when found", async () => {
            const kbId = generateId();
            const mockRow = generateKnowledgeBaseRow({ id: kbId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(kbId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                kbId
            ]);
            expect(result?.id).toBe(kbId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse config from string", async () => {
            const kbId = generateId();
            const config = {
                embeddingModel: "custom-model",
                chunkSize: 2000
            };
            const mockRow = generateKnowledgeBaseRow({
                id: kbId,
                config: JSON.stringify(config)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(kbId);

            expect(result?.config).toEqual(config);
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find knowledge base by id and workspace id", async () => {
            const kbId = generateId();
            const workspaceId = generateId();
            const mockRow = generateKnowledgeBaseRow({ id: kbId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(kbId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND workspace_id = $2"),
                [kbId, workspaceId]
            );
            expect(result?.id).toBe(kbId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated knowledge bases with total count", async () => {
            const workspaceId = generateId();
            const mockKBs = [generateKnowledgeBaseRow(), generateKnowledgeBaseRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockKBs));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.knowledgeBases).toHaveLength(2);
        });

        it("should apply folder filter when folderId is provided", async () => {
            const workspaceId = generateId();
            const folderId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateKnowledgeBaseRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("$2 = ANY(COALESCE(folder_ids"),
                expect.arrayContaining([workspaceId, folderId])
            );
        });

        it("should filter for root-level items when folderId is null", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateKnowledgeBaseRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("folder_ids IS NULL OR folder_ids = ARRAY[]::UUID[]"),
                expect.arrayContaining([workspaceId])
            );
        });
    });

    describe("update", () => {
        it("should update name and description", async () => {
            const kbId = generateId();
            const mockRow = generateKnowledgeBaseRow({
                id: kbId,
                name: "Updated Name",
                description: "Updated description"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(kbId, {
                name: "Updated Name",
                description: "Updated description"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.knowledge_bases"),
                expect.arrayContaining(["Updated Name", "Updated description", kbId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should merge config when updating", async () => {
            const kbId = generateId();
            const existingConfig = {
                embeddingModel: "text-embedding-3-small",
                chunkSize: 1000
            };
            const newConfig = { chunkSize: 500 };
            const mergedConfig = { ...existingConfig, ...newConfig };

            // findById for existing config
            mockQuery.mockResolvedValueOnce(
                mockRows([
                    generateKnowledgeBaseRow({
                        id: kbId,
                        config: JSON.stringify(existingConfig)
                    })
                ])
            );
            // update
            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateKnowledgeBaseRow({
                        id: kbId,
                        config: JSON.stringify(mergedConfig)
                    })
                ])
            );

            const result = await repository.update(kbId, { config: newConfig });

            expect(result?.config.chunkSize).toBe(500);
            expect(result?.config.embeddingModel).toBe("text-embedding-3-small");
        });

        it("should return existing knowledge base when only updated_at changes", async () => {
            const kbId = generateId();
            const mockRow = generateKnowledgeBaseRow({ id: kbId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(kbId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.knowledge_bases"),
                [kbId]
            );
            expect(result?.id).toBe(kbId);
        });
    });

    describe("delete", () => {
        it("should hard delete knowledge base and return true", async () => {
            const kbId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(kbId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.knowledge_bases"),
                [kbId]
            );
            expect(result).toBe(true);
        });

        it("should return false when knowledge base not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("getStats", () => {
        it("should return aggregated statistics", async () => {
            const kbId = generateId();
            const now = new Date().toISOString();

            mockQuery.mockResolvedValueOnce(
                mockRows([
                    {
                        id: kbId,
                        name: "Test KB",
                        document_count: "10",
                        chunk_count: "500",
                        total_size_bytes: "1048576",
                        last_updated: now
                    }
                ])
            );

            const result = await repository.getStats(kbId);

            expect(result).not.toBeNull();
            expect(result?.document_count).toBe(10);
            expect(result?.chunk_count).toBe(500);
            expect(result?.total_size_bytes).toBe(1048576);
            expect(result?.last_updated).toBeInstanceOf(Date);
        });

        it("should return null when knowledge base not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getStats("non-existent");

            expect(result).toBeNull();
        });

        it("should handle zero counts", async () => {
            const kbId = generateId();
            const now = new Date().toISOString();

            mockQuery.mockResolvedValueOnce(
                mockRows([
                    {
                        id: kbId,
                        name: "Empty KB",
                        document_count: "0",
                        chunk_count: "0",
                        total_size_bytes: "0",
                        last_updated: now
                    }
                ])
            );

            const result = await repository.getStats(kbId);

            expect(result?.document_count).toBe(0);
            expect(result?.chunk_count).toBe(0);
            expect(result?.total_size_bytes).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const kbId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateKnowledgeBaseRow({
                id: kbId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(kbId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
        });

        it("should handle config as object (already parsed by pg)", async () => {
            const kbId = generateId();
            const config = { embeddingModel: "test", chunkSize: 500 };
            const mockRow = {
                ...generateKnowledgeBaseRow({ id: kbId }),
                config // Already an object, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(kbId);

            expect(result?.config).toEqual(config);
        });
    });
});
