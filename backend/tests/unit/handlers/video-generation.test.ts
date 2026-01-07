/**
 * Video Generation Node Handler Unit Tests
 *
 * Tests AI video generation:
 * - Provider routing (Google Veo, Replicate, Runway, Luma, Stability AI)
 * - Prompt interpolation
 * - Image-to-video support
 * - Async polling patterns
 * - Configuration options (duration, aspect ratio, loop)
 */

// Mock modules before any imports that use them
// Use require() inside factory to avoid Jest hoisting issues
jest.mock("../../../src/core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../src/storage/repositories/ConnectionRepository", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockConnectionRepository } = require("../../helpers/module-mocks");
    return mockConnectionRepository();
});
jest.mock("../../../src/storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../helpers/module-mocks");
    return mockDatabase();
});

import {
    VideoGenerationNodeHandler,
    createVideoGenerationNodeHandler
} from "../../../src/temporal/activities/execution/handlers/ai/video-generation";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../helpers/handler-test-utils";
import { createMockResponse, createMockFetch } from "../../helpers/module-mocks";

describe("VideoGenerationNodeHandler", () => {
    let handler: VideoGenerationNodeHandler;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        handler = createVideoGenerationNodeHandler();
        originalFetch = global.fetch;
        // Use fake timers to skip sleep() calls in polling
        jest.useFakeTimers();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    // Helper to advance timers while awaiting a promise
    async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
        // Start the promise but don't await it yet
        let resolved = false;
        let result: T;
        let error: Error | undefined;

        promise
            .then((r) => {
                resolved = true;
                result = r;
            })
            .catch((e) => {
                resolved = true;
                error = e;
            });

        // Advance timers incrementally until the promise resolves
        for (let i = 0; i < 50 && !resolved; i++) {
            await Promise.resolve(); // Let microtasks run
            jest.advanceTimersByTime(5000); // 5 seconds per iteration
            await Promise.resolve(); // Let more microtasks run
        }

        if (error) throw error;
        return result!;
    }

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("VideoGenerationNodeHandler");
        });

        it("supports videoGeneration node type", () => {
            expect(handler.supportedNodeTypes).toContain("videoGeneration");
        });

        it("can handle videoGeneration type", () => {
            expect(handler.canHandle("videoGeneration")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("imageGeneration")).toBe(false);
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("audio")).toBe(false);
        });
    });

    describe("Google Veo provider", () => {
        it("generates video with text prompt", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "generativelanguage.googleapis.com",
                        [
                            {
                                body: {
                                    name: "operations/video-op-123",
                                    done: true,
                                    response: {
                                        generateVideoResponse: {
                                            generatedSamples: [
                                                {
                                                    video: {
                                                        uri: "https://storage.googleapis.com/video.mp4"
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "A beautiful sunset over the ocean",
                    duration: 8,
                    aspectRatio: "16:9"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.provider).toBe("google");
            expect(output.result.model).toBe("veo-3");
            expect(output.result.video).toBeDefined();
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://storage.googleapis.com/video.mp4");
        });

        it("interpolates variables in prompt", async () => {
            let capturedBody: { instances?: Array<{ prompt: string }> } | undefined;

            global.fetch = jest.fn(
                async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
                    if (init?.body) {
                        capturedBody = JSON.parse(init.body as string);
                    }
                    return createMockResponse({
                        name: "operations/video-op-123",
                        done: true,
                        response: {
                            generateVideoResponse: {
                                generatedSamples: [
                                    { video: { uri: "https://storage.googleapis.com/video.mp4" } }
                                ]
                            }
                        }
                    });
                }
            );

            const context = createTestContext({
                nodeOutputs: {
                    describe: { scene: "a cat playing piano" }
                }
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "Generate a video of {{describe.scene}}"
                },
                context
            });

            await runWithTimers(handler.execute(input));

            expect(capturedBody!.instances![0].prompt).toBe(
                "Generate a video of a cat playing piano"
            );
        });

        it("polls for completion when not immediately done", async () => {
            let pollCount = 0;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (urlString.includes("predictLongRunning")) {
                    return createMockResponse({
                        name: "operations/video-op-polling",
                        done: false
                    });
                }

                if (urlString.includes("operations/video-op-polling")) {
                    pollCount++;
                    if (pollCount < 2) {
                        return createMockResponse({
                            name: "operations/video-op-polling",
                            done: false
                        });
                    }
                    return createMockResponse({
                        name: "operations/video-op-polling",
                        done: true,
                        response: {
                            generateVideoResponse: {
                                generatedSamples: [
                                    {
                                        video: {
                                            uri: "https://storage.googleapis.com/polled-video.mp4"
                                        }
                                    }
                                ]
                            }
                        }
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "Test prompt"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://storage.googleapis.com/polled-video.mp4");
        });

        it("throws error on API failure", async () => {
            global.fetch = jest.fn(async (): Promise<Response> => {
                return createMockResponse(
                    { error: { message: "Invalid request" } },
                    { status: 400 }
                );
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "Test prompt"
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Google Veo API error/
            );
        });
    });

    describe("Replicate provider", () => {
        it("generates video with immediate success", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "api.replicate.com",
                        [
                            {
                                body: {
                                    id: "replicate-pred-123",
                                    status: "succeeded",
                                    output: ["https://replicate.delivery/video.mp4"]
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "minimax/video-01",
                    prompt: "A dancing robot",
                    aspectRatio: "16:9"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.provider).toBe("replicate");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://replicate.delivery/video.mp4");
        });

        it("polls for completion", async () => {
            let isPolling = false;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (
                    urlString.includes("/v1/predictions") &&
                    !urlString.includes("replicate-pred-456")
                ) {
                    isPolling = true;
                    return createMockResponse({
                        id: "replicate-pred-456",
                        status: "processing"
                    });
                }

                if (isPolling && urlString.includes("replicate-pred-456")) {
                    return createMockResponse({
                        id: "replicate-pred-456",
                        status: "succeeded",
                        output: "https://replicate.delivery/final-video.mp4"
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "wan-2.5-i2v",
                    prompt: "Animate this image"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://replicate.delivery/final-video.mp4");
        });

        it("throws error on generation failure", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "api.replicate.com",
                        [
                            {
                                body: {
                                    id: "replicate-pred-fail",
                                    status: "failed",
                                    error: "Content policy violation"
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Replicate video generation failed/
            );
        });
    });

    describe("Runway provider", () => {
        it("generates video and polls for completion", async () => {
            let isPolling = false;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (urlString.includes("/v1/tasks") && !urlString.includes("runway-task-123")) {
                    isPolling = true;
                    return createMockResponse({
                        id: "runway-task-123",
                        status: "PENDING"
                    });
                }

                if (isPolling && urlString.includes("runway-task-123")) {
                    return createMockResponse({
                        id: "runway-task-123",
                        status: "SUCCEEDED",
                        output: ["https://runway.storage/video.mp4"]
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "runway",
                    model: "gen3a_turbo",
                    prompt: "A futuristic cityscape",
                    duration: 5
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.provider).toBe("runway");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://runway.storage/video.mp4");
        });

        it("throws error on task failure", async () => {
            let isPolling = false;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (urlString.includes("/v1/tasks") && !urlString.includes("runway-task-fail")) {
                    isPolling = true;
                    return createMockResponse({
                        id: "runway-task-fail",
                        status: "PENDING"
                    });
                }

                if (isPolling && urlString.includes("runway-task-fail")) {
                    return createMockResponse({
                        id: "runway-task-fail",
                        status: "FAILED",
                        failure: "Insufficient credits"
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "runway",
                    model: "gen3a_turbo",
                    prompt: "Test prompt"
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Runway generation failed/
            );
        });
    });

    describe("Luma provider", () => {
        it("generates video and polls for completion", async () => {
            let isPolling = false;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (
                    urlString.includes("/dream-machine/v1/generations") &&
                    !urlString.includes("luma-gen-123")
                ) {
                    isPolling = true;
                    return createMockResponse({
                        id: "luma-gen-123",
                        state: "pending"
                    });
                }

                if (isPolling && urlString.includes("luma-gen-123")) {
                    return createMockResponse({
                        id: "luma-gen-123",
                        state: "completed",
                        video: { url: "https://luma.storage/video.mp4" }
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "A magical forest",
                    loop: true
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.provider).toBe("luma");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://luma.storage/video.mp4");
        });

        it("sends loop parameter in request", async () => {
            let capturedBody: { loop?: boolean } | undefined;

            global.fetch = jest.fn(
                async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
                    if (init?.body) {
                        capturedBody = JSON.parse(init.body as string);
                    }
                    return createMockResponse({
                        id: "luma-gen-loop",
                        state: "completed",
                        video: { url: "https://luma.storage/loop.mp4" }
                    });
                }
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "A spinning globe",
                    loop: true
                }
            });

            await runWithTimers(handler.execute(input));

            expect(capturedBody!.loop).toBe(true);
        });

        it("throws error on generation failure", async () => {
            let isPolling = false;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                if (
                    urlString.includes("/dream-machine/v1/generations") &&
                    !urlString.includes("luma-gen-fail")
                ) {
                    isPolling = true;
                    return createMockResponse({
                        id: "luma-gen-fail",
                        state: "pending"
                    });
                }

                if (isPolling && urlString.includes("luma-gen-fail")) {
                    return createMockResponse({
                        id: "luma-gen-fail",
                        state: "failed",
                        failure_reason: "Invalid input dimensions"
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "Test prompt"
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Luma generation failed/
            );
        });
    });

    describe("Stability AI provider", () => {
        it("requires image input", async () => {
            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "stable-video-diffusion",
                    prompt: "Animate this"
                    // No imageInput
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Stability AI video generation requires an image input/
            );
        });

        it("generates video from image", async () => {
            let pollCount = 0;

            global.fetch = jest.fn(async (url: string | URL | Request): Promise<Response> => {
                const urlString = url.toString();

                // Mock image fetch
                if (urlString.includes("example.com/input-image.png")) {
                    return new Response(Buffer.from("fake-image-data"), {
                        status: 200,
                        headers: { "Content-Type": "image/png" }
                    });
                }

                // Initial request
                if (
                    urlString.includes("api.stability.ai/v2beta/image-to-video") &&
                    !urlString.includes("result")
                ) {
                    return createMockResponse({ id: "stability-gen-123" });
                }

                // Poll for result
                if (urlString.includes("result/stability-gen-123")) {
                    pollCount++;
                    if (pollCount < 2) {
                        return new Response(null, { status: 202 });
                    }
                    return new Response(Buffer.from("video-data"), {
                        status: 200,
                        headers: { "Content-Type": "video/mp4" }
                    });
                }

                throw new Error(`Unexpected URL: ${urlString}`);
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "stabilityai",
                    model: "stable-video-diffusion",
                    prompt: "Animate this image",
                    imageInput: "https://example.com/input-image.png"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.provider).toBe("stabilityai");
            const video = output.result.video as { base64?: string };
            expect(video.base64).toBeDefined();
        });
    });

    describe("unsupported provider", () => {
        it("throws error for unknown provider", async () => {
            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "unknown-provider",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            await expect(runWithTimers(handler.execute(input))).rejects.toThrow(
                /Unsupported video generation provider/
            );
        });
    });

    describe("output variable", () => {
        it("stores result in outputVariable when specified", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "api.replicate.com",
                        [
                            {
                                body: {
                                    id: "replicate-pred-output",
                                    status: "succeeded",
                                    output: ["https://replicate.delivery/output.mp4"]
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt",
                    outputVariable: "generatedVideo"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            assertValidOutput(output);
            expect(output.result.generatedVideo).toBeDefined();
            const generatedVideo = output.result.generatedVideo as { provider: string };
            expect(generatedVideo.provider).toBe("replicate");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "api.replicate.com",
                        [
                            {
                                body: {
                                    id: "replicate-pred-metrics",
                                    status: "succeeded",
                                    output: ["https://replicate.delivery/metrics.mp4"]
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("includes processing time in metadata", async () => {
            global.fetch = createMockFetch(
                new Map([
                    [
                        "api.replicate.com",
                        [
                            {
                                body: {
                                    id: "replicate-pred-time",
                                    status: "succeeded",
                                    output: ["https://replicate.delivery/time.mp4"]
                                }
                            }
                        ]
                    ]
                ])
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            const output = await runWithTimers(handler.execute(input));

            const metadata = output.result.metadata as { processingTime: number };
            expect(metadata?.processingTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("aspect ratio configuration", () => {
        it("passes aspect ratio to provider", async () => {
            let capturedBody: { input?: { aspect_ratio?: string } } | undefined;

            global.fetch = jest.fn(
                async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
                    if (init?.body) {
                        capturedBody = JSON.parse(init.body as string);
                    }
                    return createMockResponse({
                        id: "replicate-pred-aspect",
                        status: "succeeded",
                        output: ["https://replicate.delivery/aspect.mp4"]
                    });
                }
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt",
                    aspectRatio: "9:16"
                }
            });

            await runWithTimers(handler.execute(input));

            expect(capturedBody!.input!.aspect_ratio).toBe("9:16");
        });
    });

    describe("image-to-video", () => {
        it("includes image input in request", async () => {
            let capturedBody: { keyframes?: { frame0?: { url?: string } } } | undefined;

            global.fetch = jest.fn(
                async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
                    if (init?.body) {
                        capturedBody = JSON.parse(init.body as string);
                    }
                    return createMockResponse({
                        id: "luma-gen-i2v",
                        state: "completed",
                        video: { url: "https://luma.storage/i2v.mp4" }
                    });
                }
            );

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "Make this image come alive",
                    imageInput: "https://example.com/source-image.jpg"
                }
            });

            await runWithTimers(handler.execute(input));

            expect(capturedBody!.keyframes?.frame0?.url).toBe(
                "https://example.com/source-image.jpg"
            );
        });

        it("interpolates image input from context", async () => {
            let capturedBody: { keyframes?: { frame0?: { url?: string } } } | undefined;

            global.fetch = jest.fn(
                async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
                    if (init?.body) {
                        capturedBody = JSON.parse(init.body as string);
                    }
                    return createMockResponse({
                        id: "luma-gen-i2v-interp",
                        state: "completed",
                        video: { url: "https://luma.storage/i2v-interp.mp4" }
                    });
                }
            );

            const context = createTestContext({
                nodeOutputs: {
                    imageGen: { url: "https://generated.example.com/image.png" }
                }
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "Animate this",
                    imageInput: "{{imageGen.url}}"
                },
                context
            });

            await runWithTimers(handler.execute(input));

            expect(capturedBody!.keyframes?.frame0?.url).toBe(
                "https://generated.example.com/image.png"
            );
        });
    });
});
