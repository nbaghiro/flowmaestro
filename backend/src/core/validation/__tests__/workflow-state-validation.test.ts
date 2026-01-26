/**
 * Workflow State Validation Tests
 *
 * Tests for workflow input, output, and context validation utilities.
 */

import { z } from "zod";
import {
    formatWorkflowZodErrors,
    formatWorkflowValidationMessage,
    validateWorkflowInputs,
    validateWorkflowOutputs,
    validateWorkflowContext,
    createValidatedWorkflow,
    CommonWorkflowSchemas,
    CommonWorkflowOutputSchemas,
    type WorkflowValidationError,
    type ValidatedWorkflowDefinition
} from "../workflow-state-validation";

// Helper to create a minimal workflow definition
function createWorkflowDefinition(
    stateSchema?: ValidatedWorkflowDefinition["stateSchema"]
): ValidatedWorkflowDefinition {
    return {
        name: "Test Workflow",
        nodes: {},
        edges: [],
        entryPoint: "start",
        stateSchema
    };
}

describe("Workflow State Validation", () => {
    // ========================================================================
    // formatWorkflowZodErrors Tests
    // ========================================================================

    describe("formatWorkflowZodErrors", () => {
        it("should format Zod errors with path and message", () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            const result = schema.safeParse({ name: 123, age: "invalid" });
            expect(result.success).toBe(false);

            if (!result.success) {
                const errors = formatWorkflowZodErrors(result.error);

                expect(errors.length).toBe(2);
                expect(errors[0]).toHaveProperty("path");
                expect(errors[0]).toHaveProperty("message");
                expect(errors[0]).toHaveProperty("code");
            }
        });

        it("should handle nested path errors", () => {
            const schema = z.object({
                user: z.object({
                    profile: z.object({
                        email: z.string().email()
                    })
                })
            });

            const result = schema.safeParse({
                user: { profile: { email: "not-an-email" } }
            });

            if (!result.success) {
                const errors = formatWorkflowZodErrors(result.error);

                expect(errors[0].path).toBe("user.profile.email");
            }
        });

        it("should handle array index in path", () => {
            const schema = z.object({
                items: z.array(z.string())
            });

            const result = schema.safeParse({ items: ["valid", 123, "also-valid"] });

            if (!result.success) {
                const errors = formatWorkflowZodErrors(result.error);

                expect(errors[0].path).toContain("items");
                expect(errors[0].path).toContain("1");
            }
        });

        it("should include error code", () => {
            const schema = z.string().min(5);
            const result = schema.safeParse("abc");

            if (!result.success) {
                const errors = formatWorkflowZodErrors(result.error);

                expect(errors[0].code).toBe("too_small");
            }
        });
    });

    // ========================================================================
    // formatWorkflowValidationMessage Tests
    // ========================================================================

    describe("formatWorkflowValidationMessage", () => {
        it("should return default message for empty errors", () => {
            const message = formatWorkflowValidationMessage([]);

            expect(message).toBe("Workflow validation failed");
        });

        it("should format single error", () => {
            const errors: WorkflowValidationError[] = [
                { path: "email", message: "Invalid email format", code: "invalid_string" }
            ];

            const message = formatWorkflowValidationMessage(errors);

            expect(message).toContain("Workflow validation errors:");
            expect(message).toContain("email: Invalid email format");
        });

        it("should format multiple errors", () => {
            const errors: WorkflowValidationError[] = [
                { path: "name", message: "Required", code: "invalid_type" },
                { path: "age", message: "Must be a number", code: "invalid_type" },
                { path: "email", message: "Invalid email", code: "invalid_string" }
            ];

            const message = formatWorkflowValidationMessage(errors);

            expect(message).toContain("name: Required");
            expect(message).toContain("age: Must be a number");
            expect(message).toContain("email: Invalid email");
        });

        it("should handle errors without path", () => {
            const errors: WorkflowValidationError[] = [
                { path: "", message: "Invalid input", code: "custom" }
            ];

            const message = formatWorkflowValidationMessage(errors);

            expect(message).toContain("- Invalid input");
        });
    });

    // ========================================================================
    // validateWorkflowInputs Tests
    // ========================================================================

    describe("validateWorkflowInputs", () => {
        it("should pass when no schema is defined", () => {
            const workflow = createWorkflowDefinition();
            const inputs = { anything: "goes", nested: { data: 123 } };

            const result = validateWorkflowInputs(workflow, inputs);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(inputs);
        });

        it("should validate inputs against schema", () => {
            const workflow = createWorkflowDefinition({
                inputs: z.object({
                    name: z.string(),
                    count: z.number()
                })
            });

            const result = validateWorkflowInputs(workflow, { name: "test", count: 42 });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ name: "test", count: 42 });
        });

        it("should fail for invalid inputs", () => {
            const workflow = createWorkflowDefinition({
                inputs: z.object({
                    email: z.string().email()
                })
            });

            const result = validateWorkflowInputs(workflow, { email: "not-valid" });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.errors.length).toBeGreaterThan(0);
            expect(result.error!.message).toContain("email");
        });

        it("should fail for missing required fields", () => {
            const workflow = createWorkflowDefinition({
                inputs: z.object({
                    required: z.string()
                })
            });

            const result = validateWorkflowInputs(workflow, {});

            expect(result.success).toBe(false);
            expect(result.error!.errors[0].path).toBe("required");
        });

        it("should handle complex nested schemas", () => {
            const workflow = createWorkflowDefinition({
                inputs: z.object({
                    user: z.object({
                        name: z.string(),
                        settings: z.object({
                            notifications: z.boolean()
                        })
                    })
                })
            });

            const validInput = {
                user: {
                    name: "John",
                    settings: { notifications: true }
                }
            };

            const result = validateWorkflowInputs(workflow, validInput);

            expect(result.success).toBe(true);
        });

        it("should handle validation exceptions gracefully", () => {
            const workflow = createWorkflowDefinition({
                inputs: {
                    safeParse: () => {
                        throw new Error("Schema error");
                    }
                } as unknown as z.ZodSchema
            });

            const result = validateWorkflowInputs(workflow, {});

            expect(result.success).toBe(false);
            expect(result.error!.message).toBe("Schema error");
        });
    });

    // ========================================================================
    // validateWorkflowOutputs Tests
    // ========================================================================

    describe("validateWorkflowOutputs", () => {
        it("should pass when no schema is defined", () => {
            const workflow = createWorkflowDefinition();
            const outputs = { result: "success", data: [1, 2, 3] };

            const result = validateWorkflowOutputs(workflow, outputs);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(outputs);
        });

        it("should validate outputs against schema", () => {
            const workflow = createWorkflowDefinition({
                outputs: z.object({
                    success: z.boolean(),
                    data: z.array(z.number())
                })
            });

            const result = validateWorkflowOutputs(workflow, {
                success: true,
                data: [1, 2, 3]
            });

            expect(result.success).toBe(true);
        });

        it("should fail for invalid outputs", () => {
            const workflow = createWorkflowDefinition({
                outputs: z.object({
                    result: z.string()
                })
            });

            const result = validateWorkflowOutputs(workflow, { result: 123 });

            expect(result.success).toBe(false);
            expect(result.error!.errors[0].path).toBe("result");
        });

        it("should validate output types strictly", () => {
            const workflow = createWorkflowDefinition({
                outputs: z.object({
                    count: z.number().int().positive()
                })
            });

            // Negative number should fail
            const result = validateWorkflowOutputs(workflow, { count: -5 });

            expect(result.success).toBe(false);
        });
    });

    // ========================================================================
    // validateWorkflowContext Tests
    // ========================================================================

    describe("validateWorkflowContext", () => {
        it("should pass when no schema is defined", () => {
            const workflow = createWorkflowDefinition();
            const context = { variables: { temp: 123 }, state: "running" };

            const result = validateWorkflowContext(workflow, context);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(context);
        });

        it("should validate context against schema", () => {
            const workflow = createWorkflowDefinition({
                context: z.object({
                    currentStep: z.number(),
                    variables: z.record(z.unknown())
                })
            });

            const result = validateWorkflowContext(workflow, {
                currentStep: 3,
                variables: { foo: "bar" }
            });

            expect(result.success).toBe(true);
        });

        it("should fail for invalid context", () => {
            const workflow = createWorkflowDefinition({
                context: z.object({
                    stepId: z.string().uuid()
                })
            });

            const result = validateWorkflowContext(workflow, { stepId: "not-a-uuid" });

            expect(result.success).toBe(false);
        });
    });

    // ========================================================================
    // createValidatedWorkflow Tests
    // ========================================================================

    describe("createValidatedWorkflow", () => {
        it("should create workflow without schemas", () => {
            const definition = { name: "Test", nodes: {}, edges: [], entryPoint: "start" };
            const validated = createValidatedWorkflow(definition);

            expect(validated.nodes).toEqual({});
            expect(validated.edges).toEqual([]);
            expect(validated.stateSchema).toBeUndefined();
        });

        it("should create workflow with input schema", () => {
            const definition = { name: "Test", nodes: {}, edges: [], entryPoint: "start" };
            const inputSchema = z.object({ text: z.string() });

            const validated = createValidatedWorkflow(definition, {
                inputs: inputSchema
            });

            expect(validated.stateSchema?.inputs).toBe(inputSchema);
        });

        it("should create workflow with all schemas", () => {
            const definition = { name: "Test", nodes: {}, edges: [], entryPoint: "start" };
            const schemas = {
                inputs: z.object({ input: z.string() }),
                outputs: z.object({ output: z.string() }),
                context: z.object({ state: z.string() })
            };

            const validated = createValidatedWorkflow(definition, schemas);

            expect(validated.stateSchema?.inputs).toBe(schemas.inputs);
            expect(validated.stateSchema?.outputs).toBe(schemas.outputs);
            expect(validated.stateSchema?.context).toBe(schemas.context);
        });

        it("should preserve existing workflow properties", () => {
            const definition = {
                name: "My Workflow",
                nodes: {
                    start: {
                        type: "start",
                        name: "Start",
                        config: {},
                        position: { x: 0, y: 0 }
                    }
                },
                edges: [{ id: "e1", source: "start", target: "end" }],
                entryPoint: "start"
            };

            const validated = createValidatedWorkflow(definition);

            expect(validated.nodes).toEqual(definition.nodes);
            expect(validated.edges).toEqual(definition.edges);
            expect(validated.name).toBe("My Workflow");
        });
    });

    // ========================================================================
    // CommonWorkflowSchemas Tests
    // ========================================================================

    describe("CommonWorkflowSchemas", () => {
        describe("textInput", () => {
            it("should accept valid text input", () => {
                const result = CommonWorkflowSchemas.textInput.safeParse({
                    text: "Hello world"
                });
                expect(result.success).toBe(true);
            });

            it("should reject empty text", () => {
                const result = CommonWorkflowSchemas.textInput.safeParse({ text: "" });
                expect(result.success).toBe(false);
            });

            it("should reject missing text", () => {
                const result = CommonWorkflowSchemas.textInput.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("fileInput", () => {
            it("should accept valid file input", () => {
                const result = CommonWorkflowSchemas.fileInput.safeParse({
                    fileUrl: "https://example.com/file.pdf",
                    fileName: "document.pdf",
                    mimeType: "application/pdf"
                });
                expect(result.success).toBe(true);
            });

            it("should accept file input without mimeType", () => {
                const result = CommonWorkflowSchemas.fileInput.safeParse({
                    fileUrl: "https://example.com/file.pdf",
                    fileName: "document.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("should reject invalid URL", () => {
                const result = CommonWorkflowSchemas.fileInput.safeParse({
                    fileUrl: "not-a-url",
                    fileName: "document.pdf"
                });
                expect(result.success).toBe(false);
            });

            it("should reject empty fileName", () => {
                const result = CommonWorkflowSchemas.fileInput.safeParse({
                    fileUrl: "https://example.com/file.pdf",
                    fileName: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("jsonInput", () => {
            it("should accept valid JSON data", () => {
                const result = CommonWorkflowSchemas.jsonInput.safeParse({
                    data: { key: "value", nested: { num: 123 } }
                });
                expect(result.success).toBe(true);
            });

            it("should accept empty object", () => {
                const result = CommonWorkflowSchemas.jsonInput.safeParse({ data: {} });
                expect(result.success).toBe(true);
            });

            it("should reject non-object data", () => {
                const result = CommonWorkflowSchemas.jsonInput.safeParse({
                    data: "not an object"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("webhookInput", () => {
            it("should accept valid webhook input", () => {
                const result = CommonWorkflowSchemas.webhookInput.safeParse({
                    headers: { "content-type": "application/json" },
                    body: { event: "user.created" },
                    query: { token: "abc123" }
                });
                expect(result.success).toBe(true);
            });

            it("should accept minimal webhook input", () => {
                const result = CommonWorkflowSchemas.webhookInput.safeParse({
                    body: null
                });
                expect(result.success).toBe(true);
            });

            it("should accept webhook with only body", () => {
                const result = CommonWorkflowSchemas.webhookInput.safeParse({
                    body: { data: "test" }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("scheduleInput", () => {
            it("should accept valid schedule input", () => {
                const result = CommonWorkflowSchemas.scheduleInput.safeParse({
                    scheduledTime: "2024-01-15T10:30:00Z",
                    triggerType: "schedule"
                });
                expect(result.success).toBe(true);
            });

            it("should reject invalid datetime", () => {
                const result = CommonWorkflowSchemas.scheduleInput.safeParse({
                    scheduledTime: "not-a-date",
                    triggerType: "schedule"
                });
                expect(result.success).toBe(false);
            });

            it("should reject wrong triggerType", () => {
                const result = CommonWorkflowSchemas.scheduleInput.safeParse({
                    scheduledTime: "2024-01-15T10:30:00Z",
                    triggerType: "manual"
                });
                expect(result.success).toBe(false);
            });
        });
    });

    // ========================================================================
    // CommonWorkflowOutputSchemas Tests
    // ========================================================================

    describe("CommonWorkflowOutputSchemas", () => {
        describe("textOutput", () => {
            it("should accept valid text output", () => {
                const result = CommonWorkflowOutputSchemas.textOutput.safeParse({
                    result: "Operation completed"
                });
                expect(result.success).toBe(true);
            });

            it("should reject non-string result", () => {
                const result = CommonWorkflowOutputSchemas.textOutput.safeParse({
                    result: 123
                });
                expect(result.success).toBe(false);
            });
        });

        describe("jsonOutput", () => {
            it("should accept valid JSON output", () => {
                const result = CommonWorkflowOutputSchemas.jsonOutput.safeParse({
                    data: { users: [1, 2, 3], count: 3 }
                });
                expect(result.success).toBe(true);
            });
        });

        describe("statusOutput", () => {
            it("should accept success status", () => {
                const result = CommonWorkflowOutputSchemas.statusOutput.safeParse({
                    success: true,
                    message: "Completed successfully"
                });
                expect(result.success).toBe(true);
            });

            it("should accept failure status with error", () => {
                const result = CommonWorkflowOutputSchemas.statusOutput.safeParse({
                    success: false,
                    error: "Something went wrong"
                });
                expect(result.success).toBe(true);
            });

            it("should accept minimal status", () => {
                const result = CommonWorkflowOutputSchemas.statusOutput.safeParse({
                    success: true
                });
                expect(result.success).toBe(true);
            });

            it("should reject missing success field", () => {
                const result = CommonWorkflowOutputSchemas.statusOutput.safeParse({
                    message: "test"
                });
                expect(result.success).toBe(false);
            });
        });
    });

    // ========================================================================
    // Integration Tests
    // ========================================================================

    describe("Integration", () => {
        it("should validate complete workflow flow", () => {
            const workflow = createValidatedWorkflow(
                { name: "Test", nodes: {}, edges: [], entryPoint: "start" },
                {
                    inputs: CommonWorkflowSchemas.textInput,
                    outputs: CommonWorkflowOutputSchemas.statusOutput,
                    context: z.object({
                        processedText: z.string().optional()
                    })
                }
            );

            // Validate inputs
            const inputResult = validateWorkflowInputs(workflow, { text: "Hello" });
            expect(inputResult.success).toBe(true);

            // Validate context mid-execution
            const contextResult = validateWorkflowContext(workflow, {
                processedText: "HELLO"
            });
            expect(contextResult.success).toBe(true);

            // Validate outputs
            const outputResult = validateWorkflowOutputs(workflow, {
                success: true,
                message: "Text processed"
            });
            expect(outputResult.success).toBe(true);
        });

        it("should catch validation errors at each stage", () => {
            const workflow = createValidatedWorkflow(
                { name: "Test", nodes: {}, edges: [], entryPoint: "start" },
                {
                    inputs: z.object({ required: z.string() }),
                    outputs: z.object({ result: z.number() })
                }
            );

            // Invalid input
            const inputResult = validateWorkflowInputs(workflow, {});
            expect(inputResult.success).toBe(false);

            // Invalid output
            const outputResult = validateWorkflowOutputs(workflow, { result: "not a number" });
            expect(outputResult.success).toBe(false);
        });
    });
});
