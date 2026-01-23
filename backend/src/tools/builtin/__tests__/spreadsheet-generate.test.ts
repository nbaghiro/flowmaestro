/**
 * Spreadsheet Generate Tool Tests
 */

import { spreadsheetGenerateTool, spreadsheetGenerateInputSchema } from "../spreadsheet-generate";
import {
    createMockContext,
    assertSuccess,
    assertError,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";

describe("SpreadsheetGenerateTool", () => {
    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(spreadsheetGenerateTool, {
                name: "spreadsheet_generate",
                category: "data",
                riskLevel: "medium"
            });
        });

        it("has correct display name", () => {
            expect(spreadsheetGenerateTool.displayName).toBe("Generate Spreadsheet");
        });

        it("has correct tags", () => {
            expect(spreadsheetGenerateTool.tags).toContain("spreadsheet");
            expect(spreadsheetGenerateTool.tags).toContain("excel");
            expect(spreadsheetGenerateTool.tags).toContain("csv");
        });

        it("has credit cost defined", () => {
            expect(spreadsheetGenerateTool.creditCost).toBeGreaterThan(0);
        });

        it("is enabled by default", () => {
            expect(spreadsheetGenerateTool.enabledByDefault).toBe(true);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid xlsx input with data array", () => {
            const input = {
                data: [
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 }
                ],
                format: "xlsx",
                filename: "users"
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts valid csv input", () => {
            const input = {
                data: [{ col1: "value1", col2: "value2" }],
                format: "csv",
                filename: "export"
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts multi-sheet xlsx input", () => {
            const input = {
                sheets: [
                    {
                        name: "Sheet1",
                        data: [{ a: 1 }, { a: 2 }]
                    },
                    {
                        name: "Sheet2",
                        data: [{ b: 3 }, { b: 4 }]
                    }
                ],
                format: "xlsx"
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts input with column configuration", () => {
            const input = {
                sheets: [
                    {
                        name: "Report",
                        data: [{ firstName: "John", lastName: "Doe", salary: 50000 }],
                        columns: [
                            { key: "firstName", header: "First Name", width: 20 },
                            { key: "lastName", header: "Last Name", width: 20 },
                            { key: "salary", header: "Salary", format: "currency" }
                        ]
                    }
                ]
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("accepts input with styling options", () => {
            const input = {
                data: [{ name: "Test" }],
                styling: {
                    headerStyle: { bold: true, backgroundColor: "#4A90D9" },
                    alternateRows: true,
                    freezeHeader: true
                }
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { data: [{ test: 1 }] };
            const parsed = spreadsheetGenerateInputSchema.parse(input);
            expect(parsed.format).toBe("xlsx");
            expect(parsed.filename).toBe("spreadsheet");
        });

        it("rejects invalid format", () => {
            const input = {
                data: [{ a: 1 }],
                format: "pdf"
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects empty filename", () => {
            const input = {
                data: [{ a: 1 }],
                filename: ""
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects filename exceeding max length", () => {
            const input = {
                data: [{ a: 1 }],
                filename: "a".repeat(256)
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).toThrow();
        });

        it("rejects sheet name exceeding 31 characters", () => {
            const input = {
                sheets: [
                    {
                        name: "This sheet name is way too long for Excel",
                        data: [{ a: 1 }]
                    }
                ]
            };
            expect(() => spreadsheetGenerateInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with data array", async () => {
            const context = createMockContext();
            const params = {
                data: [
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 }
                ],
                format: "xlsx",
                filename: "users"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
            expect(result.data?.filename).toBe("users.xlsx");
            expect(result.data?.format).toBe("xlsx");
            expect(result.data?.rowCount).toBe(2);
            expect(result.data?.sheetCount).toBe(1);
        });

        it("executes successfully with CSV format", async () => {
            const context = createMockContext();
            const params = {
                data: [{ col1: "a", col2: "b" }],
                format: "csv",
                filename: "export"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.filename).toBe("export.csv");
            expect(result.data?.format).toBe("csv");
        });

        it("executes successfully with multiple sheets", async () => {
            const context = createMockContext();
            const params = {
                sheets: [
                    { name: "Data1", data: [{ x: 1 }, { x: 2 }] },
                    { name: "Data2", data: [{ y: 3 }] }
                ],
                format: "xlsx"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.sheetCount).toBe(2);
            expect(result.data?.rowCount).toBe(3);
        });

        it("fails when neither data nor sheets provided", async () => {
            const context = createMockContext();
            const params = {
                format: "xlsx",
                filename: "empty"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertError(result, "VALIDATION_ERROR");
        });
    });

    describe("output path", () => {
        it("generates correct output path for xlsx", async () => {
            const context = createMockContext();
            const params = {
                data: [{ a: 1 }],
                format: "xlsx",
                filename: "report"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/report.xlsx");
        });

        it("generates correct output path for csv", async () => {
            const context = createMockContext();
            const params = {
                data: [{ a: 1 }],
                format: "csv",
                filename: "data"
            };

            const result = await spreadsheetGenerateTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/data.csv");
        });
    });
});
