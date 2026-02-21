/**
 * Tests for VisionCapability
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    TEST_API_KEYS,
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger,
    testVisionAnalysisRequest
} from "../../../__tests__/fixtures/configs";
import { RateLimitError } from "../../../core/errors";
import { ProviderRegistry } from "../../../providers/registry";
import { VisionCapability } from "../index";
import type { VisionProvider } from "../../../providers/base";
import type { VisionAnalysisResponse } from "../types";

// Mock provider
function createMockVisionProvider(overrides?: Partial<VisionProvider>): VisionProvider {
    return {
        provider: "openai",
        supportedModels: ["gpt-4-vision-preview", "gpt-4o"],
        supportsModel: vi.fn().mockReturnValue(true),
        analyze: vi.fn().mockResolvedValue({
            description: "This image shows a beautiful mountain landscape with a sunset.",
            objects: ["mountain", "sunset", "sky", "clouds"],
            metadata: {
                processingTimeMs: 2000,
                provider: "openai",
                model: "gpt-4-vision-preview",
                usage: { promptTokens: 500, completionTokens: 100, totalTokens: 600 }
            }
        } as VisionAnalysisResponse),
        ...overrides
    };
}

describe("VisionCapability", () => {
    let registry: ProviderRegistry;
    let capability: VisionCapability;
    let mockProvider: VisionProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { openai: { apiKey: TEST_API_KEYS.openai } },
            logger: silentTestLogger
        });

        mockProvider = createMockVisionProvider();

        registry.registerVisionProvider("openai", () => mockProvider);
        registry.setDefaultProvider("vision", "openai");

        capability = new VisionCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("analyze", () => {
        it("should call provider analyze method", async () => {
            const request = { ...testVisionAnalysisRequest, provider: "openai" as const };

            const response = await capability.analyze(request);

            expect(mockProvider.analyze).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.description).toBeDefined();
        });

        it("should use default provider when not specified", async () => {
            const request = {
                model: "gpt-4-vision-preview",
                image: "https://example.com/image.jpg",
                prompt: "Describe this image"
            };

            await capability.analyze(request);

            expect(mockProvider.analyze).toHaveBeenCalled();
        });

        it("should handle URL image", async () => {
            const request = {
                model: "gpt-4-vision-preview",
                image: "https://example.com/photo.jpg",
                prompt: "What is in this image?",
                provider: "openai" as const
            };

            await capability.analyze(request);

            expect(mockProvider.analyze).toHaveBeenCalledWith(
                expect.objectContaining({ image: "https://example.com/photo.jpg" }),
                expect.anything()
            );
        });

        it("should handle base64 image", async () => {
            const request = {
                model: "gpt-4-vision-preview",
                image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
                prompt: "Describe this",
                provider: "openai" as const
            };

            await capability.analyze(request);

            expect(mockProvider.analyze).toHaveBeenCalledWith(
                expect.objectContaining({ image: expect.stringContaining("data:image") }),
                expect.anything()
            );
        });

        it("should handle detail parameter", async () => {
            const request = {
                model: "gpt-4-vision-preview",
                image: "https://example.com/image.jpg",
                prompt: "Describe in detail",
                detail: "high" as const,
                provider: "openai" as const
            };

            await capability.analyze(request);

            expect(mockProvider.analyze).toHaveBeenCalledWith(
                expect.objectContaining({ detail: "high" }),
                expect.anything()
            );
        });

        it("should return objects array when available", async () => {
            const response = await capability.analyze({
                model: "gpt-4-vision-preview",
                image: "https://example.com/image.jpg",
                prompt: "What objects are visible?",
                provider: "openai" as const
            });

            expect(response.objects).toContain("mountain");
            expect(response.objects).toContain("sunset");
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new VisionCapability(registry, fastRetryConfig, logger);

            await capability.analyze({ ...testVisionAnalysisRequest, provider: "openai" as const });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Vision analysis request")).toBe(true);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.analyze = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    description: "Success after retry",
                    metadata: {
                        processingTimeMs: 2000,
                        provider: "openai",
                        model: "gpt-4-vision-preview"
                    }
                } as VisionAnalysisResponse);

            const resultPromise = capability.analyze({
                ...testVisionAnalysisRequest,
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.description).toBe("Success after retry");
            expect(mockProvider.analyze).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it("should handle multiple images", async () => {
            const request = {
                model: "gpt-4-vision-preview",
                images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
                prompt: "Compare these images",
                provider: "openai" as const
            };

            await capability.analyze(
                request as { model: string; images: string[]; prompt: string; provider: "openai" }
            );

            expect(mockProvider.analyze).toHaveBeenCalled();
        });
    });

    describe("getAvailableProviders", () => {
        it("should return available vision providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
        });
    });
});
