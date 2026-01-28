/**
 * Audio Transcription Handler Unit Tests
 *
 * Tests for the AudioTranscriptionNodeHandler which transcribes audio
 * to text using the audio_transcribe builtin tool (Whisper).
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../tools/builtin/audio-transcribe", () => ({
    audioTranscribeTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    interpolateVariables: jest.fn((value: unknown, _context: unknown) => value),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core";
import {
    AudioTranscriptionNodeHandler,
    createAudioTranscriptionNodeHandler
} from "../ai/audio-transcription";
import type { ContextSnapshot } from "../../../../core/types";
import type { NodeHandlerInput } from "../../types";

// Helper to create mock context
function createMockContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
    return {
        workflowId: "test-workflow-id",
        executionId: "test-execution-id",
        variables: new Map(),
        nodeOutputs: new Map(),
        sharedMemory: new Map(),
        secrets: new Map(),
        loopStates: [],
        parallelStates: [],
        ...overrides
    } as ContextSnapshot;
}

// Helper to create mock input
function createMockInput(
    nodeConfig: JsonObject,
    contextOverrides: Partial<ContextSnapshot> = {}
): NodeHandlerInput {
    return {
        nodeType: "audioTranscription",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Audio Transcription"
        }
    };
}

describe("AudioTranscriptionNodeHandler", () => {
    let handler: AudioTranscriptionNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new AudioTranscriptionNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("AudioTranscriptionNodeHandler");
            expect(handler.supportedNodeTypes).toContain("audioTranscription");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("audioTranscription")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createAudioTranscriptionNodeHandler();
            expect(instance).toBeInstanceOf(AudioTranscriptionNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should transcribe audio file with default settings", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Hello world",
                        language: "en",
                        duration: 5.0,
                        wordCount: 2
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/to/audio.mp3",
                    model: "whisper-1",
                    task: "transcribe",
                    outputFormat: "text",
                    outputVariable: "transcription"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("transcription");
                expect(result.result.transcription).toEqual(
                    expect.objectContaining({
                        text: "Hello world",
                        language: "en",
                        duration: 5.0,
                        wordCount: 2
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/path/to/audio.mp3",
                        model: "whisper-1",
                        task: "transcribe"
                    }),
                    expect.any(Object)
                );
            });

            it("should transcribe with specified language", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Bonjour monde",
                        language: "fr",
                        duration: 3.0,
                        wordCount: 2
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/to/french.mp3",
                    model: "whisper-1",
                    language: "fr",
                    task: "transcribe",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        language: "fr"
                    }),
                    expect.any(Object)
                );
            });

            it("should transcribe with custom prompt", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Technical jargon here",
                        language: "en",
                        duration: 10.0,
                        wordCount: 3
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/to/technical.mp3",
                    model: "whisper-1",
                    prompt: "This is a technical discussion about APIs",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        prompt: "This is a technical discussion about APIs"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle different output formats (vtt, srt, json, text)", async () => {
                const formats = ["vtt", "srt", "json", "text"] as const;

                for (const format of formats) {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            text: "Test content",
                            language: "en",
                            duration: 1.0,
                            wordCount: 2
                        }
                    });

                    const input = createMockInput({
                        audioSource: "/path/to/audio.mp3",
                        model: "whisper-1",
                        outputFormat: format,
                        outputVariable: "result"
                    });

                    await handler.execute(input);

                    expect(mockExecute).toHaveBeenLastCalledWith(
                        expect.objectContaining({
                            outputFormat: format
                        }),
                        expect.any(Object)
                    );
                }
            });

            it("should handle translate task type", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Translated to English",
                        language: "en",
                        duration: 5.0,
                        wordCount: 3
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/to/foreign.mp3",
                    model: "whisper-1",
                    task: "translate",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        task: "translate"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in audio source path", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{audioPath}}") return "/resolved/audio.mp3";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Interpolated path test",
                        language: "en",
                        duration: 2.0,
                        wordCount: 3
                    }
                });

                const input = createMockInput({
                    audioSource: "{{audioPath}}",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/resolved/audio.mp3"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in prompt", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{customPrompt}}") return "Resolved prompt text";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Result",
                        language: "en",
                        duration: 1.0,
                        wordCount: 1
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    prompt: "{{customPrompt}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        prompt: "Resolved prompt text"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Stored result",
                        language: "en",
                        duration: 3.0,
                        wordCount: 2
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "myTranscription"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myTranscription");
                expect(result.result.myTranscription).toEqual(
                    expect.objectContaining({ text: "Stored result" })
                );
            });

            it("should return segments when available", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Hello world",
                        language: "en",
                        duration: 5.0,
                        wordCount: 2,
                        segments: [
                            { id: 0, start: 0, end: 2.5, text: "Hello" },
                            { id: 1, start: 2.5, end: 5.0, text: "world" }
                        ]
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    timestamps: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { segments: unknown[] }).segments).toHaveLength(2);
            });

            it("should return word-level timestamps when available", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Hello world",
                        language: "en",
                        duration: 5.0,
                        wordCount: 2,
                        segments: [
                            {
                                id: 0,
                                start: 0,
                                end: 5.0,
                                text: "Hello world",
                                words: [
                                    { word: "Hello", start: 0, end: 2.0 },
                                    { word: "world", start: 2.5, end: 5.0 }
                                ]
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    timestamps: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const segments = (result.result.result as { segments: Array<{ words: unknown[] }> })
                    .segments;
                expect(segments[0].words).toHaveLength(2);
            });
        });

        describe("validation", () => {
            it("should throw error when audio source is missing", async () => {
                const input = createMockInput({
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when audio source is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(123);

                const input = createMockInput({
                    audioSource: "{{nonStringVar}}",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Audio source path is required"
                );
            });

            it("should throw error when audio source resolves to empty", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce("");

                const input = createMockInput({
                    audioSource: "{{emptyVar}}",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Audio source path is required"
                );
            });
        });

        describe("error handling", () => {
            it("should handle tool execution failures gracefully", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to process audio file" }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Failed to process audio file"
                );
            });

            it("should handle tool execution failure without message", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Audio transcription failed");
            });

            it("should handle tool throwing exception", async () => {
                mockExecute.mockRejectedValueOnce(new Error("Network timeout"));

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Network timeout");
            });
        });

        describe("edge cases", () => {
            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "No output var",
                        language: "en",
                        duration: 1.0,
                        wordCount: 3
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                // Result should be empty when no output variable
                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Test",
                        language: "en",
                        duration: 1.0,
                        wordCount: 1
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass tool execution context correctly", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Test",
                        language: "en",
                        duration: 1.0,
                        wordCount: 1
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });
                input.metadata.userId = "user-123";
                input.metadata.executionId = "exec-456";

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "user-123",
                        mode: "workflow",
                        traceId: "exec-456"
                    })
                );
            });

            it("should use default userId when not provided", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Test",
                        language: "en",
                        duration: 1.0,
                        wordCount: 1
                    }
                });

                const input = createMockInput({
                    audioSource: "/path/audio.mp3",
                    model: "whisper-1",
                    outputVariable: "result"
                });
                delete input.metadata.userId;

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "system"
                    })
                );
            });
        });
    });
});
