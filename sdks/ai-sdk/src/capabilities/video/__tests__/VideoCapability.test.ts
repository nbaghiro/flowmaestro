/**
 * Tests for VideoCapability
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    TEST_API_KEYS,
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger
} from "../../../__tests__/fixtures/configs";
import { RateLimitError } from "../../../core/errors";
import { ProviderRegistry } from "../../../providers/registry";
import { VideoCapability } from "../index";
import type { VideoGenerationProvider } from "../../../providers/base";
import type { VideoGenerationResponse } from "../types";

// Mock provider
function createMockVideoProvider(
    overrides?: Partial<VideoGenerationProvider>
): VideoGenerationProvider {
    return {
        provider: "runway",
        supportedModels: ["gen-3", "gen-2"],
        supportsModel: vi.fn().mockReturnValue(true),
        supportsImageInput: vi.fn().mockReturnValue(true),
        generate: vi.fn().mockResolvedValue({
            videoUrl: "https://example.com/video.mp4",
            thumbnailUrl: "https://example.com/thumbnail.jpg",
            durationSeconds: 5,
            metadata: {
                processingTimeMs: 60000,
                provider: "runway",
                model: "gen-3"
            }
        } as VideoGenerationResponse),
        ...overrides
    };
}

describe("VideoCapability", () => {
    let registry: ProviderRegistry;
    let capability: VideoCapability;
    let mockProvider: VideoGenerationProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { runway: { apiKey: TEST_API_KEYS.runway } },
            logger: silentTestLogger
        });

        mockProvider = createMockVideoProvider();

        registry.registerVideoProvider("runway", () => mockProvider);
        registry.setDefaultProvider("video", "runway");

        // VideoCapability takes 3 args: registry, retryConfig, logger
        capability = new VideoCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("generate", () => {
        it("should call provider generate method", async () => {
            const request = {
                model: "gen-3",
                prompt: "A forest scene",
                provider: "runway" as const
            };

            const response = await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(request, TEST_API_KEYS.runway);
            expect(response.videoUrl).toBe("https://example.com/video.mp4");
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "gen-3", prompt: "A forest scene" };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalled();
        });

        it("should handle aspect ratio parameter", async () => {
            const request = {
                model: "gen-3",
                prompt: "A landscape",
                aspectRatio: "21:9" as const,
                provider: "runway" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ aspectRatio: "21:9" }),
                expect.anything()
            );
        });

        it("should handle duration parameter", async () => {
            const request = {
                model: "gen-3",
                prompt: "A short clip",
                durationSeconds: 10,
                provider: "runway" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ durationSeconds: 10 }),
                expect.anything()
            );
        });

        it("should handle imageInput for image-to-video", async () => {
            const request = {
                model: "gen-3",
                prompt: "Animate this scene",
                imageInput: "https://example.com/source.jpg",
                provider: "runway" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ imageInput: "https://example.com/source.jpg" }),
                expect.anything()
            );
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new VideoCapability(registry, fastRetryConfig, logger);

            await capability.generate({
                model: "gen-3",
                prompt: "test",
                provider: "runway" as const
            });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Video generation request")).toBe(true);
        });

        it("should return thumbnail URL when provided", async () => {
            const response = await capability.generate({
                model: "gen-3",
                prompt: "test",
                provider: "runway" as const
            });

            expect(response.thumbnailUrl).toBe("https://example.com/thumbnail.jpg");
        });

        it("should return duration", async () => {
            const response = await capability.generate({
                model: "gen-3",
                prompt: "test",
                provider: "runway" as const
            });

            expect(response.durationSeconds).toBe(5);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.generate = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("runway"))
                .mockResolvedValue({
                    videoUrl: "https://example.com/video.mp4",
                    metadata: { processingTimeMs: 60000, provider: "runway", model: "gen-3" }
                } as VideoGenerationResponse);

            const resultPromise = capability.generate({
                model: "gen-3",
                prompt: "test",
                provider: "runway" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.videoUrl).toBe("https://example.com/video.mp4");
            expect(mockProvider.generate).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });
    });

    describe("supportsImageInput", () => {
        it("should delegate to provider", () => {
            mockProvider.supportsImageInput = vi.fn().mockReturnValue(true);

            const result = capability.supportsImageInput("runway", "gen-3");

            expect(result).toBe(true);
            expect(mockProvider.supportsImageInput).toHaveBeenCalledWith("gen-3");
        });

        it("should return false for unknown provider", () => {
            const result = capability.supportsImageInput("unknown" as "runway", "model");

            expect(result).toBe(false);
        });

        it("should return false when provider throws", () => {
            mockProvider.supportsImageInput = vi.fn().mockImplementation(() => {
                throw new Error("Provider error");
            });

            const result = capability.supportsImageInput("runway", "model");

            expect(result).toBe(false);
        });
    });

    describe("getAvailableProviders", () => {
        it("should return available video providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("runway");
        });
    });
});
