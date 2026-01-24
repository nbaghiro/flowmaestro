/**
 * Folder Utils Tests
 *
 * Tests for folder utility functions including item checking
 * and recursive folder count calculations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API module
vi.mock("../api", () => ({
    getFolderContents: vi.fn()
}));

// Mock the logger
vi.mock("../logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

import type { FolderWithCounts } from "@flowmaestro/shared";
import { getFolderContents } from "../api";
import { checkItemsInFolder, getFolderCountIncludingSubfolders } from "../folderUtils";

// Mock data factories
function createMockFolder(overrides?: Record<string, unknown>): FolderWithCounts {
    const defaults = {
        id: "folder-123",
        name: "Test Folder",
        workspaceId: "workspace-123",
        parentId: null,
        path: "/Test Folder",
        depth: 0,
        itemCounts: {
            workflows: 5,
            agents: 3,
            formInterfaces: 2,
            chatInterfaces: 1,
            knowledgeBases: 4
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides } as FolderWithCounts;
}

function createMockFolderContentsResponse(overrides?: Record<string, unknown>) {
    const defaults = {
        success: true,
        data: {
            folder: {
                id: "folder-123",
                name: "Test Folder"
            },
            items: {
                workflows: [],
                agents: [],
                formInterfaces: [],
                chatInterfaces: [],
                knowledgeBases: []
            },
            subfolders: []
        }
    };

    if (overrides?.data) {
        return {
            ...defaults,
            data: { ...defaults.data, ...(overrides.data as Record<string, unknown>) }
        };
    }

    return { ...defaults, ...overrides };
}

describe("folderUtils", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ===== getFolderCountIncludingSubfolders =====
    describe("getFolderCountIncludingSubfolders", () => {
        it("returns count for folder with no children", () => {
            const folder = createMockFolder({ itemCounts: { workflows: 5 } });
            const getFolderChildren = vi.fn(() => []);

            const count = getFolderCountIncludingSubfolders(folder, "workflow", getFolderChildren);

            expect(count).toBe(5);
            expect(getFolderChildren).toHaveBeenCalledWith("folder-123");
        });

        it("sums counts from subfolders recursively", () => {
            const parentFolder = createMockFolder({
                id: "parent",
                itemCounts: {
                    workflows: 3,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const childFolder = createMockFolder({
                id: "child",
                itemCounts: {
                    workflows: 2,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const grandchildFolder = createMockFolder({
                id: "grandchild",
                itemCounts: {
                    workflows: 1,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });

            const getFolderChildren = vi.fn((folderId: string) => {
                if (folderId === "parent") return [childFolder];
                if (folderId === "child") return [grandchildFolder];
                return [];
            });

            const count = getFolderCountIncludingSubfolders(
                parentFolder,
                "workflow",
                getFolderChildren
            );

            expect(count).toBe(6); // 3 + 2 + 1
        });

        it("handles agent type", () => {
            const folder = createMockFolder({
                itemCounts: {
                    workflows: 0,
                    agents: 7,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const getFolderChildren = vi.fn(() => []);

            const count = getFolderCountIncludingSubfolders(folder, "agent", getFolderChildren);

            expect(count).toBe(7);
        });

        it("handles form-interface type", () => {
            const folder = createMockFolder({
                itemCounts: {
                    workflows: 0,
                    agents: 0,
                    formInterfaces: 4,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const getFolderChildren = vi.fn(() => []);

            const count = getFolderCountIncludingSubfolders(
                folder,
                "form-interface",
                getFolderChildren
            );

            expect(count).toBe(4);
        });

        it("handles chat-interface type", () => {
            const folder = createMockFolder({
                itemCounts: {
                    workflows: 0,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 8,
                    knowledgeBases: 0
                }
            });
            const getFolderChildren = vi.fn(() => []);

            const count = getFolderCountIncludingSubfolders(
                folder,
                "chat-interface",
                getFolderChildren
            );

            expect(count).toBe(8);
        });

        it("handles knowledge-base type", () => {
            const folder = createMockFolder({
                itemCounts: {
                    workflows: 0,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 10
                }
            });
            const getFolderChildren = vi.fn(() => []);

            const count = getFolderCountIncludingSubfolders(
                folder,
                "knowledge-base",
                getFolderChildren
            );

            expect(count).toBe(10);
        });

        it("handles multiple children at same level", () => {
            const parentFolder = createMockFolder({
                id: "parent",
                itemCounts: {
                    workflows: 1,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const child1 = createMockFolder({
                id: "child1",
                itemCounts: {
                    workflows: 2,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });
            const child2 = createMockFolder({
                id: "child2",
                itemCounts: {
                    workflows: 3,
                    agents: 0,
                    formInterfaces: 0,
                    chatInterfaces: 0,
                    knowledgeBases: 0
                }
            });

            const getFolderChildren = vi.fn((folderId: string) => {
                if (folderId === "parent") return [child1, child2];
                return [];
            });

            const count = getFolderCountIncludingSubfolders(
                parentFolder,
                "workflow",
                getFolderChildren
            );

            expect(count).toBe(6); // 1 + 2 + 3
        });
    });

    // ===== checkItemsInFolder =====
    describe("checkItemsInFolder", () => {
        it("returns not found when API fails", async () => {
            vi.mocked(getFolderContents).mockResolvedValue({
                success: false,
                error: "Not found"
            });

            const result = await checkItemsInFolder("folder-123", ["item-1"], "workflow");

            expect(result.found).toBe(false);
        });

        it("returns not found when folder data is missing", async () => {
            vi.mocked(getFolderContents).mockResolvedValue({
                success: true,
                data: null
            });

            const result = await checkItemsInFolder("folder-123", ["item-1"], "workflow");

            expect(result.found).toBe(false);
        });

        it("finds workflow in folder items", async () => {
            vi.mocked(getFolderContents).mockResolvedValue(
                createMockFolderContentsResponse({
                    data: {
                        folder: { id: "folder-123", name: "My Folder" },
                        items: {
                            workflows: [{ id: "wf-1" }, { id: "wf-2" }],
                            agents: [],
                            formInterfaces: [],
                            chatInterfaces: [],
                            knowledgeBases: []
                        },
                        subfolders: []
                    }
                })
            );

            const result = await checkItemsInFolder("folder-123", ["wf-1"], "workflow");

            expect(result.found).toBe(true);
            expect(result.folderName).toBe("My Folder");
            expect(result.folderId).toBe("folder-123");
            expect(result.isInMainFolder).toBe(true);
        });

        it("finds agent in folder items", async () => {
            vi.mocked(getFolderContents).mockResolvedValue(
                createMockFolderContentsResponse({
                    data: {
                        folder: { id: "folder-123", name: "Agents Folder" },
                        items: {
                            workflows: [],
                            agents: [{ id: "agent-1" }],
                            formInterfaces: [],
                            chatInterfaces: [],
                            knowledgeBases: []
                        },
                        subfolders: []
                    }
                })
            );

            const result = await checkItemsInFolder("folder-123", ["agent-1"], "agent");

            expect(result.found).toBe(true);
            expect(result.folderName).toBe("Agents Folder");
        });

        it("finds knowledge base in folder items", async () => {
            vi.mocked(getFolderContents).mockResolvedValue(
                createMockFolderContentsResponse({
                    data: {
                        folder: { id: "folder-123", name: "KB Folder" },
                        items: {
                            workflows: [],
                            agents: [],
                            formInterfaces: [],
                            chatInterfaces: [],
                            knowledgeBases: [{ id: "kb-1" }]
                        },
                        subfolders: []
                    }
                })
            );

            const result = await checkItemsInFolder("folder-123", ["kb-1"], "knowledge-base");

            expect(result.found).toBe(true);
        });

        it("returns not found when item not in folder", async () => {
            vi.mocked(getFolderContents).mockResolvedValue(
                createMockFolderContentsResponse({
                    data: {
                        folder: { id: "folder-123", name: "Empty Folder" },
                        items: {
                            workflows: [{ id: "other-wf" }],
                            agents: [],
                            formInterfaces: [],
                            chatInterfaces: [],
                            knowledgeBases: []
                        },
                        subfolders: []
                    }
                })
            );

            const result = await checkItemsInFolder("folder-123", ["wf-1"], "workflow");

            expect(result.found).toBe(false);
        });

        it("checks subfolders recursively", async () => {
            // First call for parent folder
            vi.mocked(getFolderContents)
                .mockResolvedValueOnce(
                    createMockFolderContentsResponse({
                        data: {
                            folder: { id: "parent", name: "Parent" },
                            items: {
                                workflows: [],
                                agents: [],
                                formInterfaces: [],
                                chatInterfaces: [],
                                knowledgeBases: []
                            },
                            subfolders: [{ id: "child" }]
                        }
                    })
                )
                // Second call for child folder
                .mockResolvedValueOnce(
                    createMockFolderContentsResponse({
                        data: {
                            folder: { id: "child", name: "Child Folder" },
                            items: {
                                workflows: [{ id: "wf-in-child" }],
                                agents: [],
                                formInterfaces: [],
                                chatInterfaces: [],
                                knowledgeBases: []
                            },
                            subfolders: []
                        }
                    })
                );

            const result = await checkItemsInFolder("parent", ["wf-in-child"], "workflow");

            expect(result.found).toBe(true);
            expect(result.folderName).toBe("Child Folder");
            expect(result.isInMainFolder).toBe(false);
        });

        it("handles API error gracefully", async () => {
            vi.mocked(getFolderContents).mockRejectedValue(new Error("Network error"));

            const result = await checkItemsInFolder("folder-123", ["item-1"], "workflow");

            expect(result.found).toBe(false);
        });

        it("checks multiple item IDs", async () => {
            vi.mocked(getFolderContents).mockResolvedValue(
                createMockFolderContentsResponse({
                    data: {
                        folder: { id: "folder-123", name: "Multi Folder" },
                        items: {
                            workflows: [{ id: "wf-2" }],
                            agents: [],
                            formInterfaces: [],
                            chatInterfaces: [],
                            knowledgeBases: []
                        },
                        subfolders: []
                    }
                })
            );

            // Should find if any of the IDs match
            const result = await checkItemsInFolder(
                "folder-123",
                ["wf-1", "wf-2", "wf-3"],
                "workflow"
            );

            expect(result.found).toBe(true);
        });
    });
});
