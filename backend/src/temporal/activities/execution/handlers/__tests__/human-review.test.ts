/**
 * Human Review Node Handler Unit Tests
 *
 * Tests human-in-the-loop patterns:
 * - Pause signals for user input
 * - Resume with provided value
 * - Default values for optional inputs
 * - Input validation and types
 */

import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { HumanReviewNodeHandler, createHumanReviewNodeHandler } from "../logic/human-review";

describe("HumanReviewNodeHandler", () => {
    let handler: HumanReviewNodeHandler;

    beforeEach(() => {
        handler = createHumanReviewNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("HumanReviewNodeHandler");
        });

        it("supports humanReview node type", () => {
            expect(handler.supportedNodeTypes).toContain("humanReview");
        });

        it("can handle humanReview type", () => {
            expect(handler.canHandle("humanReview")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("wait")).toBe(false);
            expect(handler.canHandle("input")).toBe(false);
            expect(handler.canHandle("conditional")).toBe(false);
        });
    });

    describe("pause for input", () => {
        it("pauses when required input not provided", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "userResponse",
                    inputType: "text",
                    required: true,
                    prompt: "Enter your response",
                    outputVariable: "response"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.signals.pause).toBe(true);
            expect(output.signals.pauseContext).toBeDefined();
            expect(output.signals.pauseContext?.reason).toContain("Waiting for human review");
        });

        it("includes prompt in pause context", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "feedback",
                    inputType: "text",
                    required: true,
                    prompt: "Please provide your feedback",
                    outputVariable: "userFeedback"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
            expect(output.signals.pauseContext?.reason).toContain("Please provide your feedback");
        });

        it("includes description in result when pausing", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "approval",
                    inputType: "boolean",
                    required: true,
                    prompt: "Approve this request?",
                    description: "Select yes to approve or no to reject",
                    outputVariable: "isApproved"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
            expect(output.result.description).toBe("Select yes to approve or no to reject");
        });

        it("includes placeholder in result when pausing", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "email",
                    inputType: "text",
                    required: true,
                    prompt: "Enter your email",
                    placeholder: "user@example.com",
                    outputVariable: "userEmail"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
            expect(output.result.placeholder).toBe("user@example.com");
        });

        it("preserves node data for resume", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "quantity",
                    inputType: "number",
                    required: true,
                    prompt: "Enter quantity",
                    outputVariable: "orderQuantity"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pauseContext?.preservedData).toBeDefined();
            const preserved = output.signals.pauseContext?.preservedData;
            expect(preserved?.variableName).toBe("quantity");
            expect(preserved?.inputType).toBe("number");
            expect(preserved?.outputVariable).toBe("orderQuantity");
        });

        it("sets resumeTrigger to signal", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "answer",
                    inputType: "text",
                    required: true,
                    prompt: "Enter your answer",
                    outputVariable: "userAnswer"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pauseContext?.resumeTrigger).toBe("signal");
        });
    });

    describe("resume with value", () => {
        it("returns value when input is provided in context", async () => {
            const context = createTestContext({
                inputs: { userName: "John Doe" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "userName",
                    inputType: "text",
                    required: true,
                    prompt: "Enter your name",
                    outputVariable: "name"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.signals.pause).not.toBe(true);
            expect(output.result.name).toBe("John Doe");
        });

        it("includes metadata about source being provided", async () => {
            const context = createTestContext({
                inputs: { userAge: 25 }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "userAge",
                    inputType: "number",
                    required: true,
                    prompt: "Enter your age",
                    outputVariable: "age"
                },
                context
            });

            const output = await handler.execute(input);

            const metadata = output.result._humanReviewMetadata as {
                source?: string;
                variableName?: string;
            };
            expect(metadata?.source).toBe("provided");
            expect(metadata?.variableName).toBe("userAge");
        });

        it("handles boolean input type", async () => {
            const context = createTestContext({
                inputs: { consent: true }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "consent",
                    inputType: "boolean",
                    required: true,
                    prompt: "Do you consent?",
                    outputVariable: "hasConsent"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.hasConsent).toBe(true);
        });

        it("handles JSON input type", async () => {
            const jsonData = { preferences: { theme: "dark", language: "en" } };
            const context = createTestContext({
                inputs: { userPrefs: jsonData }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "userPrefs",
                    inputType: "json",
                    required: true,
                    prompt: "Enter preferences",
                    outputVariable: "preferences"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.preferences).toEqual(jsonData);
        });
    });

    describe("default values", () => {
        it("uses default value when input not provided and not required", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "theme",
                    inputType: "text",
                    required: false,
                    prompt: "Select theme",
                    defaultValue: "light",
                    outputVariable: "selectedTheme"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.signals.pause).not.toBe(true);
            expect(output.result.selectedTheme).toBe("light");
        });

        it("marks source as default when using default value", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "retryCount",
                    inputType: "number",
                    required: false,
                    prompt: "Enter retry count",
                    defaultValue: 3,
                    outputVariable: "maxRetries"
                }
            });

            const output = await handler.execute(input);

            const metadata = output.result._humanReviewMetadata as { source?: string };
            expect(metadata?.source).toBe("default");
        });

        it("handles boolean default value", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "enableNotifications",
                    inputType: "boolean",
                    required: false,
                    prompt: "Enable notifications?",
                    defaultValue: false,
                    outputVariable: "notificationsEnabled"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.notificationsEnabled).toBe(false);
        });

        it("pauses if required even with default value specified", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "criticalInput",
                    inputType: "text",
                    required: true,
                    prompt: "Enter critical input",
                    defaultValue: "fallback", // Should be ignored when required
                    outputVariable: "critical"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
        });

        it("prefers provided value over default", async () => {
            const context = createTestContext({
                inputs: { color: "blue" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "color",
                    inputType: "text",
                    required: false,
                    prompt: "Select color",
                    defaultValue: "red",
                    outputVariable: "selectedColor"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.selectedColor).toBe("blue");
            const metadata = output.result._humanReviewMetadata as { source?: string };
            expect(metadata?.source).toBe("provided");
        });
    });

    describe("input types", () => {
        it("handles text input type", async () => {
            const context = createTestContext({
                inputs: { message: "Hello world" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "message",
                    inputType: "text",
                    required: true,
                    prompt: "Enter message",
                    outputVariable: "userMessage"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.userMessage).toBe("Hello world");
        });

        it("handles number input type", async () => {
            const context = createTestContext({
                inputs: { quantity: 42 }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "quantity",
                    inputType: "number",
                    required: true,
                    prompt: "Enter quantity",
                    outputVariable: "orderQuantity"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.orderQuantity).toBe(42);
        });

        it("handles json input type with complex object", async () => {
            const complexData = {
                items: [
                    { id: 1, name: "Item 1" },
                    { id: 2, name: "Item 2" }
                ],
                metadata: { total: 2 }
            };
            const context = createTestContext({
                inputs: { orderData: complexData }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "orderData",
                    inputType: "json",
                    required: true,
                    prompt: "Enter order data",
                    outputVariable: "order"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.order).toEqual(complexData);
        });
    });

    describe("validation", () => {
        it("includes validation rules in pause context when specified", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "email",
                    inputType: "text",
                    required: true,
                    prompt: "Enter email",
                    validation: {
                        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                        minLength: 5,
                        maxLength: 100
                    },
                    outputVariable: "userEmail"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
            expect(output.result.validation).toBeDefined();
        });

        it("preserves validation in pause context for resume", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "age",
                    inputType: "number",
                    required: true,
                    prompt: "Enter age",
                    validation: {
                        min: 0,
                        max: 150
                    },
                    outputVariable: "userAge"
                }
            });

            const output = await handler.execute(input);

            const preserved = output.signals.pauseContext?.preservedData as {
                validation?: unknown;
            };
            expect(preserved?.validation).toBeDefined();
        });
    });

    describe("metrics", () => {
        it("records execution duration when pausing", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "input",
                    inputType: "text",
                    required: true,
                    prompt: "Enter input",
                    outputVariable: "result"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records execution duration when returning value", async () => {
            const context = createTestContext({
                inputs: { data: "test" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "data",
                    inputType: "text",
                    required: true,
                    prompt: "Enter data",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles empty string input", async () => {
            const context = createTestContext({
                inputs: { note: "" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "note",
                    inputType: "text",
                    required: true,
                    prompt: "Enter note",
                    outputVariable: "userNote"
                },
                context
            });

            const output = await handler.execute(input);

            // Empty string is a valid value (it's defined)
            expect(output.signals.pause).not.toBe(true);
            expect(output.result.userNote).toBe("");
        });

        it("handles zero as valid number input", async () => {
            const context = createTestContext({
                inputs: { count: 0 }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "count",
                    inputType: "number",
                    required: true,
                    prompt: "Enter count",
                    outputVariable: "itemCount"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).not.toBe(true);
            expect(output.result.itemCount).toBe(0);
        });

        it("handles false as valid boolean input", async () => {
            const context = createTestContext({
                inputs: { optIn: false }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "optIn",
                    inputType: "boolean",
                    required: true,
                    prompt: "Opt in?",
                    outputVariable: "userOptIn"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).not.toBe(true);
            expect(output.result.userOptIn).toBe(false);
        });

        it("handles null default value", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "optionalField",
                    inputType: "json",
                    required: false,
                    prompt: "Enter optional field",
                    defaultValue: null,
                    outputVariable: "optional"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).not.toBe(true);
            expect(output.result.optional).toBeNull();
        });

        it("handles special characters in prompts", async () => {
            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "specialInput",
                    inputType: "text",
                    required: true,
                    prompt: 'Enter value with <special> & "characters"',
                    outputVariable: "result"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.pause).toBe(true);
            expect(output.signals.pauseContext?.reason).toContain("<special>");
        });

        it("handles Unicode in prompts and inputs", async () => {
            const context = createTestContext({
                inputs: { greeting: "こんにちは" }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "greeting",
                    inputType: "text",
                    required: true,
                    prompt: "日本語の挨拶を入力してください",
                    outputVariable: "japaneseGreeting"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.japaneseGreeting).toBe("こんにちは");
        });

        it("handles negative numbers", async () => {
            const context = createTestContext({
                inputs: { temperature: -15 }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "temperature",
                    inputType: "number",
                    required: true,
                    prompt: "Enter temperature",
                    outputVariable: "temp"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.temp).toBe(-15);
        });

        it("handles floating point numbers", async () => {
            const context = createTestContext({
                inputs: { price: 19.99 }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "price",
                    inputType: "number",
                    required: true,
                    prompt: "Enter price",
                    outputVariable: "itemPrice"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.itemPrice).toBe(19.99);
        });

        it("handles array input in json type", async () => {
            const context = createTestContext({
                inputs: { tags: ["urgent", "important", "review"] }
            });

            const input = createHandlerInput({
                nodeType: "humanReview",
                nodeConfig: {
                    variableName: "tags",
                    inputType: "json",
                    required: true,
                    prompt: "Enter tags",
                    outputVariable: "itemTags"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.itemTags).toEqual(["urgent", "important", "review"]);
        });
    });

    describe("concurrent executions", () => {
        it("handles multiple concurrent pause requests", async () => {
            const inputs = [
                createHandlerInput({
                    nodeType: "humanReview",
                    nodeConfig: {
                        variableName: "input1",
                        inputType: "text",
                        required: true,
                        prompt: "Enter input 1",
                        outputVariable: "result1"
                    }
                }),
                createHandlerInput({
                    nodeType: "humanReview",
                    nodeConfig: {
                        variableName: "input2",
                        inputType: "number",
                        required: true,
                        prompt: "Enter input 2",
                        outputVariable: "result2"
                    }
                }),
                createHandlerInput({
                    nodeType: "humanReview",
                    nodeConfig: {
                        variableName: "input3",
                        inputType: "boolean",
                        required: true,
                        prompt: "Enter input 3",
                        outputVariable: "result3"
                    }
                })
            ];

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(3);
            outputs.forEach((output) => {
                expect(output.signals.pause).toBe(true);
            });
        });
    });
});
