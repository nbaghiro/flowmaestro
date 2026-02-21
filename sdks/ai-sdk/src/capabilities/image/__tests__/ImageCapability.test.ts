/**
 * Tests for ImageCapability
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    TEST_API_KEYS,
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger,
    testImageGenerationRequest
} from "../../../__tests__/fixtures/configs";
import { RateLimitError } from "../../../core/errors";
import { ProviderRegistry } from "../../../providers/registry";
import { ImageCapability } from "../index";
import type { ImageGenerationProvider } from "../../../providers/base";
import type { ImageGenerationResponse } from "../types";

// Mock provider
function createMockImageProvider(
    overrides?: Partial<ImageGenerationProvider>
): ImageGenerationProvider {
    return {
        provider: "openai",
        supportedModels: ["dall-e-3", "dall-e-2"],
        supportsModel: vi.fn().mockReturnValue(true),
        supportsOperation: vi.fn().mockReturnValue(true),
        generate: vi.fn().mockResolvedValue({
            images: [
                {
                    url: "https://example.com/generated-image.png",
                    revisedPrompt: "A beautiful sunset with mountains"
                }
            ],
            operation: "generate",
            metadata: {
                processingTimeMs: 5000,
                provider: "openai",
                model: "dall-e-3"
            }
        } as ImageGenerationResponse),
        ...overrides
    };
}

describe("ImageCapability", () => {
    let registry: ProviderRegistry;
    let capability: ImageCapability;
    let mockProvider: ImageGenerationProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { openai: { apiKey: TEST_API_KEYS.openai } },
            logger: silentTestLogger
        });

        mockProvider = createMockImageProvider();

        registry.registerImageProvider("openai", () => mockProvider);
        registry.setDefaultProvider("image", "openai");

        capability = new ImageCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("generate", () => {
        it("should call provider generate method", async () => {
            const request = { ...testImageGenerationRequest, provider: "openai" as const };

            const response = await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.images.length).toBe(1);
            expect(response.images[0].url).toBe("https://example.com/generated-image.png");
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "dall-e-3", prompt: "A cat" };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalled();
        });

        it("should handle size parameter", async () => {
            const request = {
                model: "dall-e-3",
                prompt: "A landscape",
                size: "1792x1024" as const,
                provider: "openai" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ size: "1792x1024" }),
                expect.anything()
            );
        });

        it("should handle quality parameter", async () => {
            const request = {
                model: "dall-e-3",
                prompt: "A portrait",
                quality: "hd" as const,
                provider: "openai" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ quality: "hd" }),
                expect.anything()
            );
        });

        it("should handle multiple images (n parameter)", async () => {
            mockProvider.generate = vi.fn().mockResolvedValue({
                images: [
                    { url: "https://example.com/image1.png" },
                    { url: "https://example.com/image2.png" }
                ],
                operation: "generate",
                metadata: { processingTimeMs: 8000, provider: "openai", model: "dall-e-3" }
            } as ImageGenerationResponse);

            const request = {
                model: "dall-e-3",
                prompt: "A cat",
                n: 2,
                provider: "openai" as const
            };

            const response = await capability.generate(request);

            expect(response.images.length).toBe(2);
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new ImageCapability(registry, fastRetryConfig, logger);

            await capability.generate({
                ...testImageGenerationRequest,
                provider: "openai" as const
            });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Image generation request")).toBe(true);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.generate = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    images: [{ url: "https://example.com/image.png" }],
                    operation: "generate",
                    metadata: { processingTimeMs: 5000, provider: "openai", model: "dall-e-3" }
                } as ImageGenerationResponse);

            const resultPromise = capability.generate({
                ...testImageGenerationRequest,
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.images.length).toBe(1);
            expect(mockProvider.generate).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it("should handle base64 response format", async () => {
            mockProvider.generate = vi.fn().mockResolvedValue({
                images: [{ base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ..." }],
                operation: "generate",
                metadata: { processingTimeMs: 5000, provider: "openai", model: "dall-e-3" }
            } as ImageGenerationResponse);

            const response = await capability.generate({
                model: "dall-e-3",
                prompt: "test",
                provider: "openai" as const
            });

            expect(response.images[0].base64).toBeDefined();
        });

        it("should handle negative prompt", async () => {
            const request = {
                model: "dall-e-3",
                prompt: "A beautiful garden",
                negativePrompt: "ugly, blurry",
                provider: "openai" as const
            };

            await capability.generate(request);

            expect(mockProvider.generate).toHaveBeenCalledWith(
                expect.objectContaining({ negativePrompt: "ugly, blurry" }),
                expect.anything()
            );
        });
    });

    describe("supportsOperation", () => {
        it("should delegate to provider", () => {
            mockProvider.supportsOperation = vi.fn().mockReturnValue(true);

            const result = capability.supportsOperation("openai", "generate");

            expect(result).toBe(true);
            expect(mockProvider.supportsOperation).toHaveBeenCalledWith("generate");
        });

        it("should return false for unknown provider", () => {
            const result = capability.supportsOperation("unknown" as "openai", "generate");

            expect(result).toBe(false);
        });

        it("should return false when provider throws", () => {
            mockProvider.supportsOperation = vi.fn().mockImplementation(() => {
                throw new Error("Provider error");
            });

            const result = capability.supportsOperation("openai", "generate");

            expect(result).toBe(false);
        });
    });

    describe("getAvailableProviders", () => {
        it("should return available image providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
        });
    });
});
