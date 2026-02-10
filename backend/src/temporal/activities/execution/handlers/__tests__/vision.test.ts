/**
 * Vision Node Handler Unit Tests
 *
 * Tests vision/image processing logic with mocked external APIs:
 * - Handler properties and operation support
 * - OpenAI analyze (vision) and generate (DALL-E)
 * - Anthropic analyze (Claude vision)
 * - Google analyze (Gemini vision)
 * - Variable interpolation
 * - Error handling
 */

import nock from "nock";

// Mock modules before any imports that use them
jest.mock("../../../../../core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../../../storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockDatabase();
});

import {
    createHandlerInput,
    createTestContext,
    mustacheRef,
    assertValidOutput
} from "../../../../../../__tests__/helpers/handler-test-utils";
import {
    setupHttpMocking,
    teardownHttpMocking,
    clearHttpMocks
} from "../../../../../../__tests__/helpers/http-mock";
import { VisionNodeHandler, createVisionNodeHandler } from "../ai/vision";

// Mock image data (1x1 pixel PNG)
const MOCK_IMAGE_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const MOCK_IMAGE_URL = "https://example.com/test-image.jpg";

describe("VisionNodeHandler", () => {
    let handler: VisionNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createVisionNodeHandler();
        clearHttpMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("VisionNodeHandler");
        });

        it("supports vision node type", () => {
            expect(handler.supportedNodeTypes).toContain("vision");
        });

        it("can handle vision type", () => {
            expect(handler.canHandle("vision")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("audio")).toBe(false);
        });
    });

    describe("schema validation", () => {
        it("throws error for unsupported provider", async () => {
            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "unsupported-provider",
                    operation: "analyze",
                    model: "some-model",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/unsupported/i);
        });

        it("throws error for unsupported operation on Anthropic", async () => {
            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    operation: "generate",
                    model: "claude-3-opus-20240229",
                    generationPrompt: "A cat"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/only supports.*analyze/i);
        });

        it("throws error for unsupported operation on Google", async () => {
            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "google",
                    operation: "generate",
                    model: "gemini-pro-vision",
                    generationPrompt: "A dog"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/only supports.*analyze/i);
        });
    });

    describe("OpenAI analyze operation", () => {
        it("analyzes image URL and returns description", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    model: "gpt-4-vision-preview",
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: "assistant",
                                content:
                                    "This image shows a beautiful sunset over the ocean with vibrant orange and pink colors."
                            },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    prompt: "Describe this image"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.operation).toBe("analyze");
            expect(output.result.provider).toBe("openai");
            expect(output.result.analysis).toContain("sunset");
        });

        it("interpolates image URL from context", async () => {
            let capturedBody: { messages?: Array<{ content: unknown[] }> } | undefined;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as { messages?: Array<{ content: unknown[] }> };
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [
                        {
                            message: { content: "Image analysis" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const context = createTestContext({
                nodeOutputs: {
                    upload: { imageUrl: "https://storage.example.com/images/photo-123.jpg" }
                }
            });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: mustacheRef("upload", "imageUrl"),
                    prompt: "What is in this image?"
                },
                context
            });

            await handler.execute(input);

            const imageContent = capturedBody?.messages?.[0]?.content?.find(
                (c: unknown) => (c as { type?: string }).type === "image_url"
            );
            expect((imageContent as { image_url?: { url?: string } })?.image_url?.url).toBe(
                "https://storage.example.com/images/photo-123.jpg"
            );
        });

        it("interpolates prompt from context", async () => {
            let capturedBody: { messages?: Array<{ content: unknown[] }> } | undefined;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as { messages?: Array<{ content: unknown[] }> };
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const context = createTestContext({
                nodeOutputs: {
                    config: { analysisPrompt: "Count the number of people in this image" }
                }
            });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    prompt: mustacheRef("config", "analysisPrompt")
                },
                context
            });

            await handler.execute(input);

            const textContent = capturedBody?.messages?.[0]?.content?.find(
                (c: unknown) => (c as { type?: string }).type === "text"
            );
            expect((textContent as { text?: string })?.text).toContain("Count the number");
        });

        it("uses default prompt when not provided", async () => {
            let capturedBody: { messages?: Array<{ content: unknown[] }> } | undefined;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as { messages?: Array<{ content: unknown[] }> };
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Description" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                    // No prompt - should use default
                }
            });

            await handler.execute(input);

            const textContent = capturedBody?.messages?.[0]?.content?.find(
                (c: unknown) => (c as { type?: string }).type === "text"
            );
            expect((textContent as { text?: string })?.text).toContain("Describe this image");
        });

        it("respects detail level setting", async () => {
            let capturedBody: { messages?: Array<{ content: unknown[] }> } | undefined;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as { messages?: Array<{ content: unknown[] }> };
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [
                        { message: { content: "High detail analysis" }, finish_reason: "stop" }
                    ],
                    usage: { prompt_tokens: 150, completion_tokens: 100, total_tokens: 250 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    detail: "high"
                }
            });

            await handler.execute(input);

            const imageContent = capturedBody?.messages?.[0]?.content?.find(
                (c: unknown) => (c as { type?: string }).type === "image_url"
            );
            expect((imageContent as { image_url?: { detail?: string } })?.image_url?.detail).toBe(
                "high"
            );
        });
    });

    describe("OpenAI generate operation", () => {
        it("generates image from prompt", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, {
                    created: Date.now(),
                    data: [
                        {
                            url: "https://generated-images.example.com/image1.png",
                            revised_prompt: "A fluffy orange cat sitting on a windowsill"
                        }
                    ]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "A fluffy orange cat"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("generate");
            expect(output.result.provider).toBe("openai");
            expect(output.result.images).toHaveLength(1);
            const images = output.result.images as Array<{ url?: string; revisedPrompt?: string }>;
            expect(images[0].url).toContain("generated-images");
            expect(images[0].revisedPrompt).toContain("cat");
        });

        it("respects size parameter", async () => {
            let capturedBody: { size?: string } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { size?: string };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [{ url: "https://example.com/image.png" }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "Test",
                    size: "1792x1024"
                }
            });

            await handler.execute(input);

            expect(capturedBody?.size).toBe("1792x1024");
        });

        it("respects quality parameter", async () => {
            let capturedBody: { quality?: string } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { quality?: string };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [{ url: "https://example.com/image.png" }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "Test",
                    quality: "hd"
                }
            });

            await handler.execute(input);

            expect(capturedBody?.quality).toBe("hd");
        });

        it("respects style parameter", async () => {
            let capturedBody: { style?: string } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { style?: string };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [{ url: "https://example.com/image.png" }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "Test",
                    style: "natural"
                }
            });

            await handler.execute(input);

            expect(capturedBody?.style).toBe("natural");
        });

        it("returns base64 when outputFormat is base64", async () => {
            let capturedBody: { response_format?: string } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { response_format?: string };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [{ b64_json: MOCK_IMAGE_BASE64 }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "Test",
                    outputFormat: "base64"
                }
            });

            const output = await handler.execute(input);

            expect(capturedBody?.response_format).toBe("b64_json");
            const images = output.result.images as Array<{ base64?: string }>;
            expect(images[0].base64).toBe(MOCK_IMAGE_BASE64);
        });
    });

    describe("Anthropic analyze operation", () => {
        it("analyzes image with Anthropic Claude", async () => {
            // Mock the image download
            nock("https://example.com")
                .get("/test-image.jpg")
                .reply(200, Buffer.from(MOCK_IMAGE_BASE64, "base64"), {
                    "Content-Type": "image/jpeg"
                });

            // Mock Anthropic API
            nock("https://api.anthropic.com")
                .post("/v1/messages")
                .reply(200, {
                    id: "msg-test",
                    type: "message",
                    role: "assistant",
                    content: [
                        {
                            type: "text",
                            text: "This image shows a colorful landscape with mountains and a clear sky."
                        }
                    ],
                    model: "claude-3-opus-20240229",
                    stop_reason: "end_turn",
                    usage: { input_tokens: 200, output_tokens: 50 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-opus-20240229",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    prompt: "What is in this image?"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("analyze");
            expect(output.result.provider).toBe("anthropic");
            expect(output.result.analysis).toContain("landscape");
        });

        it("handles base64 data URL input for Anthropic", async () => {
            nock("https://api.anthropic.com")
                .post("/v1/messages")
                .reply(200, {
                    id: "msg-test",
                    type: "message",
                    role: "assistant",
                    content: [{ type: "text", text: "Image analyzed successfully" }],
                    model: "claude-3-opus-20240229",
                    stop_reason: "end_turn",
                    usage: { input_tokens: 150, output_tokens: 30 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-opus-20240229",
                    operation: "analyze",
                    imageInput: `data:image/png;base64,${MOCK_IMAGE_BASE64}`,
                    prompt: "Analyze this"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.analysis).toBe("Image analyzed successfully");
        });
    });

    describe("Google analyze operation", () => {
        it("analyzes image with Google Gemini", async () => {
            // Mock the image download
            nock("https://example.com")
                .get("/test-image.jpg")
                .reply(200, Buffer.from(MOCK_IMAGE_BASE64, "base64"), {
                    "Content-Type": "image/jpeg"
                });

            // Mock Google Gemini API
            nock("https://generativelanguage.googleapis.com")
                .post(/\/v1beta\/models\/gemini-pro-vision:generateContent/)
                .reply(200, {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: "This image contains a serene natural scene with trees."
                                    }
                                ]
                            },
                            finishReason: "STOP"
                        }
                    ]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "google",
                    model: "gemini-pro-vision",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    prompt: "Describe what you see"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("analyze");
            expect(output.result.provider).toBe("google");
            expect(output.result.analysis).toContain("trees");
        });
    });

    describe("output structure", () => {
        it("includes operation type in output", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("analyze");
        });

        it("includes provider in output", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("openai");
        });

        it("includes model in output", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            const output = await handler.execute(input);

            expect(output.result.model).toBe("gpt-4-vision-preview");
        });

        it("wraps result in outputVariable when specified", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL,
                    outputVariable: "visionResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("visionResult");
            const wrapped = output.result.visionResult as { operation: string };
            expect(wrapped.operation).toBe("analyze");
        });
    });

    describe("error handling", () => {
        it("handles API errors gracefully", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(500, { error: { message: "Internal server error" } });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles rate limit errors", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(429, {
                    error: { message: "Rate limit exceeded", type: "rate_limit_error" }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles image download failure for Anthropic", async () => {
            nock("https://example.com").get("/test-image.jpg").reply(404, "Not Found");

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-opus-20240229",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/HTTP 404/);
        });
    });

    describe("raw base64 input", () => {
        it("handles raw base64 string (no data: prefix) for OpenAI", async () => {
            let capturedBody: { messages?: Array<{ content: unknown[] }> } | undefined;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as { messages?: Array<{ content: unknown[] }> };
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [
                        {
                            message: { content: "Raw base64 image analyzed" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    // Raw base64 without data: prefix
                    imageInput: MOCK_IMAGE_BASE64,
                    prompt: "Analyze this image"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.analysis).toBe("Raw base64 image analyzed");
            // Verify the image was properly formatted in the request
            const imageContent = capturedBody?.messages?.[0]?.content?.find(
                (c: unknown) => (c as { type?: string }).type === "image_url"
            );
            expect(imageContent).toBeDefined();
        });

        it("handles raw base64 string for Anthropic", async () => {
            nock("https://api.anthropic.com")
                .post("/v1/messages")
                .reply(200, {
                    id: "msg-test",
                    type: "message",
                    role: "assistant",
                    content: [{ type: "text", text: "Anthropic raw base64 analysis" }],
                    model: "claude-3-opus-20240229",
                    stop_reason: "end_turn",
                    usage: { input_tokens: 150, output_tokens: 30 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-opus-20240229",
                    operation: "analyze",
                    // Raw base64 without data: prefix
                    imageInput: MOCK_IMAGE_BASE64
                }
            });

            const output = await handler.execute(input);

            expect(output.result.analysis).toBe("Anthropic raw base64 analysis");
        });

        it("handles raw base64 with different media types", async () => {
            // Mock with a JPEG-like base64
            const jpegBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMD";

            nock("https://api.anthropic.com")
                .post("/v1/messages")
                .reply(200, {
                    id: "msg-test",
                    type: "message",
                    role: "assistant",
                    content: [{ type: "text", text: "JPEG analyzed" }],
                    model: "claude-3-opus-20240229",
                    stop_reason: "end_turn",
                    usage: { input_tokens: 150, output_tokens: 30 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-opus-20240229",
                    operation: "analyze",
                    imageInput: jpegBase64
                }
            });

            const output = await handler.execute(input);

            expect(output.result.analysis).toBe("JPEG analyzed");
        });
    });

    describe("multi-image generation", () => {
        it("generates multiple images when n > 1", async () => {
            let capturedBody: { n?: number } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { n?: number };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [
                        { url: "https://generated.example.com/image1.png" },
                        { url: "https://generated.example.com/image2.png" },
                        { url: "https://generated.example.com/image3.png" }
                    ]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "A beautiful landscape",
                    n: 3
                }
            });

            const output = await handler.execute(input);

            expect(capturedBody?.n).toBe(3);
            expect(output.result.images).toHaveLength(3);
        });

        it("defaults to 1 image when n is not specified", async () => {
            let capturedBody: { n?: number } | undefined;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as { n?: number };
                    return true;
                })
                .reply(200, {
                    created: Date.now(),
                    data: [{ url: "https://generated.example.com/image.png" }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "A cat"
                    // n not specified
                }
            });

            const output = await handler.execute(input);

            // Should default to 1 or not send n parameter
            expect(capturedBody?.n === 1 || capturedBody?.n === undefined).toBe(true);
            expect(output.result.images).toHaveLength(1);
        });

        it("returns all image URLs when generating multiple with base64 format", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, {
                    created: Date.now(),
                    data: [{ b64_json: MOCK_IMAGE_BASE64 }, { b64_json: MOCK_IMAGE_BASE64 }]
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    operation: "generate",
                    generationPrompt: "Twin cats",
                    n: 2,
                    outputFormat: "base64"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.images).toHaveLength(2);
            const images = output.result.images as Array<{ base64?: string }>;
            expect(images[0].base64).toBeDefined();
            expect(images[1].base64).toBeDefined();
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records token usage when available", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    model: "gpt-4-vision-preview",
                    choices: [{ message: { content: "Analysis" }, finish_reason: "stop" }],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const input = createHandlerInput({
                nodeType: "vision",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-vision-preview",
                    operation: "analyze",
                    imageInput: MOCK_IMAGE_URL
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics?.tokenUsage?.totalTokens).toBe(150);
        });
    });
});
