/**
 * Knowledge Base Store Tests
 *
 * Tests for knowledge base state management including CRUD operations,
 * document management, stats fetching, and querying.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    getKnowledgeBases: vi.fn(),
    getKnowledgeBase: vi.fn(),
    createKnowledgeBase: vi.fn(),
    updateKnowledgeBase: vi.fn(),
    deleteKnowledgeBase: vi.fn(),
    getKnowledgeBaseStats: vi.fn(),
    getKnowledgeDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    addUrlToKnowledgeBase: vi.fn(),
    queryKnowledgeBase: vi.fn(),
    deleteDocument: vi.fn(),
    reprocessDocument: vi.fn()
}));

import {
    getKnowledgeBases,
    getKnowledgeBase,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    getKnowledgeBaseStats,
    getKnowledgeDocuments,
    uploadDocument,
    addUrlToKnowledgeBase,
    queryKnowledgeBase,
    deleteDocument,
    reprocessDocument
} from "../../lib/api";
import { useKnowledgeBaseStore } from "../knowledgeBaseStore";

// Mock data factories
function createMockKnowledgeBase(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "kb-123",
        name: "Test Knowledge Base",
        description: "A test KB",
        workspaceId: "workspace-123",
        folderId: null,
        embeddingModel: "text-embedding-3-small",
        chunkingStrategy: "semantic",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

function createMockDocument(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "doc-123",
        knowledgeBaseId: "kb-123",
        name: "Test Document",
        sourceType: "file" as const,
        status: "processed" as const,
        chunkCount: 10,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

function createMockStats(overrides?: Record<string, unknown>) {
    const defaults = {
        totalDocuments: 5,
        totalChunks: 150,
        processingDocuments: 1,
        failedDocuments: 0,
        storageUsedBytes: 1024000
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    useKnowledgeBaseStore.setState({
        knowledgeBases: [],
        currentKB: null,
        currentDocuments: [],
        currentStats: null,
        loading: false,
        error: null
    });
}

describe("knowledgeBaseStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useKnowledgeBaseStore.getState();

            expect(state.knowledgeBases).toEqual([]);
            expect(state.currentKB).toBeNull();
            expect(state.currentDocuments).toEqual([]);
            expect(state.currentStats).toBeNull();
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Fetch Knowledge Bases =====
    describe("fetchKnowledgeBases", () => {
        it("fetches knowledge bases successfully", async () => {
            const mockKBs = [
                createMockKnowledgeBase({ id: "kb-1" }),
                createMockKnowledgeBase({ id: "kb-2" })
            ];

            vi.mocked(getKnowledgeBases).mockResolvedValue({
                success: true,
                data: mockKBs
            });

            await useKnowledgeBaseStore.getState().fetchKnowledgeBases();

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases).toHaveLength(2);
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it("passes folderId param to API", async () => {
            vi.mocked(getKnowledgeBases).mockResolvedValue({
                success: true,
                data: []
            });

            await useKnowledgeBaseStore.getState().fetchKnowledgeBases({
                folderId: "folder-123"
            });

            expect(getKnowledgeBases).toHaveBeenCalledWith({
                folderId: "folder-123"
            });
        });

        it("handles fetch error", async () => {
            vi.mocked(getKnowledgeBases).mockRejectedValue(new Error("Network error"));

            await useKnowledgeBaseStore.getState().fetchKnowledgeBases();

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Network error");
            expect(state.loading).toBe(false);
        });

        it("handles unsuccessful response", async () => {
            vi.mocked(getKnowledgeBases).mockResolvedValue({
                success: false,
                error: "Custom error"
            });

            await useKnowledgeBaseStore.getState().fetchKnowledgeBases();

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Custom error");
        });
    });

    // ===== Fetch Single Knowledge Base =====
    describe("fetchKnowledgeBase", () => {
        it("fetches single knowledge base successfully", async () => {
            const mockKB = createMockKnowledgeBase();

            vi.mocked(getKnowledgeBase).mockResolvedValue({
                success: true,
                data: mockKB
            });

            await useKnowledgeBaseStore.getState().fetchKnowledgeBase("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentKB).toEqual(mockKB);
            expect(state.loading).toBe(false);
        });

        it("handles fetch error", async () => {
            vi.mocked(getKnowledgeBase).mockResolvedValue({
                success: false,
                error: "Not found"
            });

            await useKnowledgeBaseStore.getState().fetchKnowledgeBase("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Not found");
            expect(state.currentKB).toBeNull();
        });
    });

    // ===== Create Knowledge Base =====
    describe("createKB", () => {
        it("creates knowledge base successfully", async () => {
            const newKB = createMockKnowledgeBase();

            vi.mocked(createKnowledgeBase).mockResolvedValue({
                success: true,
                data: newKB
            });

            const result = await useKnowledgeBaseStore.getState().createKB({
                name: "Test KB",
                description: "Description"
            });

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases).toHaveLength(1);
            expect(result).toEqual(newKB);
        });

        it("appends to existing knowledge bases", async () => {
            useKnowledgeBaseStore.setState({
                knowledgeBases: [createMockKnowledgeBase({ id: "existing" })]
            });

            const newKB = createMockKnowledgeBase({ id: "new-kb" });
            vi.mocked(createKnowledgeBase).mockResolvedValue({
                success: true,
                data: newKB
            });

            await useKnowledgeBaseStore.getState().createKB({
                name: "New KB"
            });

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases).toHaveLength(2);
        });

        it("handles create error", async () => {
            vi.mocked(createKnowledgeBase).mockRejectedValue(new Error("Create failed"));

            await expect(
                useKnowledgeBaseStore.getState().createKB({ name: "Test" })
            ).rejects.toThrow("Create failed");

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Create failed");
        });
    });

    // ===== Update Knowledge Base =====
    describe("updateKB", () => {
        it("updates knowledge base in list", async () => {
            useKnowledgeBaseStore.setState({
                knowledgeBases: [createMockKnowledgeBase({ name: "Original" })]
            });

            const updatedKB = createMockKnowledgeBase({ name: "Updated" });
            vi.mocked(updateKnowledgeBase).mockResolvedValue({
                success: true,
                data: updatedKB
            });

            await useKnowledgeBaseStore.getState().updateKB("kb-123", {
                name: "Updated"
            });

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases[0].name).toBe("Updated");
        });

        it("updates currentKB if it matches", async () => {
            const originalKB = createMockKnowledgeBase({ name: "Original" });
            useKnowledgeBaseStore.setState({
                knowledgeBases: [originalKB],
                currentKB: originalKB
            });

            const updatedKB = createMockKnowledgeBase({ name: "Updated" });
            vi.mocked(updateKnowledgeBase).mockResolvedValue({
                success: true,
                data: updatedKB
            });

            await useKnowledgeBaseStore.getState().updateKB("kb-123", {
                name: "Updated"
            });

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentKB?.name).toBe("Updated");
        });

        it("does not update currentKB if different", async () => {
            useKnowledgeBaseStore.setState({
                knowledgeBases: [createMockKnowledgeBase({ id: "kb-123" })],
                currentKB: createMockKnowledgeBase({ id: "kb-other", name: "Other" })
            });

            vi.mocked(updateKnowledgeBase).mockResolvedValue({
                success: true,
                data: createMockKnowledgeBase({ id: "kb-123", name: "Updated" })
            });

            await useKnowledgeBaseStore.getState().updateKB("kb-123", {
                name: "Updated"
            });

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentKB?.name).toBe("Other");
        });

        it("handles update error", async () => {
            vi.mocked(updateKnowledgeBase).mockRejectedValue(new Error("Update failed"));

            await expect(
                useKnowledgeBaseStore.getState().updateKB("kb-123", { name: "Test" })
            ).rejects.toThrow("Update failed");
        });
    });

    // ===== Delete Knowledge Base =====
    describe("deleteKB", () => {
        it("deletes knowledge base from list", async () => {
            useKnowledgeBaseStore.setState({
                knowledgeBases: [
                    createMockKnowledgeBase({ id: "kb-1" }),
                    createMockKnowledgeBase({ id: "kb-2" })
                ]
            });

            vi.mocked(deleteKnowledgeBase).mockResolvedValue({
                success: true
            });

            await useKnowledgeBaseStore.getState().deleteKB("kb-1");

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases).toHaveLength(1);
            expect(state.knowledgeBases[0].id).toBe("kb-2");
        });

        it("clears currentKB if it matches", async () => {
            const kb = createMockKnowledgeBase();
            useKnowledgeBaseStore.setState({
                knowledgeBases: [kb],
                currentKB: kb
            });

            vi.mocked(deleteKnowledgeBase).mockResolvedValue({
                success: true
            });

            await useKnowledgeBaseStore.getState().deleteKB("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentKB).toBeNull();
        });

        it("handles delete error", async () => {
            vi.mocked(deleteKnowledgeBase).mockRejectedValue(new Error("Delete failed"));

            await expect(useKnowledgeBaseStore.getState().deleteKB("kb-123")).rejects.toThrow(
                "Delete failed"
            );
        });
    });

    // ===== Fetch Stats =====
    describe("fetchStats", () => {
        it("fetches stats successfully", async () => {
            const mockStats = createMockStats();

            vi.mocked(getKnowledgeBaseStats).mockResolvedValue({
                success: true,
                data: mockStats
            });

            await useKnowledgeBaseStore.getState().fetchStats("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentStats).toEqual(mockStats);
        });

        it("handles stats fetch error", async () => {
            vi.mocked(getKnowledgeBaseStats).mockResolvedValue({
                success: false,
                error: "Stats not available"
            });

            await useKnowledgeBaseStore.getState().fetchStats("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Stats not available");
        });
    });

    // ===== Fetch Documents =====
    describe("fetchDocuments", () => {
        it("fetches documents successfully", async () => {
            const mockDocs = [
                createMockDocument({ id: "doc-1" }),
                createMockDocument({ id: "doc-2" })
            ];

            vi.mocked(getKnowledgeDocuments).mockResolvedValue({
                success: true,
                data: mockDocs
            });

            await useKnowledgeBaseStore.getState().fetchDocuments("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentDocuments).toHaveLength(2);
        });

        it("handles documents fetch error", async () => {
            vi.mocked(getKnowledgeDocuments).mockRejectedValue(new Error("Fetch failed"));

            await useKnowledgeBaseStore.getState().fetchDocuments("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Fetch failed");
        });
    });

    // ===== Upload Document =====
    describe("uploadDoc", () => {
        it("uploads document and refreshes list", async () => {
            const mockDocs = [createMockDocument()];

            vi.mocked(uploadDocument).mockResolvedValue({
                success: true
            });
            vi.mocked(getKnowledgeDocuments).mockResolvedValue({
                success: true,
                data: mockDocs
            });

            const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
            await useKnowledgeBaseStore.getState().uploadDoc("kb-123", mockFile);

            expect(uploadDocument).toHaveBeenCalledWith("kb-123", mockFile);
            expect(getKnowledgeDocuments).toHaveBeenCalledWith("kb-123");

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentDocuments).toHaveLength(1);
        });

        it("handles upload error", async () => {
            vi.mocked(uploadDocument).mockRejectedValue(new Error("Upload failed"));

            const mockFile = new File(["content"], "test.txt");
            await expect(
                useKnowledgeBaseStore.getState().uploadDoc("kb-123", mockFile)
            ).rejects.toThrow("Upload failed");
        });
    });

    // ===== Add URL =====
    describe("addUrl", () => {
        it("adds URL and refreshes documents", async () => {
            vi.mocked(addUrlToKnowledgeBase).mockResolvedValue({
                success: true
            });
            vi.mocked(getKnowledgeDocuments).mockResolvedValue({
                success: true,
                data: [createMockDocument({ sourceType: "url" })]
            });

            await useKnowledgeBaseStore
                .getState()
                .addUrl("kb-123", "https://example.com", "Example");

            expect(addUrlToKnowledgeBase).toHaveBeenCalledWith(
                "kb-123",
                "https://example.com",
                "Example"
            );
            expect(getKnowledgeDocuments).toHaveBeenCalled();
        });

        it("handles add URL error", async () => {
            vi.mocked(addUrlToKnowledgeBase).mockRejectedValue(new Error("Invalid URL"));

            await expect(
                useKnowledgeBaseStore.getState().addUrl("kb-123", "invalid")
            ).rejects.toThrow("Invalid URL");
        });
    });

    // ===== Delete Document =====
    describe("deleteDoc", () => {
        it("deletes document and refreshes list and stats", async () => {
            vi.mocked(deleteDocument).mockResolvedValue({
                success: true
            });
            vi.mocked(getKnowledgeDocuments).mockResolvedValue({
                success: true,
                data: []
            });
            vi.mocked(getKnowledgeBaseStats).mockResolvedValue({
                success: true,
                data: createMockStats({ totalDocuments: 0 })
            });

            await useKnowledgeBaseStore.getState().deleteDoc("kb-123", "doc-123");

            expect(deleteDocument).toHaveBeenCalledWith("kb-123", "doc-123");
            expect(getKnowledgeDocuments).toHaveBeenCalled();
            expect(getKnowledgeBaseStats).toHaveBeenCalled();
        });

        it("handles delete document error", async () => {
            vi.mocked(deleteDocument).mockRejectedValue(new Error("Delete failed"));

            await expect(
                useKnowledgeBaseStore.getState().deleteDoc("kb-123", "doc-123")
            ).rejects.toThrow("Delete failed");
        });
    });

    // ===== Reprocess Document =====
    describe("reprocessDoc", () => {
        it("reprocesses document and refreshes list", async () => {
            vi.mocked(reprocessDocument).mockResolvedValue({
                success: true
            });
            vi.mocked(getKnowledgeDocuments).mockResolvedValue({
                success: true,
                data: [createMockDocument({ status: "processing" })]
            });

            await useKnowledgeBaseStore.getState().reprocessDoc("kb-123", "doc-123");

            expect(reprocessDocument).toHaveBeenCalledWith("kb-123", "doc-123");
            expect(getKnowledgeDocuments).toHaveBeenCalled();
        });

        it("handles reprocess error", async () => {
            vi.mocked(reprocessDocument).mockRejectedValue(new Error("Reprocess failed"));

            await expect(
                useKnowledgeBaseStore.getState().reprocessDoc("kb-123", "doc-123")
            ).rejects.toThrow("Reprocess failed");
        });
    });

    // ===== Query =====
    describe("query", () => {
        it("queries knowledge base successfully", async () => {
            const mockResults = [
                { id: "chunk-1", content: "Result 1", score: 0.95, documentId: "doc-1" },
                { id: "chunk-2", content: "Result 2", score: 0.85, documentId: "doc-1" }
            ];

            vi.mocked(queryKnowledgeBase).mockResolvedValue({
                success: true,
                data: { results: mockResults }
            });

            const results = await useKnowledgeBaseStore.getState().query("kb-123", {
                query: "search term",
                limit: 10
            });

            expect(results).toHaveLength(2);
            expect(results[0].score).toBe(0.95);
        });

        it("handles query error", async () => {
            vi.mocked(queryKnowledgeBase).mockRejectedValue(new Error("Query failed"));

            await expect(
                useKnowledgeBaseStore.getState().query("kb-123", { query: "test" })
            ).rejects.toThrow("Query failed");

            const state = useKnowledgeBaseStore.getState();
            expect(state.error).toBe("Query failed");
        });
    });

    // ===== Clear Methods =====
    describe("clearError", () => {
        it("clears error state", () => {
            useKnowledgeBaseStore.setState({ error: "Some error" });

            useKnowledgeBaseStore.getState().clearError();

            expect(useKnowledgeBaseStore.getState().error).toBeNull();
        });
    });

    describe("clearCurrent", () => {
        it("clears current KB and related data", () => {
            useKnowledgeBaseStore.setState({
                currentKB: createMockKnowledgeBase(),
                currentDocuments: [createMockDocument()],
                currentStats: createMockStats()
            });

            useKnowledgeBaseStore.getState().clearCurrent();

            const state = useKnowledgeBaseStore.getState();
            expect(state.currentKB).toBeNull();
            expect(state.currentDocuments).toEqual([]);
            expect(state.currentStats).toBeNull();
        });

        it("does not affect knowledgeBases list", () => {
            useKnowledgeBaseStore.setState({
                knowledgeBases: [createMockKnowledgeBase()],
                currentKB: createMockKnowledgeBase()
            });

            useKnowledgeBaseStore.getState().clearCurrent();

            const state = useKnowledgeBaseStore.getState();
            expect(state.knowledgeBases).toHaveLength(1);
        });
    });
});
