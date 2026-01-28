/**
 * Spreadsheet Generation Handler Unit Tests
 *
 * Tests for the SpreadsheetGenerationNodeHandler which generates Excel/CSV files
 * from data using the spreadsheet_generate builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../tools/builtin/spreadsheet-generate", () => ({
    spreadsheetGenerateTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    interpolateVariables: jest.fn((value: unknown, _context: unknown) => value),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core";
import {
    SpreadsheetGenerationNodeHandler,
    createSpreadsheetGenerationNodeHandler
} from "../outputs/spreadsheet-generation";

import type { ContextSnapshot } from "../../../../core/types";
import type { NodeHandlerInput } from "../../types";

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
        nodeType: "spreadsheetGeneration",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Spreadsheet Generation"
        }
    };
}

describe("SpreadsheetGenerationNodeHandler", () => {
    let handler: SpreadsheetGenerationNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new SpreadsheetGenerationNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("SpreadsheetGenerationNodeHandler");
            expect(handler.supportedNodeTypes).toContain("spreadsheetGeneration");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("spreadsheetGeneration")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createSpreadsheetGenerationNodeHandler();
            expect(instance).toBeInstanceOf(SpreadsheetGenerationNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should generate XLSX from array of objects", async () => {
                const testData = [
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 }
                ];

                (interpolateVariables as jest.Mock).mockReturnValueOnce(testData);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 5000,
                        sheetCount: 1,
                        rowCount: 2
                    }
                });

                const input = createMockInput({
                    dataSource: "{{userData}}",
                    format: "xlsx",
                    outputVariable: "spreadsheetResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("spreadsheetResult");
                expect(result.result.spreadsheetResult).toEqual(
                    expect.objectContaining({
                        filename: "data.xlsx",
                        format: "xlsx",
                        rowCount: 2
                    })
                );
            });

            it("should generate CSV from array of objects", async () => {
                const testData = [
                    { product: "Widget", price: 9.99 },
                    { product: "Gadget", price: 19.99 }
                ];

                (interpolateVariables as jest.Mock).mockReturnValueOnce(testData);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/products.csv",
                        filename: "products.csv",
                        format: "csv",
                        size: 100,
                        sheetCount: 1,
                        rowCount: 2
                    }
                });

                const input = createMockInput({
                    dataSource: "{{products}}",
                    format: "csv",
                    filename: "products",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        format: "csv"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in data source", async () => {
                const testData = [{ id: 1, value: "test" }];

                (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                    if (value === "{{myData}}") return testData;
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{myData}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: testData
                    }),
                    expect.any(Object)
                );
            });

            it("should parse JSON string data source", async () => {
                const jsonString = '[{"id": 1}, {"id": 2}]';

                (interpolateVariables as jest.Mock).mockReturnValueOnce(jsonString);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 2
                    }
                });

                const input = createMockInput({
                    dataSource: "{{jsonData}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ id: 1 }, { id: 2 }]
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/out.xlsx",
                        filename: "out.xlsx",
                        format: "xlsx",
                        size: 2000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "mySpreadsheet"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("mySpreadsheet");
            });

            it("should return file metadata (path, size, rowCount)", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { col1: "a" },
                    { col1: "b" },
                    { col1: "c" }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 8000,
                        sheetCount: 1,
                        rowCount: 3
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const spreadsheet = result.result.result as {
                    path: string;
                    size: number;
                    rowCount: number;
                };
                expect(spreadsheet.path).toBe("/workspace/data.xlsx");
                expect(spreadsheet.size).toBe(8000);
                expect(spreadsheet.rowCount).toBe(3);
            });
        });

        describe("data handling", () => {
            it("should handle string values", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { text: "Hello, World!" }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ text: "Hello, World!" }]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle number values", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { amount: 123.45, count: 100 }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ amount: 123.45, count: 100 }]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle boolean values", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { active: true, verified: false }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ active: true, verified: false }]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle null values", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { name: "Test", optional: null }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ name: "Test", optional: null }]
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("XLSX styling options", () => {
            it("should apply bold headers", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    headerBold: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        styling: expect.objectContaining({
                            headerStyle: expect.objectContaining({ bold: true })
                        })
                    }),
                    expect.any(Object)
                );
            });

            it("should apply header background color", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    headerBackgroundColor: "#4287f5",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        styling: expect.objectContaining({
                            headerStyle: expect.objectContaining({
                                backgroundColor: "#4287f5"
                            })
                        })
                    }),
                    expect.any(Object)
                );
            });

            it("should apply header font color", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    headerFontColor: "#ffffff",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        styling: expect.objectContaining({
                            headerStyle: expect.objectContaining({
                                fontColor: "#ffffff"
                            })
                        })
                    }),
                    expect.any(Object)
                );
            });

            it("should apply alternate row coloring", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }, { a: 2 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 2
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    alternateRows: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        styling: expect.objectContaining({
                            alternateRows: true
                        })
                    }),
                    expect.any(Object)
                );
            });

            it("should freeze header row", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    freezeHeader: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        styling: expect.objectContaining({
                            freezeHeader: true
                        })
                    }),
                    expect.any(Object)
                );
            });

            it("should use custom sheet name", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    sheetName: "Sales Data",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        sheets: expect.arrayContaining([
                            expect.objectContaining({ name: "Sales Data" })
                        ])
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("validation", () => {
            it("should throw error when data source is missing", async () => {
                const input = createMockInput({
                    format: "xlsx",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when data source is not an array", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce({ notAnArray: true });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Data source must be an array of objects"
                );
            });

            it("should throw error when JSON parsing fails", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce("invalid json {{{");

                const input = createMockInput({
                    dataSource: "{{badJson}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Failed to parse data source");
            });
        });

        describe("error handling", () => {
            it("should handle tool execution failures", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Spreadsheet generation failed" }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Spreadsheet generation failed"
                );
            });
        });

        describe("edge cases", () => {
            it("should handle single row", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { name: "Single", value: 1 }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/single.xlsx",
                        filename: "single.xlsx",
                        format: "xlsx",
                        size: 2000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ name: "Single", value: 1 }]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle inconsistent column keys", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { a: 1, b: 2 },
                    { a: 3, c: 4 },
                    { b: 5, d: 6 }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 4000,
                        sheetCount: 1,
                        rowCount: 3
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [
                            { a: 1, b: 2 },
                            { a: 3, c: 4 },
                            { b: 5, d: 6 }
                        ]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle unicode data", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([
                    { name: "你好", emoji: "🎉", arabic: "مرحبا" }
                ]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/unicode.xlsx",
                        filename: "unicode.xlsx",
                        format: "xlsx",
                        size: 3500,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: [{ name: "你好", emoji: "🎉", arabic: "مرحبا" }]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle result without output variable", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass tool execution context correctly", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce([{ a: 1 }]);

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.xlsx",
                        filename: "data.xlsx",
                        format: "xlsx",
                        size: 3000,
                        sheetCount: 1,
                        rowCount: 1
                    }
                });

                const input = createMockInput({
                    dataSource: "{{data}}",
                    format: "xlsx",
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
        });
    });
});
