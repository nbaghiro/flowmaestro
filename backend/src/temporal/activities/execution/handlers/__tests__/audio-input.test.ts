/**
 * Audio Input Node Handler Unit Tests (STT - Speech-to-Text)
 *
 * Tests audio transcription:
 * - Provider routing (OpenAI Whisper, Deepgram)
 * - Audio source handling (GCS, base64)
 * - Language detection
 * - Word-level timestamps
 * - Error handling
 */

// Mock modules - use require() inside factory to avoid Jest hoisting issues
jest.mock("../../../../../core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../../../storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockDatabase();
});
jest.mock("fs/promises", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockFsPromises } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockFsPromises();
});

// Mock OpenAI
const mockOpenAICreate = jest.fn();
jest.mock("openai", () => {
    return jest.fn().mockImplementation(() => ({
        audio: {
            transcriptions: {
                create: mockOpenAICreate
            }
        }
    }));
});

// Mock GCS storage service
const mockDownloadToTemp = jest.fn();
jest.mock("../../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn(() => ({
        downloadToTemp: mockDownloadToTemp
    }))
}));

import nock from "nock";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { AudioInputNodeHandler, createAudioInputNodeHandler } from "../inputs/audio-input";

describe("AudioInputNodeHandler", () => {
    let handler: AudioInputNodeHandler;

    beforeEach(() => {
        handler = createAudioInputNodeHandler();
        jest.clearAllMocks();
        nock.cleanAll();

        // Default mock for temp file path from GCS
        mockDownloadToTemp.mockResolvedValue("/tmp/test-audio.mp3");
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("AudioInputNodeHandler");
        });

        it("supports audioInput node type", () => {
            expect(handler.supportedNodeTypes).toContain("audioInput");
        });

        it("can handle audioInput type", () => {
            expect(handler.canHandle("audioInput")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("audioOutput")).toBe(false);
            expect(handler.canHandle("input")).toBe(false);
            expect(handler.canHandle("llm")).toBe(false);
        });
    });

    describe("OpenAI Whisper provider", () => {
        it("transcribes audio successfully", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Hello, this is a test transcription.",
                language: "en",
                duration: 5.2,
                words: [
                    { word: "Hello", start: 0, end: 0.5 },
                    { word: "this", start: 0.6, end: 0.8 },
                    { word: "is", start: 0.9, end: 1.0 },
                    { word: "a", start: 1.1, end: 1.2 },
                    { word: "test", start: 1.3, end: 1.6 },
                    { word: "transcription", start: 1.7, end: 2.3 }
                ]
            });

            const context = createTestContext({
                inputs: {
                    audioFile: {
                        fileName: "recording.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/audio/recording.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audioFile",
                    outputVariable: "transcript"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.transcript).toBeDefined();

            const transcript = output.result.transcript as {
                text: string;
                language: string;
                provider: string;
                duration: number;
            };
            expect(transcript.text).toBe("Hello, this is a test transcription.");
            expect(transcript.language).toBe("en");
            expect(transcript.provider).toBe("openai");
            expect(transcript.duration).toBe(5.2);
        });

        it("includes word-level timestamps in metadata", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Test",
                language: "en",
                duration: 1.0,
                words: [{ word: "Test", start: 0, end: 0.5 }]
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as {
                metadata?: { words?: Array<{ word: string; start: number; end: number }> };
            };
            expect(result.metadata?.words).toBeDefined();
            expect(result.metadata?.words?.[0]).toEqual({
                word: "Test",
                start: 0,
                end: 0.5
            });
        });

        it("handles auto language detection", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Bonjour le monde",
                language: "fr",
                duration: 2.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "french.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/french.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    language: "auto",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as { language: string };
            expect(result.language).toBe("fr");

            // Should not pass language to API when "auto"
            expect(mockOpenAICreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    language: undefined
                })
            );
        });
    });

    describe("Deepgram provider", () => {
        it("transcribes audio successfully", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(200, {
                    results: {
                        channels: [
                            {
                                detected_language: "en",
                                alternatives: [
                                    {
                                        transcript: "This is a Deepgram transcription.",
                                        confidence: 0.98,
                                        words: [
                                            { word: "This", start: 0, end: 0.3, confidence: 0.99 },
                                            { word: "is", start: 0.4, end: 0.5, confidence: 0.97 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    metadata: {
                        duration: 3.5
                    }
                });

            const context = createTestContext({
                inputs: {
                    audioFile: {
                        fileName: "recording.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/recording.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audioFile",
                    outputVariable: "transcript"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);

            const transcript = output.result.transcript as {
                text: string;
                provider: string;
                model: string;
                duration: number;
                metadata?: { confidence?: number };
            };
            expect(transcript.text).toBe("This is a Deepgram transcription.");
            expect(transcript.provider).toBe("deepgram");
            expect(transcript.model).toBe("nova-2");
            expect(transcript.duration).toBe(3.5);
            expect(transcript.metadata?.confidence).toBe(0.98);
        });

        it("includes word timestamps with confidence", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(200, {
                    results: {
                        channels: [
                            {
                                alternatives: [
                                    {
                                        transcript: "Test",
                                        confidence: 0.95,
                                        words: [
                                            { word: "Test", start: 0, end: 0.4, confidence: 0.96 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    metadata: { duration: 1.0 }
                });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as {
                metadata?: { words?: Array<{ word: string; confidence?: number }> };
            };
            expect(result.metadata?.words?.[0].confidence).toBe(0.96);
        });

        it("passes punctuate and diarize options", async () => {
            let capturedQuery: Record<string, string> | undefined;

            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(200, function (uri) {
                    // Extract query params from URI
                    const url = new URL(`https://api.deepgram.com${uri}`);
                    capturedQuery = Object.fromEntries(url.searchParams.entries());
                    return {
                        results: {
                            channels: [{ alternatives: [{ transcript: "Test" }] }]
                        },
                        metadata: { duration: 1.0 }
                    };
                });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    punctuate: true,
                    diarize: true,
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await handler.execute(input);

            expect(capturedQuery!.punctuate).toBe("true");
            expect(capturedQuery!.diarize).toBe("true");
        });

        it("throws error on API failure", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(400, { error: "Invalid audio format" });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "bad.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/bad.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/Deepgram API error/);
        });
    });

    describe("audio source handling", () => {
        it("downloads audio from GCS", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "GCS audio",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "cloud.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://uploads-bucket/audio/cloud.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await handler.execute(input);

            expect(mockDownloadToTemp).toHaveBeenCalledWith({
                gcsUri: "gs://uploads-bucket/audio/cloud.mp3"
            });
        });

        it("decodes base64 audio", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Base64 audio",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "encoded.mp3",
                        mimeType: "audio/mpeg",
                        base64: Buffer.from("fake-audio-data").toString("base64")
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(mockDownloadToTemp).not.toHaveBeenCalled();
        });

        it("uses .wav extension for wav mimeType", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "WAV audio",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "recording.wav",
                        mimeType: "audio/wav",
                        base64: Buffer.from("wav-data").toString("base64")
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await handler.execute(input);

            const fsPromises = jest.requireMock("fs/promises");
            expect(fsPromises.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(".wav"),
                expect.any(Buffer)
            );
        });
    });

    describe("validation errors", () => {
        it("throws error when audio input is missing", async () => {
            const context = createTestContext({
                inputs: {}
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "missingAudio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /Required audio input 'missingAudio' was not provided/
            );
        });

        it("throws error for invalid audio format (no gcsUri or base64)", async () => {
            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "invalid.mp3",
                        mimeType: "audio/mpeg"
                        // Neither gcsUri nor base64
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid audio input format/);
        });
    });

    describe("output variable", () => {
        it("stores result in specified outputVariable", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Test output",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "transcriptionResult"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.transcriptionResult).toBeDefined();
            const transcription = output.result.transcriptionResult as { text: string };
            expect(transcription.text).toBe("Test output");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Metrics test",
                language: "en",
                duration: 2.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("concurrent transcription", () => {
        it("handles multiple simultaneous transcriptions", async () => {
            mockOpenAICreate
                .mockResolvedValueOnce({ text: "First audio", language: "en", duration: 1.0 })
                .mockResolvedValueOnce({ text: "Second audio", language: "en", duration: 2.0 })
                .mockResolvedValueOnce({ text: "Third audio", language: "en", duration: 1.5 });

            const inputs = [
                createHandlerInput({
                    nodeType: "audioInput",
                    nodeConfig: {
                        provider: "openai",
                        model: "whisper-1",
                        inputName: "audio1",
                        outputVariable: "result1"
                    },
                    context: createTestContext({
                        inputs: {
                            audio1: {
                                fileName: "a1.mp3",
                                mimeType: "audio/mpeg",
                                gcsUri: "gs://bucket/a1.mp3"
                            }
                        }
                    })
                }),
                createHandlerInput({
                    nodeType: "audioInput",
                    nodeConfig: {
                        provider: "openai",
                        model: "whisper-1",
                        inputName: "audio2",
                        outputVariable: "result2"
                    },
                    context: createTestContext({
                        inputs: {
                            audio2: {
                                fileName: "a2.mp3",
                                mimeType: "audio/mpeg",
                                gcsUri: "gs://bucket/a2.mp3"
                            }
                        }
                    })
                }),
                createHandlerInput({
                    nodeType: "audioInput",
                    nodeConfig: {
                        provider: "openai",
                        model: "whisper-1",
                        inputName: "audio3",
                        outputVariable: "result3"
                    },
                    context: createTestContext({
                        inputs: {
                            audio3: {
                                fileName: "a3.mp3",
                                mimeType: "audio/mpeg",
                                gcsUri: "gs://bucket/a3.mp3"
                            }
                        }
                    })
                })
            ];

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(3);
            expect((outputs[0].result.result1 as { text: string }).text).toBe("First audio");
            expect((outputs[1].result.result2 as { text: string }).text).toBe("Second audio");
            expect((outputs[2].result.result3 as { text: string }).text).toBe("Third audio");
        });

        it("handles concurrent transcriptions with mixed providers", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "OpenAI transcription",
                language: "en",
                duration: 1.0
            });

            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(200, {
                    results: {
                        channels: [
                            {
                                alternatives: [
                                    { transcript: "Deepgram transcription", confidence: 0.95 }
                                ]
                            }
                        ]
                    },
                    metadata: { duration: 2.0 }
                });

            const openaiInput = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "openaiResult"
                },
                context: createTestContext({
                    inputs: {
                        audio: {
                            fileName: "a.mp3",
                            mimeType: "audio/mpeg",
                            gcsUri: "gs://bucket/a.mp3"
                        }
                    }
                })
            });

            const deepgramInput = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audio",
                    outputVariable: "deepgramResult"
                },
                context: createTestContext({
                    inputs: {
                        audio: {
                            fileName: "b.mp3",
                            mimeType: "audio/mpeg",
                            gcsUri: "gs://bucket/b.mp3"
                        }
                    }
                })
            });

            const [openaiOutput, deepgramOutput] = await Promise.all([
                handler.execute(openaiInput),
                handler.execute(deepgramInput)
            ]);

            expect((openaiOutput.result.openaiResult as { text: string }).text).toBe(
                "OpenAI transcription"
            );
            expect((deepgramOutput.result.deepgramResult as { text: string }).text).toBe(
                "Deepgram transcription"
            );
        });
    });

    describe("large audio file handling", () => {
        it("handles audio files with long duration", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Long transcription content...",
                language: "en",
                duration: 7200.0 // 2 hours
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "long-podcast.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/long-podcast.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as { duration: number };
            expect(result.duration).toBe(7200.0);
        });

        it("handles audio with many words/timestamps", async () => {
            const manyWords = Array.from({ length: 1000 }, (_, i) => ({
                word: `word${i}`,
                start: i * 0.1,
                end: i * 0.1 + 0.09
            }));

            mockOpenAICreate.mockResolvedValue({
                text: manyWords.map((w) => w.word).join(" "),
                language: "en",
                duration: 100.0,
                words: manyWords
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "many-words.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/many-words.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as {
                metadata?: { words?: Array<{ word: string }> };
            };
            expect(result.metadata?.words).toHaveLength(1000);
        });
    });

    describe("audio format edge cases", () => {
        it("handles webm audio format", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "WebM audio content",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "recording.webm",
                        mimeType: "audio/webm",
                        gcsUri: "gs://bucket/recording.webm"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect((output.result.result as { text: string }).text).toBe("WebM audio content");
        });

        it("handles m4a audio format", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "M4A audio content",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "voice-memo.m4a",
                        mimeType: "audio/x-m4a",
                        gcsUri: "gs://bucket/voice-memo.m4a"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect((output.result.result as { text: string }).text).toBe("M4A audio content");
        });

        it("handles ogg audio format", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "OGG audio content",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "podcast.ogg",
                        mimeType: "audio/ogg",
                        gcsUri: "gs://bucket/podcast.ogg"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect((output.result.result as { text: string }).text).toBe("OGG audio content");
        });
    });

    describe("rate limiting", () => {
        it("handles OpenAI rate limit error", async () => {
            const rateLimitError = new Error("Rate limit exceeded");
            (rateLimitError as Error & { status?: number }).status = 429;
            mockOpenAICreate.mockRejectedValue(rateLimitError);

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/rate limit/i);
        });

        it("handles Deepgram rate limit error", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(429, { error: "Rate limit exceeded. Please slow down." });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/rate limit|429/i);
        });
    });

    describe("provider error handling", () => {
        it("handles OpenAI authentication error", async () => {
            const authError = new Error("Invalid API key");
            (authError as Error & { status?: number }).status = 401;
            mockOpenAICreate.mockRejectedValue(authError);

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid API key|401/i);
        });

        it("handles Deepgram server error", async () => {
            nock("https://api.deepgram.com")
                .post("/v1/listen")
                .query(true)
                .reply(500, { error: "Internal server error" });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "deepgram",
                    model: "nova-2",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/500|server error/i);
        });

        it("handles OpenAI model not found error", async () => {
            const notFoundError = new Error("Model not found: whisper-invalid");
            (notFoundError as Error & { status?: number }).status = 404;
            mockOpenAICreate.mockRejectedValue(notFoundError);

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "test.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/test.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-invalid",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/not found|404/i);
        });
    });

    describe("edge cases", () => {
        it("handles audio with no speech detected", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "",
                language: "en",
                duration: 5.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "silence.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/silence.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as { text: string };
            expect(result.text).toBe("");
        });

        it("handles audio with multiple languages", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Hello Bonjour Hola",
                language: "en", // Primary detected language
                duration: 3.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "multilingual.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/multilingual.mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.result as { text: string; language: string };
            expect(result.text).toContain("Hello");
            expect(result.text).toContain("Bonjour");
            expect(result.text).toContain("Hola");
        });

        it("handles audio with special characters in filename", async () => {
            mockOpenAICreate.mockResolvedValue({
                text: "Special filename content",
                language: "en",
                duration: 1.0
            });

            const context = createTestContext({
                inputs: {
                    audio: {
                        fileName: "audio file (copy) [2024].mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://bucket/audio file (copy) [2024].mp3"
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio",
                    outputVariable: "result"
                },
                context
            });

            const output = await handler.execute(input);

            expect((output.result.result as { text: string }).text).toBe(
                "Special filename content"
            );
        });
    });
});
