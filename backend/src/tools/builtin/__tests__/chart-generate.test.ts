/**
 * Chart Generate Tool Tests
 */

import { chartGenerateTool, chartGenerateInputSchema } from "../chart-generate";
import {
    createMockContext,
    assertSuccess,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";

describe("ChartGenerateTool", () => {
    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(chartGenerateTool, {
                name: "chart_generate",
                category: "data",
                riskLevel: "low"
            });
        });

        it("has correct display name", () => {
            expect(chartGenerateTool.displayName).toBe("Generate Chart");
        });

        it("has correct tags", () => {
            expect(chartGenerateTool.tags).toContain("chart");
            expect(chartGenerateTool.tags).toContain("visualization");
            expect(chartGenerateTool.tags).toContain("graph");
        });

        it("has credit cost defined", () => {
            expect(chartGenerateTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid bar chart input", () => {
            const input = {
                type: "bar",
                data: {
                    labels: ["Q1", "Q2", "Q3", "Q4"],
                    datasets: [{ label: "Sales", data: [100, 150, 200, 175] }]
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts valid line chart with multiple datasets", () => {
            const input = {
                type: "line",
                data: {
                    labels: ["Jan", "Feb", "Mar"],
                    datasets: [
                        { label: "2023", data: [10, 20, 30], color: "#3B82F6" },
                        { label: "2024", data: [15, 25, 35], color: "#EF4444" }
                    ]
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts pie chart without labels", () => {
            const input = {
                type: "pie",
                data: {
                    datasets: [{ label: "Distribution", data: [30, 40, 30] }]
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all valid chart types", () => {
            const chartTypes = [
                "bar",
                "line",
                "pie",
                "scatter",
                "area",
                "donut",
                "histogram",
                "heatmap",
                "horizontal_bar"
            ];

            for (const type of chartTypes) {
                const input = {
                    type,
                    data: {
                        datasets: [{ label: "Test", data: [1, 2, 3] }]
                    }
                };
                expect(() => chartGenerateInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts input with all options", () => {
            const input = {
                type: "bar",
                data: {
                    labels: ["A", "B"],
                    datasets: [{ label: "Data", data: [1, 2] }]
                },
                options: {
                    title: "My Chart",
                    subtitle: "A subtitle",
                    xAxisLabel: "Categories",
                    yAxisLabel: "Values",
                    width: 1200,
                    height: 800,
                    legend: "top",
                    theme: "dark",
                    format: "svg",
                    showGrid: false,
                    showValues: true
                },
                filename: "my_chart"
            };
            expect(() => chartGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when options not provided", () => {
            const input = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1, 2] }]
                }
            };
            const parsed = chartGenerateInputSchema.parse(input);
            expect(parsed.filename).toBe("chart");
        });

        it("rejects invalid chart type", () => {
            const input = {
                type: "radar",
                data: {
                    datasets: [{ label: "Test", data: [1, 2] }]
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects missing datasets", () => {
            const input = {
                type: "bar",
                data: {
                    labels: ["A", "B"]
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid width", () => {
            const input = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1] }]
                },
                options: {
                    width: 100 // Below minimum of 200
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid theme", () => {
            const input = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1] }]
                },
                options: {
                    theme: "blue"
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid format", () => {
            const input = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1] }]
                },
                options: {
                    format: "jpg"
                }
            };
            expect(() => chartGenerateInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with bar chart", async () => {
            const context = createMockContext();
            const params = {
                type: "bar",
                data: {
                    labels: ["A", "B", "C"],
                    datasets: [{ label: "Values", data: [10, 20, 30] }]
                },
                filename: "bar_chart"
            };

            const result = await chartGenerateTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
            expect(result.data?.chartType).toBe("bar");
            expect(result.data?.filename).toBe("bar_chart.png");
        });

        it("executes successfully with SVG format (converts to PNG)", async () => {
            const context = createMockContext();
            const params = {
                type: "line",
                data: {
                    datasets: [{ label: "Line", data: [1, 2, 3] }]
                },
                options: {
                    format: "svg"
                }
            };

            const result = await chartGenerateTool.execute(params, context);

            assertSuccess(result);
            // Chart.js doesn't support SVG natively, so it outputs PNG
            expect(result.data?.format).toBe("png");
            expect(result.data?.filename).toContain(".svg");
        });

        it("executes with custom dimensions", async () => {
            const context = createMockContext();
            const params = {
                type: "pie",
                data: {
                    labels: ["A", "B", "C"],
                    datasets: [{ label: "Pie", data: [33, 33, 34] }]
                },
                options: {
                    width: 1000,
                    height: 1000
                }
            };

            const result = await chartGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.width).toBe(1000);
            expect(result.data?.height).toBe(1000);
        });
    });

    describe("output path", () => {
        it("generates correct output path for PNG", async () => {
            const context = createMockContext();
            const params = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1] }]
                },
                filename: "my_chart"
            };

            const result = await chartGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/my_chart.png");
        });

        it("generates correct output path for SVG", async () => {
            const context = createMockContext();
            const params = {
                type: "bar",
                data: {
                    datasets: [{ label: "Test", data: [1] }]
                },
                options: { format: "svg" },
                filename: "vector_chart"
            };

            const result = await chartGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/vector_chart.svg");
        });
    });
});
