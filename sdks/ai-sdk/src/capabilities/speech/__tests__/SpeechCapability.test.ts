/**
 * Tests for SpeechCapability
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
import { SpeechCapability } from "../index";
import type { SpeechProvider } from "../../../providers/base";
import type { TTSResponse, TranscriptionResponse } from "../types";

// Mock provider
function createMockSpeechProvider(overrides?: Partial<SpeechProvider>): SpeechProvider {
    return {
        provider: "openai",
        supportedModels: ["tts-1", "tts-1-hd", "whisper-1"],
        supportsModel: vi.fn().mockReturnValue(true),
        supportsTranscription: vi.fn().mockReturnValue(true),
        supportsTTS: vi.fn().mockReturnValue(true),
        transcribe: vi.fn().mockResolvedValue({
            text: "Hello, this is a transcription test.",
            language: "en",
            duration: 5.5,
            segments: [{ id: 0, start: 0, end: 2.5, text: "Hello, this is a transcription test." }],
            metadata: {
                processingTimeMs: 1000,
                provider: "openai",
                model: "whisper-1"
            }
        } as TranscriptionResponse),
        textToSpeech: vi.fn().mockResolvedValue({
            url: "https://example.com/audio.mp3",
            metadata: {
                processingTimeMs: 500,
                provider: "openai",
                model: "tts-1-hd",
                charactersUsed: 42,
                duration: 3.5
            }
        } as TTSResponse),
        ...overrides
    };
}

describe("SpeechCapability", () => {
    let registry: ProviderRegistry;
    let capability: SpeechCapability;
    let mockProvider: SpeechProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { openai: { apiKey: TEST_API_KEYS.openai } },
            logger: silentTestLogger
        });

        mockProvider = createMockSpeechProvider();

        registry.registerSpeechProvider("openai", () => mockProvider);
        registry.setDefaultProvider("speech", "openai");

        capability = new SpeechCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("synthesize", () => {
        it("should call provider textToSpeech method", async () => {
            const request = {
                model: "tts-1-hd",
                text: "Hello world",
                voice: "alloy",
                provider: "openai" as const
            };

            const response = await capability.synthesize(request);

            expect(mockProvider.textToSpeech).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.url).toBe("https://example.com/audio.mp3");
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "tts-1", text: "Hello world", voice: "alloy" };

            await capability.synthesize(request);

            expect(mockProvider.textToSpeech).toHaveBeenCalled();
        });

        it("should handle voice parameter", async () => {
            const request = {
                model: "tts-1-hd",
                text: "Test speech",
                voice: "echo",
                provider: "openai" as const
            };

            await capability.synthesize(request);

            expect(mockProvider.textToSpeech).toHaveBeenCalledWith(
                expect.objectContaining({ voice: "echo" }),
                expect.anything()
            );
        });

        it("should handle speed parameter", async () => {
            const request = {
                model: "tts-1",
                text: "Fast speech",
                voice: "alloy",
                speed: 1.5,
                provider: "openai" as const
            };

            await capability.synthesize(request);

            expect(mockProvider.textToSpeech).toHaveBeenCalledWith(
                expect.objectContaining({ speed: 1.5 }),
                expect.anything()
            );
        });

        it("should return audio URL", async () => {
            const response = await capability.synthesize({
                model: "tts-1",
                text: "Test",
                voice: "alloy",
                provider: "openai" as const
            });

            expect(response.url).toBe("https://example.com/audio.mp3");
        });

        it("should return metadata with characters used", async () => {
            const response = await capability.synthesize({
                model: "tts-1",
                text: "Test",
                voice: "alloy",
                provider: "openai" as const
            });

            expect(response.metadata.charactersUsed).toBe(42);
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new SpeechCapability(registry, fastRetryConfig, logger);

            await capability.synthesize({
                model: "tts-1",
                text: "Hello",
                voice: "alloy",
                provider: "openai" as const
            });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Text-to-speech request")).toBe(true);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.textToSpeech = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    url: "https://example.com/audio.mp3",
                    metadata: {
                        processingTimeMs: 500,
                        provider: "openai",
                        model: "tts-1",
                        charactersUsed: 5
                    }
                } as TTSResponse);

            const resultPromise = capability.synthesize({
                model: "tts-1",
                text: "Test",
                voice: "alloy",
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.url).toBe("https://example.com/audio.mp3");
            expect(mockProvider.textToSpeech).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });
    });

    describe("transcribe", () => {
        it("should call provider transcribe method", async () => {
            const request = {
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            };

            const response = await capability.transcribe(request);

            expect(mockProvider.transcribe).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.text).toBe("Hello, this is a transcription test.");
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "whisper-1", audioInput: "https://example.com/audio.mp3" };

            await capability.transcribe(request);

            expect(mockProvider.transcribe).toHaveBeenCalled();
        });

        it("should handle language parameter", async () => {
            const request = {
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                language: "es",
                provider: "openai" as const
            };

            await capability.transcribe(request);

            expect(mockProvider.transcribe).toHaveBeenCalledWith(
                expect.objectContaining({ language: "es" }),
                expect.anything()
            );
        });

        it("should return detected language", async () => {
            const response = await capability.transcribe({
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            });

            expect(response.language).toBe("en");
        });

        it("should return segments when available", async () => {
            const response = await capability.transcribe({
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            });

            expect(response.segments).toBeDefined();
            expect(response.segments?.length).toBeGreaterThan(0);
        });

        it("should return duration", async () => {
            const response = await capability.transcribe({
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            });

            expect(response.duration).toBe(5.5);
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new SpeechCapability(registry, fastRetryConfig, logger);

            await capability.transcribe({
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Transcription request")).toBe(true);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.transcribe = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    text: "Success",
                    metadata: { processingTimeMs: 500, provider: "openai", model: "whisper-1" }
                } as TranscriptionResponse);

            const resultPromise = capability.transcribe({
                model: "whisper-1",
                audioInput: "https://example.com/audio.mp3",
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.text).toBe("Success");
            expect(mockProvider.transcribe).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });
    });

    describe("getAvailableProviders", () => {
        it("should return available speech providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
        });
    });
});
