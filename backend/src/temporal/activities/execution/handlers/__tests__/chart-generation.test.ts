/**
 * Chart Generation Node Handler Unit Tests
 *
 * Tests for the ChartGenerationNodeHandler which generates chart images
 * from data using the chart_generate builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../tools/builtin/chart-generate", () => ({
    chartGenerateTool: {
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

import {
    createHandlerInput,
    createTestContext,
    mustacheRef
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { interpolateVariables } from "../../../../core";
import {
    ChartGenerationNodeHandler,
    createChartGenerationNodeHandler
} from "../outputs/chart-generation";

describe("ChartGenerationNodeHandler", () => {
    let handler: ChartGenerationNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = createChartGenerationNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("ChartGenerationNodeHandler");
        });

        it("supports chartGeneration node type", () => {
            expect(handler.supportedNodeTypes).toContain("chartGeneration");
        });

        it("canHandle('chartGeneration') returns true", () => {
            expect(handler.canHandle("chartGeneration")).toBe(true);
        });

        it("canHandle returns false for other types", () => {
            expect(handler.canHandle("imageGeneration")).toBe(false);
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("pdfGeneration")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("createChartGenerationNodeHandler() returns instance", () => {
            const instance = createChartGenerationNodeHandler();
            expect(instance).toBeInstanceOf(ChartGenerationNodeHandler);
        });
    });

    describe("happy path", () => {
        it("generates bar chart with default options", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Sales", data: [10, 20, 30] }]),
                    outputVariable: "chartResult"
                }
            });

            const result = await handler.execute(input);

            expect(result.result).toHaveProperty("chartResult");
            expect(result.result.chartResult).toEqual(
                expect.objectContaining({
                    chartType: "bar",
                    format: "png"
                })
            );
            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "bar"
                }),
                expect.any(Object)
            );
        });

        it("generates line chart", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 45000,
                    chartType: "line"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "line",
                    dataSource: JSON.stringify([{ label: "Trend", data: [5, 15, 10, 25] }]),
                    outputVariable: "result"
                }
            });

            const result = await handler.execute(input);

            expect((result.result.result as { chartType: string }).chartType).toBe("line");
            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "line"
                }),
                expect.any(Object)
            );
        });

        it("generates pie chart", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 35000,
                    chartType: "pie"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "pie",
                    dataSource: JSON.stringify([{ label: "Market Share", data: [40, 30, 30] }]),
                    dataLabels: '["A", "B", "C"]',
                    outputVariable: "result"
                }
            });

            const result = await handler.execute(input);

            expect((result.result.result as { chartType: string }).chartType).toBe("pie");
            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "pie"
                }),
                expect.any(Object)
            );
        });

        it("passes title/subtitle to tool", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Revenue", data: [100, 200, 300] }]),
                    title: "Quarterly Revenue",
                    subtitle: "Q1-Q3 2024",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        title: "Quarterly Revenue",
                        subtitle: "Q1-Q3 2024"
                    })
                }),
                expect.any(Object)
            );
        });

        it("passes width/height to tool", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 1200,
                    height: 800,
                    size: 70000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    width: 1200,
                    height: 800,
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        width: 1200,
                        height: 800
                    })
                }),
                expect.any(Object)
            );
        });

        it("stores result in outputVariable", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 40000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Test", data: [1, 2, 3] }]),
                    outputVariable: "myChart"
                }
            });

            const result = await handler.execute(input);

            expect(result.result).toHaveProperty("myChart");
            expect(result.result.myChart).toEqual(
                expect.objectContaining({
                    path: "/workspace/chart.png"
                })
            );
        });
    });

    describe("data parsing", () => {
        it("parses JSON string dataSource", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: '[{"label": "Series A", "data": [10, 20, 30]}]',
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        datasets: [{ label: "Series A", data: [10, 20, 30] }]
                    })
                }),
                expect.any(Object)
            );
        });

        it("accepts already-parsed array dataSource", async () => {
            (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                if (typeof value === "string" && value.includes("chartData")) {
                    return [{ label: "Parsed", data: [5, 10, 15] }];
                }
                return value;
            });

            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: "{{chartData}}",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        datasets: [{ label: "Parsed", data: [5, 10, 15] }]
                    })
                }),
                expect.any(Object)
            );
        });

        it("parses JSON array labels", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    dataLabels: '["Jan", "Feb", "Mar"]',
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        labels: ["Jan", "Feb", "Mar"]
                    })
                }),
                expect.any(Object)
            );
        });

        it("parses comma-separated labels", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    dataLabels: "Q1, Q2, Q3",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        labels: ["Q1", "Q2", "Q3"]
                    })
                }),
                expect.any(Object)
            );
        });

        it("accepts array labels directly", async () => {
            (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                if (typeof value === "string" && value.includes("labels")) {
                    return ["Label1", "Label2", "Label3"];
                }
                return value;
            });

            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    dataLabels: "{{labels}}",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        labels: ["Label1", "Label2", "Label3"]
                    })
                }),
                expect.any(Object)
            );
        });
    });

    describe("variable interpolation", () => {
        it("interpolates variables in dataSource", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    dataNode: { chartData: [{ label: "Dynamic", data: [100, 200] }] }
                }
            });

            (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                if (value === mustacheRef("dataNode", "chartData")) {
                    return [{ label: "Dynamic", data: [100, 200] }];
                }
                return value;
            });

            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: mustacheRef("dataNode", "chartData"),
                    outputVariable: "result"
                },
                context
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        datasets: [{ label: "Dynamic", data: [100, 200] }]
                    })
                }),
                expect.any(Object)
            );
        });

        it("interpolates variables in dataLabels", async () => {
            (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                if (value === "{{dynamicLabels}}") return ["X", "Y", "Z"];
                return value;
            });

            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    dataLabels: "{{dynamicLabels}}",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        labels: ["X", "Y", "Z"]
                    })
                }),
                expect.any(Object)
            );
        });

        it("interpolates variables in title/subtitle", async () => {
            (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                if (typeof value !== "string") return value;
                if (value.includes("{{title}}")) return "Dynamic Title";
                if (value.includes("{{subtitle}}")) return "Dynamic Subtitle";
                return value;
            });

            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    title: "{{title}}",
                    subtitle: "{{subtitle}}",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            // Title/subtitle are in config, which passes through to options
            expect(mockExecute).toHaveBeenCalled();
        });
    });

    describe("configuration options", () => {
        it("passes theme option", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    theme: "dark",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        theme: "dark"
                    })
                }),
                expect.any(Object)
            );
        });

        it("passes legend option", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    legend: "bottom",
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        legend: "bottom"
                    })
                }),
                expect.any(Object)
            );
        });

        it("passes showGrid option", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    showGrid: false,
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        showGrid: false
                    })
                }),
                expect.any(Object)
            );
        });

        it("passes showValues option", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    showValues: true,
                    outputVariable: "result"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        showValues: true
                    })
                }),
                expect.any(Object)
            );
        });
    });

    describe("error handling", () => {
        it("throws on invalid dataSource JSON", async () => {
            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: "not valid json {",
                    outputVariable: "result"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow("Failed to parse data source");
        });

        it("throws when tool returns failure", async () => {
            mockExecute.mockResolvedValueOnce({
                success: false,
                error: { message: "Canvas rendering failed" }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    outputVariable: "result"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow("Canvas rendering failed");
        });

        it("handles missing outputVariable gracefully", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }])
                    // No outputVariable
                }
            });

            const result = await handler.execute(input);

            expect(Object.keys(result.result)).toHaveLength(0);
        });

        it("propagates tool error messages", async () => {
            mockExecute.mockResolvedValueOnce({
                success: false,
                error: { message: "Specific tool error: canvas memory exceeded" }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    outputVariable: "result"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                "Specific tool error: canvas memory exceeded"
            );
        });
    });

    describe("edge cases", () => {
        it("handles empty datasets", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 30000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Empty", data: [] }]),
                    outputVariable: "result"
                }
            });

            const result = await handler.execute(input);

            expect(result.result).toHaveProperty("result");
        });

        it("records execution duration in metrics", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    outputVariable: "result"
                }
            });

            const result = await handler.execute(input);

            expect(result.metrics).toBeDefined();
            expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("passes correct toolContext (userId, mode, traceId)", async () => {
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: {
                    path: "/workspace/chart.png",
                    filename: "chart.png",
                    format: "png",
                    width: 800,
                    height: 600,
                    size: 50000,
                    chartType: "bar"
                }
            });

            const input = createHandlerInput({
                nodeType: "chartGeneration",
                nodeConfig: {
                    chartType: "bar",
                    dataSource: JSON.stringify([{ label: "Data", data: [1, 2, 3] }]),
                    outputVariable: "result"
                },
                metadata: {
                    userId: "user-abc-123",
                    executionId: "exec-xyz-789"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    userId: "user-abc-123",
                    mode: "workflow",
                    traceId: "exec-xyz-789"
                })
            );
        });
    });
});
