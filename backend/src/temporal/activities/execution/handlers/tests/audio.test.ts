/**
 * Audio Node Handler Unit Tests
 *
 * Tests audio processing logic:
 * - Handler properties and operation support
 * - Transcription (STT) with OpenAI Whisper
 * - Text-to-speech (TTS) with OpenAI and ElevenLabs
 * - Variable interpolation
 * - Output formats (base64, path)
 * - Error handling
 *
 * Note: External API calls are mocked using nock for TTS,
 * and OpenAI SDK is mocked for transcription.
 */

import nock from "nock";

// Mock OpenAI SDK for transcription (before any imports that use it)
const mockTranscriptionCreate = jest.fn();
const mockSpeechCreate = jest.fn();

jest.mock("openai", () => {
    return jest.fn().mockImplementation(() => ({
        audio: {
            transcriptions: {
                create: mockTranscriptionCreate
            },
            speech: {
                create: mockSpeechCreate
            }
        }
    }));
});

// Mock modules - use require() inside factory to avoid Jest hoisting issues
jest.mock("../../../../../core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../../../../../tests/helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../../../storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../../../../../tests/helpers/module-mocks");
    return mockDatabase();
});
jest.mock("fs/promises", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockFsPromises } = require("../../../../../../tests/helpers/module-mocks");
    return mockFsPromises();
});

import {
    createHandlerInput,
    createTestContext,
    mustacheRef
} from "../../../../../../tests/helpers/handler-test-utils";
import {
    setupHttpMocking,
    teardownHttpMocking,
    clearHttpMocks
} from "../../../../../../tests/helpers/http-mock";
import { AudioNodeHandler, createAudioNodeHandler } from "../ai/audio";

describe("AudioNodeHandler", () => {
    let handler: AudioNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createAudioNodeHandler();
        clearHttpMocks();
        jest.clearAllMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("AudioNodeHandler");
        });

        it("supports audio node type", () => {
            expect(handler.supportedNodeTypes).toContain("audio");
        });

        it("can handle audio type", () => {
            expect(handler.canHandle("audio")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("vision")).toBe(false);
        });
    });

    describe("config validation", () => {
        it("throws error for unsupported provider", async () => {
            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "unsupported",
                    operation: "tts",
                    model: "test-model",
                    textInput: "Hello"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/unsupported/i);
        });

        it("throws error for Google provider (not implemented)", async () => {
            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "google",
                    operation: "tts",
                    model: "test-model",
                    textInput: "Hello"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/not.*implemented/i);
        });
    });

    describe("OpenAI transcription", () => {
        beforeEach(() => {
            // Reset the mock before each test
            mockTranscriptionCreate.mockReset();
        });

        it("transcribes audio file and returns text", async () => {
            // Mock the audio file download
            nock("https://example.com")
                .get("/audio.mp3")
                .reply(200, Buffer.from("fake audio data"), {
                    "Content-Type": "audio/mpeg"
                });

            // Mock OpenAI transcription SDK
            mockTranscriptionCreate.mockResolvedValue({
                text: "This is the transcribed text from the audio file."
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: "https://example.com/audio.mp3"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("transcribe");
            expect(output.result.provider).toBe("openai");
            expect(output.result.text).toBe("This is the transcribed text from the audio file.");
        });

        it("passes language hint to transcription", async () => {
            nock("https://example.com")
                .get("/audio.mp3")
                .reply(200, Buffer.from("fake audio data"), {
                    "Content-Type": "audio/mpeg"
                });

            mockTranscriptionCreate.mockResolvedValue({
                text: "Bonjour, comment allez-vous?"
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: "https://example.com/audio.mp3",
                    language: "fr"
                }
            });

            const output = await handler.execute(input);

            expect(mockTranscriptionCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    language: "fr"
                })
            );
            expect(output.result.language).toBe("fr");
        });

        it("interpolates audio input URL from context", async () => {
            nock("https://storage.example.com")
                .get("/uploads/recording-123.mp3")
                .reply(200, Buffer.from("audio data"), {
                    "Content-Type": "audio/mpeg"
                });

            mockTranscriptionCreate.mockResolvedValue({
                text: "Transcribed content from uploaded file"
            });

            const context = createTestContext({
                nodeOutputs: {
                    upload: { audioUrl: "https://storage.example.com/uploads/recording-123.mp3" }
                }
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: mustacheRef("upload", "audioUrl")
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("Transcribed content from uploaded file");
        });

        it("passes prompt to transcription for context", async () => {
            nock("https://example.com").get("/audio.mp3").reply(200, Buffer.from("audio data"), {
                "Content-Type": "audio/mpeg"
            });

            mockTranscriptionCreate.mockResolvedValue({
                text: "Technical transcription with context"
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: "https://example.com/audio.mp3",
                    prompt: "This is a technical discussion about TypeScript"
                }
            });

            await handler.execute(input);

            expect(mockTranscriptionCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: "This is a technical discussion about TypeScript"
                })
            );
        });

        it("handles base64 audio input", async () => {
            const base64Audio = Buffer.from("fake audio content").toString("base64");

            mockTranscriptionCreate.mockResolvedValue({
                text: "Transcribed from base64"
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: `data:audio/mp3;base64,${base64Audio}`
                }
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("Transcribed from base64");
        });
    });

    describe("OpenAI text-to-speech", () => {
        beforeEach(() => {
            // Reset the mock before each test
            mockSpeechCreate.mockReset();
        });

        it("generates speech from text", async () => {
            const audioBuffer = Buffer.from("fake audio bytes");
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => audioBuffer
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Hello, this is a test.",
                    voice: "alloy"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("tts");
            expect(output.result.provider).toBe("openai");
            expect(output.result.model).toBe("tts-1");
            expect(output.result.audio).toBeDefined();
        });

        it("returns base64 audio by default", async () => {
            const audioBuffer = Buffer.from("audio content");
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => audioBuffer
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test"
                }
            });

            const output = await handler.execute(input);

            expect((output.result.audio as { base64?: string }).base64).toBe(
                audioBuffer.toString("base64")
            );
        });

        it("uses configured voice", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test",
                    voice: "nova"
                }
            });

            await handler.execute(input);

            expect(mockSpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    voice: "nova"
                })
            );
        });

        it("uses configured speed", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test",
                    speed: 1.5
                }
            });

            await handler.execute(input);

            expect(mockSpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    speed: 1.5
                })
            );
        });

        it("interpolates text from context", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const context = createTestContext({
                nodeOutputs: {
                    generate: { response: "This is the generated response to speak" }
                }
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: mustacheRef("generate", "response")
                },
                context
            });

            await handler.execute(input);

            expect(mockSpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: "This is the generated response to speak"
                })
            );
        });

        it("wraps result in outputVariable when specified", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test",
                    outputVariable: "speechResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("speechResult");
            const wrapped = output.result.speechResult as { operation: string };
            expect(wrapped.operation).toBe("tts");
        });
    });

    describe("ElevenLabs text-to-speech", () => {
        it("generates speech with ElevenLabs", async () => {
            nock("https://api.elevenlabs.io")
                .post(/\/v1\/text-to-speech\//)
                .reply(200, Buffer.from("elevenlabs audio"), {
                    "Content-Type": "audio/mpeg"
                });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "elevenlabs",
                    operation: "tts",
                    model: "eleven_monolingual_v1",
                    textInput: "Hello from ElevenLabs"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.operation).toBe("tts");
            expect(output.result.provider).toBe("elevenlabs");
        });

        it("uses voice ID for ElevenLabs", async () => {
            let capturedUrl: string | null = null;

            nock("https://api.elevenlabs.io")
                .post(/\/v1\/text-to-speech\//)
                .reply(function () {
                    capturedUrl = this.req.path;
                    return [200, Buffer.from("audio"), { "Content-Type": "audio/mpeg" }];
                });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "elevenlabs",
                    operation: "tts",
                    model: "eleven_monolingual_v1",
                    textInput: "Test",
                    voice: "custom-voice-id-123"
                }
            });

            await handler.execute(input);

            expect(capturedUrl).toContain("custom-voice-id-123");
        });

        it("sends voice settings to ElevenLabs", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.elevenlabs.io")
                .post(/\/v1\/text-to-speech\//, (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, Buffer.from("audio"), { "Content-Type": "audio/mpeg" });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "elevenlabs",
                    operation: "tts",
                    model: "eleven_monolingual_v1",
                    textInput: "Test",
                    stability: 0.8,
                    similarityBoost: 0.9
                }
            });

            await handler.execute(input);

            expect(capturedBody!.voice_settings).toEqual({
                stability: 0.8,
                similarity_boost: 0.9
            });
        });

        it("throws error for transcribe operation (not supported)", async () => {
            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "elevenlabs",
                    operation: "transcribe",
                    model: "eleven_monolingual_v1",
                    audioInput: "https://example.com/audio.mp3"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/only supports.*tts/i);
        });
    });

    describe("error handling", () => {
        it("handles transcription API errors", async () => {
            nock("https://example.com")
                .get("/audio.mp3")
                .reply(200, Buffer.from("audio"), { "Content-Type": "audio/mpeg" });

            mockTranscriptionCreate.mockRejectedValue(new Error("API Error: Rate limit exceeded"));

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: "https://example.com/audio.mp3"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles TTS API errors", async () => {
            mockSpeechCreate.mockRejectedValue(new Error("TTS API Error"));

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles ElevenLabs API errors", async () => {
            nock("https://api.elevenlabs.io")
                .post(/\/v1\/text-to-speech\//)
                .reply(429, { error: "Rate limit exceeded" });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "elevenlabs",
                    operation: "tts",
                    model: "eleven_monolingual_v1",
                    textInput: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles audio download errors", async () => {
            nock("https://example.com").get("/audio.mp3").reply(404, "Not Found");

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "transcribe",
                    model: "whisper-1",
                    audioInput: "https://example.com/audio.mp3"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/HTTP 404/);
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records character count for TTS", async () => {
            mockSpeechCreate.mockResolvedValue({
                arrayBuffer: async () => Buffer.from("audio")
            });

            const input = createHandlerInput({
                nodeType: "audio",
                nodeConfig: {
                    provider: "openai",
                    operation: "tts",
                    model: "tts-1",
                    textInput: "This is a test message with some words"
                }
            });

            const output = await handler.execute(input);

            const metadata = output.result.metadata as { charactersUsed?: number };
            expect(metadata?.charactersUsed).toBe(38);
        });
    });
});
