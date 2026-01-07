/**
 * Image Generation Node Handler Unit Tests
 *
 * Tests image generation logic:
 * - Handler properties and provider support
 * - OpenAI DALL-E image generation
 * - Replicate Flux image generation
 * - Stability AI (SD3/SDXL) image generation
 * - Variable interpolation
 * - Output formats (URL, base64)
 * - Error handling
 *
 * Note: External API calls are mocked using nock
 */

// Mock modules - use require() inside factory to avoid Jest hoisting issues
jest.mock("../../../src/core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../src/storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../helpers/module-mocks");
    return mockDatabase();
});
jest.mock("../../../src/storage/repositories/ConnectionRepository", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockConnectionRepository } = require("../../helpers/module-mocks");
    return mockConnectionRepository();
});

import nock from "nock";
import {
    ImageGenerationNodeHandler,
    createImageGenerationNodeHandler
} from "../../../src/temporal/activities/execution/handlers/ai/image-generation";
import {
    createHandlerInput,
    createTestContext,
    mustacheRef
} from "../../helpers/handler-test-utils";
import { setupHttpMocking, teardownHttpMocking, clearHttpMocks } from "../../helpers/http-mock";

describe("ImageGenerationNodeHandler", () => {
    let handler: ImageGenerationNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createImageGenerationNodeHandler();
        clearHttpMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("ImageGenerationNodeHandler");
        });

        it("supports imageGeneration node type", () => {
            expect(handler.supportedNodeTypes).toContain("imageGeneration");
        });

        it("can handle imageGeneration type", () => {
            expect(handler.canHandle("imageGeneration")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("vision")).toBe(false);
        });
    });

    describe("config validation", () => {
        it("throws error for unsupported provider", async () => {
            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "unsupported",
                    model: "test-model",
                    prompt: "A cat"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/unsupported/i);
        });
    });

    describe("OpenAI DALL-E generation", () => {
        it("generates image from prompt", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, {
                    created: Date.now(),
                    data: [
                        {
                            url: "https://oaidalleapiprodscus.blob.core.windows.net/image.png",
                            revised_prompt: "A fluffy orange cat sitting on a windowsill"
                        }
                    ]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat sitting on a windowsill"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("openai");
            expect(output.result.model).toBe("dall-e-3");
            expect((output.result.images as Array<{ url: string }>)[0].url).toBeDefined();
        });

        it("returns revised prompt from DALL-E 3", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, {
                    data: [
                        {
                            url: "https://example.com/image.png",
                            revised_prompt: "A detailed photorealistic image of a cat"
                        }
                    ]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat"
                }
            });

            const output = await handler.execute(input);

            const images = output.result.images as Array<{ revisedPrompt?: string }>;
            expect(images[0].revisedPrompt).toBe("A detailed photorealistic image of a cat");
        });

        it("uses configured size", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat",
                    size: "1792x1024"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.size).toBe("1792x1024");
        });

        it("uses configured quality for DALL-E 3", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat",
                    quality: "hd"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.quality).toBe("hd");
        });

        it("uses configured style for DALL-E 3", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat",
                    style: "natural"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.style).toBe("natural");
        });

        it("returns base64 when outputFormat is base64", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    data: [{ b64_json: "base64encodedimage==" }]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat",
                    outputFormat: "base64"
                }
            });

            const output = await handler.execute(input);

            expect(capturedBody!.response_format).toBe("b64_json");
            const images = output.result.images as Array<{ base64?: string }>;
            expect(images[0].base64).toBe("base64encodedimage==");
        });

        it("interpolates prompt from context", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/images/generations", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const context = createTestContext({
                nodeOutputs: {
                    llm: { description: "a majestic lion in the savanna" }
                }
            });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: `Generate an image of ${mustacheRef("llm", "description")}`
                },
                context
            });

            await handler.execute(input);

            expect(capturedBody!.prompt).toBe(
                "Generate an image of a majestic lion in the savanna"
            );
        });
    });

    describe("Replicate Flux generation", () => {
        it("generates image using Replicate API", async () => {
            // Mock prediction creation that returns completed status immediately
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "pred_123",
                    status: "succeeded",
                    output: ["https://replicate.delivery/image.webp"]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "black-forest-labs/flux-schnell",
                    prompt: "A futuristic city"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("replicate");
            expect(output.result.model).toBe("black-forest-labs/flux-schnell");
            const images = output.result.images as Array<{ url: string }>;
            expect(images[0].url).toBe("https://replicate.delivery/image.webp");
        });

        it("uses aspect ratio configuration", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.replicate.com")
                .post("/v1/predictions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "pred_123",
                    status: "succeeded",
                    output: ["https://example.com/image.webp"]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "black-forest-labs/flux-schnell",
                    prompt: "A landscape",
                    aspectRatio: "16:9"
                }
            });

            await handler.execute(input);

            const inputParams = capturedBody!.input as { width: number; height: number };
            expect(inputParams.width).toBe(1344);
            expect(inputParams.height).toBe(768);
        });

        it("handles multiple output images", async () => {
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "pred_123",
                    status: "succeeded",
                    output: [
                        "https://example.com/image1.webp",
                        "https://example.com/image2.webp",
                        "https://example.com/image3.webp"
                    ]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "black-forest-labs/flux-schnell",
                    prompt: "A cat",
                    n: 3
                }
            });

            const output = await handler.execute(input);

            const images = output.result.images as Array<{ url: string }>;
            expect(images).toHaveLength(3);
        });

        it("polls for completion when status is processing", async () => {
            // First request returns processing status
            nock("https://api.replicate.com").post("/v1/predictions").reply(200, {
                id: "pred_456",
                status: "processing"
            });

            // Poll request returns succeeded
            nock("https://api.replicate.com")
                .get("/v1/predictions/pred_456")
                .reply(200, {
                    id: "pred_456",
                    status: "succeeded",
                    output: ["https://example.com/final.webp"]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "black-forest-labs/flux-schnell",
                    prompt: "A dog"
                }
            });

            const output = await handler.execute(input);

            const images = output.result.images as Array<{ url: string }>;
            expect(images[0].url).toBe("https://example.com/final.webp");
        });
    });

    describe("Stability AI generation", () => {
        it("generates image using SD3 model", async () => {
            nock("https://api.stability.ai").post("/v2beta/stable-image/generate/sd3").reply(200, {
                image: "base64encodedsdimage=="
            });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "sd3-large",
                    prompt: "A mountain landscape"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("stabilityai");
            expect(output.result.model).toBe("sd3-large");
            const images = output.result.images as Array<{ base64?: string }>;
            expect(images[0].base64).toBe("base64encodedsdimage==");
        });

        it("uses negative prompt", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.stability.ai")
                .post("/v2beta/stable-image/generate/sd3", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, { image: "base64==" });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "sd3-large",
                    prompt: "A beautiful sunset",
                    negativePrompt: "clouds, rain, dark"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.negative_prompt).toBe("clouds, rain, dark");
        });

        it("generates image using SDXL model", async () => {
            nock("https://api.stability.ai")
                .post("/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image")
                .reply(200, {
                    artifacts: [{ base64: "sdxlbase64image==" }]
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "stable-diffusion-xl",
                    prompt: "A fantasy castle"
                }
            });

            const output = await handler.execute(input);

            const images = output.result.images as Array<{ base64?: string }>;
            expect(images[0].base64).toBe("sdxlbase64image==");
        });
    });

    describe("output variable", () => {
        it("wraps result in outputVariable when specified", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat",
                    outputVariable: "generatedImage"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("generatedImage");
            expect((output.result.generatedImage as Record<string, unknown>).provider).toBe(
                "openai"
            );
        });
    });

    describe("metadata", () => {
        it("includes processing time", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat"
                }
            });

            const output = await handler.execute(input);

            const metadata = output.result.metadata as { processingTime: number };
            expect(metadata.processingTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("error handling", () => {
        it("handles OpenAI API errors", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(400, {
                    error: {
                        message: "Invalid prompt",
                        type: "invalid_request_error"
                    }
                });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: ""
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles Replicate prediction failures", async () => {
            nock("https://api.replicate.com").post("/v1/predictions").reply(200, {
                id: "pred_fail",
                status: "failed",
                error: "Content policy violation"
            });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "black-forest-labs/flux-schnell",
                    prompt: "Inappropriate content"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed/i);
        });

        it("handles Stability AI API errors", async () => {
            nock("https://api.stability.ai")
                .post("/v2beta/stable-image/generate/sd3")
                .reply(403, { message: "Invalid API key" });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "sd3-large",
                    prompt: "A cat"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            nock("https://api.openai.com")
                .post("/v1/images/generations")
                .reply(200, { data: [{ url: "https://example.com/image.png" }] });

            const input = createHandlerInput({
                nodeType: "imageGeneration",
                nodeConfig: {
                    provider: "openai",
                    model: "dall-e-3",
                    prompt: "A cat"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });
});
