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

import nock from "nock";

import {
    VideoGenerationNodeHandler,
    createVideoGenerationNodeHandler
} from "../../../../src/temporal/activities/execution/handlers/ai/video-generation";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../helpers/handler-test-utils";

// Mock the config to provide API keys
jest.mock("../../../../src/core/config", () => ({
    config: {
        ai: {
            google: { apiKey: "test-google-key" },
            replicate: { apiKey: "test-replicate-key" },
            runway: { apiKey: "test-runway-key" },
            luma: { apiKey: "test-luma-key" },
            stabilityai: { apiKey: "test-stability-key" }
        }
    }
}));

// Mock the connection repository
jest.mock("../../../../src/storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: jest.fn().mockResolvedValue(null)
    }))
}));

// Mock the database module to prevent actual DB connections
jest.mock("../../../../src/storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            pool: {
                query: jest.fn(),
                connect: jest.fn()
            }
        })
    },
    db: {
        query: jest.fn(),
        connect: jest.fn()
    }
}));

describe("VideoGenerationNodeHandler", () => {
    let handler: VideoGenerationNodeHandler;

    beforeEach(() => {
        handler = createVideoGenerationNodeHandler();
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

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
            // Mock the initial request
            nock("https://generativelanguage.googleapis.com")
                .post("/v1beta/models/veo-3.0-generate-preview:predictLongRunning")
                .reply(200, {
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

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.provider).toBe("google");
            expect(output.result.model).toBe("veo-3");
            expect(output.result.video).toBeDefined();
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://storage.googleapis.com/video.mp4");
        });

        it("interpolates variables in prompt", async () => {
            let capturedBody: { instances?: Array<{ prompt: string }> } | undefined;

            nock("https://generativelanguage.googleapis.com")
                .post("/v1beta/models/veo-3.0-generate-preview:predictLongRunning")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return {
                        name: "operations/video-op-123",
                        done: true,
                        response: {
                            generateVideoResponse: {
                                generatedSamples: [
                                    { video: { uri: "https://storage.googleapis.com/video.mp4" } }
                                ]
                            }
                        }
                    };
                });

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

            await handler.execute(input);

            expect(capturedBody!.instances![0].prompt).toBe(
                "Generate a video of a cat playing piano"
            );
        });

        it("polls for completion when not immediately done", async () => {
            const operationName = "operations/video-op-polling";

            nock("https://generativelanguage.googleapis.com")
                .post("/v1beta/models/veo-3.0-generate-preview:predictLongRunning")
                .reply(200, {
                    name: operationName,
                    done: false
                });

            // First poll - still processing
            nock("https://generativelanguage.googleapis.com")
                .get(`/v1beta/${operationName}`)
                .reply(200, {
                    name: operationName,
                    done: false
                });

            // Second poll - done
            nock("https://generativelanguage.googleapis.com")
                .get(`/v1beta/${operationName}`)
                .reply(200, {
                    name: operationName,
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

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "Test prompt"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://storage.googleapis.com/polled-video.mp4");
        }, 15000);

        it("throws error on API failure", async () => {
            nock("https://generativelanguage.googleapis.com")
                .post("/v1beta/models/veo-3.0-generate-preview:predictLongRunning")
                .reply(400, { error: { message: "Invalid request" } });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "google",
                    model: "veo-3",
                    prompt: "Test prompt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Google Veo API error/);
        });
    });

    describe("Replicate provider", () => {
        it("generates video with immediate success", async () => {
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "replicate-pred-123",
                    status: "succeeded",
                    output: ["https://replicate.delivery/video.mp4"]
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "minimax/video-01",
                    prompt: "A dancing robot",
                    aspectRatio: "16:9"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.provider).toBe("replicate");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://replicate.delivery/video.mp4");
        });

        it("polls for completion", async () => {
            nock("https://api.replicate.com").post("/v1/predictions").reply(200, {
                id: "replicate-pred-456",
                status: "processing"
            });

            nock("https://api.replicate.com").get("/v1/predictions/replicate-pred-456").reply(200, {
                id: "replicate-pred-456",
                status: "succeeded",
                output: "https://replicate.delivery/final-video.mp4"
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "wan-2.5-i2v",
                    prompt: "Animate this image"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://replicate.delivery/final-video.mp4");
        }, 15000);

        it("throws error on generation failure", async () => {
            nock("https://api.replicate.com").post("/v1/predictions").reply(200, {
                id: "replicate-pred-fail",
                status: "failed",
                error: "Content policy violation"
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /Replicate video generation failed/
            );
        });
    });

    describe("Runway provider", () => {
        it("generates video and polls for completion", async () => {
            nock("https://api.dev.runwayml.com").post("/v1/tasks").reply(200, {
                id: "runway-task-123",
                status: "PENDING"
            });

            nock("https://api.dev.runwayml.com")
                .get("/v1/tasks/runway-task-123")
                .reply(200, {
                    id: "runway-task-123",
                    status: "SUCCEEDED",
                    output: ["https://runway.storage/video.mp4"]
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

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.provider).toBe("runway");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://runway.storage/video.mp4");
        }, 15000);

        it("throws error on task failure", async () => {
            nock("https://api.dev.runwayml.com").post("/v1/tasks").reply(200, {
                id: "runway-task-fail",
                status: "PENDING"
            });

            nock("https://api.dev.runwayml.com").get("/v1/tasks/runway-task-fail").reply(200, {
                id: "runway-task-fail",
                status: "FAILED",
                failure: "Insufficient credits"
            });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "runway",
                    model: "gen3a_turbo",
                    prompt: "Test prompt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Runway generation failed/);
        }, 15000);
    });

    describe("Luma provider", () => {
        it("generates video and polls for completion", async () => {
            nock("https://api.lumalabs.ai").post("/dream-machine/v1/generations").reply(200, {
                id: "luma-gen-123",
                state: "pending"
            });

            nock("https://api.lumalabs.ai")
                .get("/dream-machine/v1/generations/luma-gen-123")
                .reply(200, {
                    id: "luma-gen-123",
                    state: "completed",
                    video: { url: "https://luma.storage/video.mp4" }
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

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.provider).toBe("luma");
            const video = output.result.video as { url?: string };
            expect(video.url).toBe("https://luma.storage/video.mp4");
        }, 15000);

        it("sends loop parameter in request", async () => {
            let capturedBody: { loop?: boolean } | undefined;

            nock("https://api.lumalabs.ai")
                .post("/dream-machine/v1/generations")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return {
                        id: "luma-gen-loop",
                        state: "completed",
                        video: { url: "https://luma.storage/loop.mp4" }
                    };
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "A spinning globe",
                    loop: true
                }
            });

            await handler.execute(input);

            expect(capturedBody!.loop).toBe(true);
        });

        it("throws error on generation failure", async () => {
            nock("https://api.lumalabs.ai").post("/dream-machine/v1/generations").reply(200, {
                id: "luma-gen-fail",
                state: "pending"
            });

            nock("https://api.lumalabs.ai")
                .get("/dream-machine/v1/generations/luma-gen-fail")
                .reply(200, {
                    id: "luma-gen-fail",
                    state: "failed",
                    failure_reason: "Invalid input dimensions"
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "Test prompt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Luma generation failed/);
        }, 15000);
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

            await expect(handler.execute(input)).rejects.toThrow(
                /Stability AI video generation requires an image input/
            );
        });

        it("generates video from image", async () => {
            // Mock image fetch
            nock("https://example.com")
                .get("/input-image.png")
                .reply(200, Buffer.from("fake-image-data"));

            nock("https://api.stability.ai").post("/v2beta/image-to-video").reply(200, {
                id: "stability-gen-123"
            });

            // First poll - still processing
            nock("https://api.stability.ai")
                .get("/v2beta/image-to-video/result/stability-gen-123")
                .reply(202);

            // Second poll - done
            nock("https://api.stability.ai")
                .get("/v2beta/image-to-video/result/stability-gen-123")
                .reply(200, Buffer.from("video-data"), {
                    "Content-Type": "video/mp4"
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

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.provider).toBe("stabilityai");
            const video = output.result.video as { base64?: string };
            expect(video.base64).toBeDefined();
        }, 15000);
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

            await expect(handler.execute(input)).rejects.toThrow(
                /Unsupported video generation provider/
            );
        });
    });

    describe("output variable", () => {
        it("stores result in outputVariable when specified", async () => {
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "replicate-pred-output",
                    status: "succeeded",
                    output: ["https://replicate.delivery/output.mp4"]
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt",
                    outputVariable: "generatedVideo"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.generatedVideo).toBeDefined();
            const generatedVideo = output.result.generatedVideo as { provider: string };
            expect(generatedVideo.provider).toBe("replicate");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "replicate-pred-metrics",
                    status: "succeeded",
                    output: ["https://replicate.delivery/metrics.mp4"]
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("includes processing time in metadata", async () => {
            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, {
                    id: "replicate-pred-time",
                    status: "succeeded",
                    output: ["https://replicate.delivery/time.mp4"]
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt"
                }
            });

            const output = await handler.execute(input);

            const metadata = output.result.metadata as { processingTime: number };
            expect(metadata?.processingTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("aspect ratio configuration", () => {
        it("passes aspect ratio to provider", async () => {
            let capturedBody: { input?: { aspect_ratio?: string } } | undefined;

            nock("https://api.replicate.com")
                .post("/v1/predictions")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return {
                        id: "replicate-pred-aspect",
                        status: "succeeded",
                        output: ["https://replicate.delivery/aspect.mp4"]
                    };
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "replicate",
                    model: "test-model",
                    prompt: "Test prompt",
                    aspectRatio: "9:16"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.input!.aspect_ratio).toBe("9:16");
        });
    });

    describe("image-to-video", () => {
        it("includes image input in request", async () => {
            let capturedBody: { keyframes?: { frame0?: { url?: string } } } | undefined;

            nock("https://api.lumalabs.ai")
                .post("/dream-machine/v1/generations")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return {
                        id: "luma-gen-i2v",
                        state: "completed",
                        video: { url: "https://luma.storage/i2v.mp4" }
                    };
                });

            const input = createHandlerInput({
                nodeType: "videoGeneration",
                nodeConfig: {
                    provider: "luma",
                    model: "ray2",
                    prompt: "Make this image come alive",
                    imageInput: "https://example.com/source-image.jpg"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.keyframes?.frame0?.url).toBe(
                "https://example.com/source-image.jpg"
            );
        });

        it("interpolates image input from context", async () => {
            let capturedBody: { keyframes?: { frame0?: { url?: string } } } | undefined;

            nock("https://api.lumalabs.ai")
                .post("/dream-machine/v1/generations")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return {
                        id: "luma-gen-i2v-interp",
                        state: "completed",
                        video: { url: "https://luma.storage/i2v-interp.mp4" }
                    };
                });

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

            await handler.execute(input);

            expect(capturedBody!.keyframes?.frame0?.url).toBe(
                "https://generated.example.com/image.png"
            );
        });
    });
});
