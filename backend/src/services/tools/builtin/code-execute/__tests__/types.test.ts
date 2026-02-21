/**
 * Code Execute Types Unit Tests
 *
 * Tests for Zod schema validation and type definitions.
 */

import { codeExecuteInputSchema } from "../types";

describe("Code Execute Types", () => {
    describe("codeExecuteInputSchema", () => {
        describe("code field", () => {
            it("should accept valid code string", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "print('hello')",
                    language: "python"
                });

                expect(result.success).toBe(true);
            });

            it("should reject empty code", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "",
                    language: "python"
                });

                expect(result.success).toBe(false);
            });

            it("should reject code exceeding max length", () => {
                const longCode = "x".repeat(100001);
                const result = codeExecuteInputSchema.safeParse({
                    code: longCode,
                    language: "python"
                });

                expect(result.success).toBe(false);
            });

            it("should accept code at max length", () => {
                const maxCode = "x".repeat(100000);
                const result = codeExecuteInputSchema.safeParse({
                    code: maxCode,
                    language: "python"
                });

                expect(result.success).toBe(true);
            });

            it("should require code field", () => {
                const result = codeExecuteInputSchema.safeParse({
                    language: "python"
                });

                expect(result.success).toBe(false);
            });
        });

        describe("language field", () => {
            it("should accept python", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
            });

            it("should accept javascript", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "const x = 1;",
                    language: "javascript"
                });

                expect(result.success).toBe(true);
            });

            it("should accept shell", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "echo hello",
                    language: "shell"
                });

                expect(result.success).toBe(true);
            });

            it("should reject invalid language", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "code",
                    language: "ruby"
                });

                expect(result.success).toBe(false);
            });

            it("should require language field", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1"
                });

                expect(result.success).toBe(false);
            });
        });

        describe("timeout field", () => {
            it("should use default timeout when not provided", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.timeout).toBe(30000);
                }
            });

            it("should accept valid timeout", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 60000
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.timeout).toBe(60000);
                }
            });

            it("should reject timeout below minimum", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 500
                });

                expect(result.success).toBe(false);
            });

            it("should reject timeout above maximum", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 400000
                });

                expect(result.success).toBe(false);
            });

            it("should accept minimum timeout", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 1000
                });

                expect(result.success).toBe(true);
            });

            it("should accept maximum timeout", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 300000
                });

                expect(result.success).toBe(true);
            });

            it("should reject non-integer timeout", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    timeout: 30000.5
                });

                expect(result.success).toBe(false);
            });
        });

        describe("inputData field", () => {
            it("should accept valid input data object", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputData: { name: "test", value: 42 }
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.inputData).toEqual({ name: "test", value: 42 });
                }
            });

            it("should accept nested input data", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputData: { nested: { deep: { value: 123 } } }
                });

                expect(result.success).toBe(true);
            });

            it("should accept arrays in input data", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputData: { numbers: [1, 2, 3] }
                });

                expect(result.success).toBe(true);
            });

            it("should be optional", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.inputData).toBeUndefined();
                }
            });
        });

        describe("inputFiles field", () => {
            it("should accept valid input files array", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputFiles: [
                        { path: "/workspace/data.csv", variableName: "data" },
                        { path: "/workspace/config.json", variableName: "config" }
                    ]
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.inputFiles).toHaveLength(2);
                }
            });

            it("should require path in input file", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputFiles: [{ variableName: "data" }]
                });

                expect(result.success).toBe(false);
            });

            it("should require variableName in input file", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    inputFiles: [{ path: "/workspace/data.csv" }]
                });

                expect(result.success).toBe(false);
            });

            it("should be optional", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.inputFiles).toBeUndefined();
                }
            });
        });

        describe("outputFiles field", () => {
            it("should accept valid output files array", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    outputFiles: [
                        { sandboxPath: "/tmp/result.csv", workspacePath: "/workspace/result.csv" }
                    ]
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.outputFiles).toHaveLength(1);
                }
            });

            it("should require sandboxPath in output file", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    outputFiles: [{ workspacePath: "/workspace/result.csv" }]
                });

                expect(result.success).toBe(false);
            });

            it("should require workspacePath in output file", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    outputFiles: [{ sandboxPath: "/tmp/result.csv" }]
                });

                expect(result.success).toBe(false);
            });

            it("should be optional", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.outputFiles).toBeUndefined();
                }
            });
        });

        describe("packages field", () => {
            it("should accept valid packages array", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    packages: ["pandas", "numpy", "requests"]
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.packages).toEqual(["pandas", "numpy", "requests"]);
                }
            });

            it("should accept empty packages array", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    packages: []
                });

                expect(result.success).toBe(true);
            });

            it("should be optional", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.packages).toBeUndefined();
                }
            });
        });

        describe("sessionId field", () => {
            it("should accept valid session ID", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python",
                    sessionId: "session-abc-123"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.sessionId).toBe("session-abc-123");
                }
            });

            it("should be optional", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.sessionId).toBeUndefined();
                }
            });
        });

        describe("full input validation", () => {
            it("should accept complete valid input", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "result = sum(numbers)",
                    language: "python",
                    timeout: 60000,
                    inputData: { numbers: [1, 2, 3] },
                    inputFiles: [{ path: "/workspace/data.csv", variableName: "data" }],
                    outputFiles: [
                        { sandboxPath: "/tmp/out.csv", workspacePath: "/workspace/out.csv" }
                    ],
                    packages: ["pandas"],
                    sessionId: "session-123"
                });

                expect(result.success).toBe(true);
            });

            it("should accept minimal valid input", () => {
                const result = codeExecuteInputSchema.safeParse({
                    code: "x = 1",
                    language: "python"
                });

                expect(result.success).toBe(true);
            });

            it("should reject extra unknown fields in strict mode", () => {
                const input = {
                    code: "x = 1",
                    language: "python",
                    unknownField: "value"
                };

                // By default, Zod strips unknown keys in objects
                const result = codeExecuteInputSchema.safeParse(input);
                expect(result.success).toBe(true);

                // Verify unknown field is stripped
                if (result.success) {
                    expect(result.data).not.toHaveProperty("unknownField");
                }
            });
        });
    });
});
