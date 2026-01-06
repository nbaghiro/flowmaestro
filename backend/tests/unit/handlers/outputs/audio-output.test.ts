/**
 * Audio Output Node Handler Unit Tests (TTS - Text-to-Speech)
 *
 * Tests speech synthesis:
 * - Provider routing (OpenAI, ElevenLabs, Deepgram)
 * - Variable interpolation in text
 * - Voice and model configuration
 * - Output format options (mp3, wav, opus)
 * - URL vs base64 output
 * - Terminal node signaling
 */

// Mock modules - use require() inside factory to avoid Jest hoisting issues
jest.mock("../../../../src/core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../../helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../../src/storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../../helpers/module-mocks");
    return mockDatabase();
});

// Mock OpenAI
const mockOpenAISpeechCreate = jest.fn();
jest.mock("openai", () => {
    return jest.fn().mockImplementation(() => ({
        audio: {
            speech: {
                create: mockOpenAISpeechCreate
            }
        }
    }));
});

// Mock GCS storage service
const mockUploadBuffer = jest.fn();
jest.mock("../../../../src/services/GCSStorageService", () => ({
    getArtifactsStorageService: jest.fn(() => ({
        uploadBuffer: mockUploadBuffer
    }))
}));

import nock from "nock";
import {
    AudioOutputNodeHandler,
    createAudioOutputNodeHandler
} from "../../../../src/temporal/activities/execution/handlers/outputs/audio-output";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../helpers/handler-test-utils";

describe("AudioOutputNodeHandler", () => {
    let handler: AudioOutputNodeHandler;

    const mockAudioBuffer = Buffer.from("fake-audio-data");
    const mockArrayBuffer = mockAudioBuffer.buffer.slice(
        mockAudioBuffer.byteOffset,
        mockAudioBuffer.byteOffset + mockAudioBuffer.byteLength
    );

    beforeEach(() => {
        handler = createAudioOutputNodeHandler();
        jest.clearAllMocks();
        nock.cleanAll();

        // Default mock for OpenAI
        mockOpenAISpeechCreate.mockResolvedValue({
            arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        });

        // Default mock for GCS upload
        mockUploadBuffer.mockResolvedValue("gs://artifacts/audio-output/test.mp3");
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("AudioOutputNodeHandler");
        });

        it("supports audioOutput node type", () => {
            expect(handler.supportedNodeTypes).toContain("audioOutput");
        });

        it("can handle audioOutput type", () => {
            expect(handler.canHandle("audioOutput")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("audioInput")).toBe(false);
            expect(handler.canHandle("output")).toBe(false);
            expect(handler.canHandle("llm")).toBe(false);
        });
    });

    describe("OpenAI provider", () => {
        it("synthesizes speech successfully", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Hello, this is a test.",
                    outputVariable: "audioResult"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.audioResult).toBeDefined();

            const result = output.result.audioResult as {
                provider: string;
                model: string;
                charactersUsed: number;
                audio: { base64?: string; format: string };
            };
            expect(result.provider).toBe("openai");
            expect(result.model).toBe("tts-1");
            expect(result.charactersUsed).toBe(22);
            expect(result.audio.base64).toBeDefined();
            expect(result.audio.format).toBe("mp3");
        });

        it("passes voice and speed to API", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1-hd",
                    voice: "nova",
                    speed: 1.25,
                    textInput: "Fast speech",
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(mockOpenAISpeechCreate).toHaveBeenCalledWith({
                model: "tts-1-hd",
                voice: "nova",
                input: "Fast speech",
                speed: 1.25,
                response_format: "mp3"
            });
        });

        it("supports different output formats", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test",
                    outputFormat: "wav",
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(mockOpenAISpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    response_format: "wav"
                })
            );
        });

        it("supports opus format", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test",
                    outputFormat: "opus",
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(mockOpenAISpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    response_format: "opus"
                })
            );
        });
    });

    describe("ElevenLabs provider", () => {
        it("synthesizes speech successfully", async () => {
            nock("https://api.elevenlabs.io")
                .post("/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM")
                .reply(200, mockAudioBuffer, {
                    "Content-Type": "audio/mpeg"
                });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "elevenlabs",
                    model: "eleven_multilingual_v2",
                    textInput: "Hello from ElevenLabs",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);

            const result = output.result.audio as {
                provider: string;
                model: string;
            };
            expect(result.provider).toBe("elevenlabs");
            expect(result.model).toBe("eleven_multilingual_v2");
        });

        it("uses custom voice ID", async () => {
            const customVoiceId = "custom-voice-123";

            nock("https://api.elevenlabs.io")
                .post(`/v1/text-to-speech/${customVoiceId}`)
                .reply(200, mockAudioBuffer);

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "elevenlabs",
                    model: "eleven_multilingual_v2",
                    voice: customVoiceId,
                    textInput: "Custom voice",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
        });

        it("passes voice settings (stability, similarity)", async () => {
            let capturedBody:
                | { voice_settings?: { stability: number; similarity_boost: number } }
                | undefined;

            nock("https://api.elevenlabs.io")
                .post("/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM")
                .reply(200, function (_uri, body) {
                    capturedBody = body as typeof capturedBody;
                    return mockAudioBuffer;
                });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "elevenlabs",
                    model: "eleven_multilingual_v2",
                    stability: 0.8,
                    similarityBoost: 0.9,
                    textInput: "Test settings",
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(capturedBody!.voice_settings?.stability).toBe(0.8);
            expect(capturedBody!.voice_settings?.similarity_boost).toBe(0.9);
        });

        it("throws error on API failure", async () => {
            nock("https://api.elevenlabs.io")
                .post("/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM")
                .reply(400, { error: "Invalid voice ID" });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "elevenlabs",
                    model: "eleven_multilingual_v2",
                    textInput: "Test",
                    outputVariable: "audio"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/ElevenLabs API error/);
        });
    });

    describe("Deepgram provider", () => {
        it("synthesizes speech successfully", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/speak")
                .query({ model: "aura-asteria-en" })
                .reply(200, mockAudioBuffer);

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "aura-asteria-en",
                    textInput: "Hello from Deepgram",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);

            const result = output.result.audio as {
                provider: string;
                model: string;
            };
            expect(result.provider).toBe("deepgram");
            expect(result.model).toBe("aura-asteria-en");
        });

        it("uses custom model/voice", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/speak")
                .query({ model: "aura-orion-en" })
                .reply(200, mockAudioBuffer);

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "aura-orion-en",
                    textInput: "Custom Deepgram voice",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
        });

        it("throws error on API failure", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/speak")
                .query(true)
                .reply(500, { error: "Server error" });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "aura-asteria-en",
                    textInput: "Test",
                    outputVariable: "audio"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Deepgram TTS error/);
        });
    });

    describe("variable interpolation", () => {
        it("interpolates variables in text input", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    llm: { response: "This is the AI response." }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "The AI said: {{llm.response}}",
                    outputVariable: "audio"
                },
                context
            });

            await handler.execute(input);

            expect(mockOpenAISpeechCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: "The AI said: This is the AI response."
                })
            );
        });

        it("throws error when text is empty after interpolation", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    empty: { text: "" }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "{{empty.text}}",
                    outputVariable: "audio"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/Text input is empty/);
        });
    });

    describe("output format", () => {
        it("returns base64 by default", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test audio",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            const result = output.result.audio as {
                audio: { base64?: string; url?: string };
            };
            expect(result.audio.base64).toBeDefined();
            expect(result.audio.url).toBeUndefined();
        });

        it("uploads to GCS and returns URL when returnAsUrl is true", async () => {
            mockUploadBuffer.mockResolvedValue("gs://artifacts/audio-output/exec-123/12345.mp3");

            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test audio",
                    returnAsUrl: true,
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            expect(mockUploadBuffer).toHaveBeenCalled();

            const result = output.result.audio as {
                audio: { base64?: string; url?: string };
            };
            expect(result.audio.url).toBe("gs://artifacts/audio-output/exec-123/12345.mp3");
            expect(result.audio.base64).toBeUndefined();
        });

        it("sets correct mime type for wav upload", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test audio",
                    outputFormat: "wav",
                    returnAsUrl: true,
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(mockUploadBuffer).toHaveBeenCalledWith(
                expect.any(Buffer),
                expect.objectContaining({
                    contentType: "audio/wav"
                })
            );
        });

        it("sets correct mime type for opus upload", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test audio",
                    outputFormat: "opus",
                    returnAsUrl: true,
                    outputVariable: "audio"
                }
            });

            await handler.execute(input);

            expect(mockUploadBuffer).toHaveBeenCalledWith(
                expect.any(Buffer),
                expect.objectContaining({
                    contentType: "audio/opus"
                })
            );
        });
    });

    describe("terminal node", () => {
        it("signals terminal node", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Final output",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.isTerminal).toBe(true);
        });
    });

    describe("output variable", () => {
        it("stores result in specified outputVariable", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test",
                    outputVariable: "speechResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.speechResult).toBeDefined();
            const speech = output.result.speechResult as { provider: string };
            expect(speech.provider).toBe("openai");
        });
    });

    describe("character count", () => {
        it("tracks characters used", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "This text is exactly fifty characters long xxxxxxx",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            const result = output.result.audio as { charactersUsed: number };
            expect(result.charactersUsed).toBe(50);
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "audioOutput",
                nodeConfig: {
                    provider: "openai",
                    model: "tts-1",
                    voice: "alloy",
                    textInput: "Test",
                    outputVariable: "audio"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });
});
