/**
 * Web Search Handler Unit Tests
 *
 * Tests for the WebSearchNodeHandler which performs web searches
 * using the web_search builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { ContextSnapshot } from "../../../../../src/temporal/core/types";
import type { NodeHandlerInput } from "../../../../../src/temporal/activities/execution/types";

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../src/tools/builtin/web-search", () => ({
    webSearchTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../../src/temporal/core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    interpolateVariables: jest.fn((value: unknown, _context: unknown) => value),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import {
    WebSearchNodeHandler,
    createWebSearchNodeHandler
} from "../../../../../src/temporal/activities/execution/handlers/inputs/web-search";
import { interpolateVariables } from "../../../../../src/temporal/core";

// Helper to create mock context
function createMockContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
    return {
        workflowId: "test-workflow-id",
        executionId: "test-execution-id",
        variables: new Map(),
        nodeOutputs: new Map(),
        sharedMemory: new Map(),
        secrets: new Map(),
        loopStates: [],
        parallelStates: [],
        ...overrides
    } as ContextSnapshot;
}

// Helper to create mock input
function createMockInput(
    nodeConfig: JsonObject,
    contextOverrides: Partial<ContextSnapshot> = {}
): NodeHandlerInput {
    return {
        nodeType: "webSearch",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Web Search"
        }
    };
}

describe("WebSearchNodeHandler", () => {
    let handler: WebSearchNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new WebSearchNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("WebSearchNodeHandler");
            expect(handler.supportedNodeTypes).toContain("webSearch");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("webSearch")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createWebSearchNodeHandler();
            expect(instance).toBeInstanceOf(WebSearchNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should perform web search with query", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test query",
                        results: [
                            {
                                title: "Result 1",
                                url: "https://example.com/1",
                                snippet: "This is result 1"
                            },
                            {
                                title: "Result 2",
                                url: "https://example.com/2",
                                snippet: "This is result 2"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "test query",
                    outputVariable: "searchResults"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("searchResults");
                expect(result.result.searchResults).toEqual(
                    expect.objectContaining({
                        query: "test query",
                        results: expect.arrayContaining([
                            expect.objectContaining({ title: "Result 1" })
                        ])
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: "test query"
                    }),
                    expect.any(Object)
                );
            });

            it("should return search results with title, url, snippet", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "typescript guide",
                        results: [
                            {
                                title: "TypeScript Documentation",
                                url: "https://typescriptlang.org/docs",
                                snippet: "Official TypeScript documentation"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "typescript guide",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const searchData = result.result.result as {
                    results: Array<{ title: string; url: string; snippet: string }>;
                };
                expect(searchData.results[0]).toHaveProperty("title");
                expect(searchData.results[0]).toHaveProperty("url");
                expect(searchData.results[0]).toHaveProperty("snippet");
            });

            it("should interpolate variables in query", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{searchTerm}}") return "resolved search term";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "resolved search term",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "{{searchTerm}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: "resolved search term"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: [{ title: "Test", url: "https://test.com", snippet: "Test" }]
                    }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "mySearchResults"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("mySearchResults");
            });

            it("should respect maxResults limit", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: [
                            { title: "R1", url: "https://1.com", snippet: "1" },
                            { title: "R2", url: "https://2.com", snippet: "2" },
                            { title: "R3", url: "https://3.com", snippet: "3" }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "test",
                    maxResults: 3,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxResults: 3
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("search types", () => {
            it("should perform general web search", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "test",
                    searchType: "general",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchType: "general"
                    }),
                    expect.any(Object)
                );
            });

            it("should perform news search", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "latest news",
                        results: [
                            {
                                title: "Breaking News",
                                url: "https://news.com/article",
                                snippet: "Latest updates",
                                publishedDate: "2024-01-15"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "latest news",
                    searchType: "news",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchType: "news"
                    }),
                    expect.any(Object)
                );
            });

            it("should perform image search", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "cats",
                        results: [
                            {
                                title: "Cat image",
                                url: "https://images.com/cat.jpg",
                                snippet: "A cute cat"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "cats",
                    searchType: "images",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchType: "images"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("result handling", () => {
            it("should include published date when available", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "news",
                        results: [
                            {
                                title: "Article",
                                url: "https://example.com",
                                snippet: "Content",
                                publishedDate: "2024-01-15T12:00:00Z"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "news",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const searchData = result.result.result as {
                    results: Array<{ publishedDate?: string }>;
                };
                expect(searchData.results[0].publishedDate).toBe("2024-01-15T12:00:00Z");
            });

            it("should handle results without published date", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: [
                            {
                                title: "No Date Article",
                                url: "https://example.com",
                                snippet: "Content without date"
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const searchData = result.result.result as {
                    results: Array<{ publishedDate?: string }>;
                };
                expect(searchData.results[0].publishedDate).toBeUndefined();
            });

            it("should return empty results array for no matches", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "very obscure search term xyz123",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "very obscure search term xyz123",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const searchData = result.result.result as { results: unknown[] };
                expect(searchData.results).toEqual([]);
            });
        });

        describe("validation", () => {
            it("should throw error when query is missing", async () => {
                const input = createMockInput({
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when query is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    query: "{{nonStringQuery}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Search query is required");
            });

            it("should throw error when query resolves to empty string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce("");

                const input = createMockInput({
                    query: "{{emptyQuery}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Search query is required");
            });
        });

        describe("error handling", () => {
            it("should handle search API failures", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Search API unavailable" }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Search API unavailable");
            });

            it("should handle rate limiting", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Rate limit exceeded. Please try again later." }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Rate limit exceeded");
            });

            it("should handle quota exceeded", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "API quota exceeded for the day" }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("API quota exceeded");
            });
        });

        describe("edge cases", () => {
            it("should handle queries with special characters", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "C++ programming & memory",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "C++ programming & memory",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: "C++ programming & memory"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle queries with search operators", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: 'site:github.com "typescript" OR "javascript"',
                        results: []
                    }
                });

                const input = createMockInput({
                    query: 'site:github.com "typescript" OR "javascript"',
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: 'site:github.com "typescript" OR "javascript"'
                    }),
                    expect.any(Object)
                );
            });

            it("should handle unicode queries", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "日本語検索 🎉",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "日本語検索 🎉",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: "日本語検索 🎉"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "test"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass tool execution context correctly", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });
                input.metadata.userId = "user-123";
                input.metadata.executionId = "exec-456";

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "user-123",
                        mode: "workflow",
                        traceId: "exec-456"
                    })
                );
            });

            it("should use default userId when not provided", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        query: "test",
                        results: []
                    }
                });

                const input = createMockInput({
                    query: "test",
                    outputVariable: "result"
                });
                delete input.metadata.userId;

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "system"
                    })
                );
            });
        });
    });
});
