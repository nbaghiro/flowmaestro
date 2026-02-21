/**
 * Audio Transcribe Tool Tests
 */

import * as fs from "fs/promises";
import { audioTranscribeTool, audioTranscribeInputSchema } from "../audio-transcribe";
import {
    createMockContext,
    assertSuccess,
    assertError,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";
import type { Stats } from "fs";

// Mock fs/promises
jest.mock("fs/promises", () => ({
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    constants: {
        R_OK: 4
    }
}));

// Mock the unified AI service
const mockTranscribe = jest.fn();
jest.mock("../../../../core/ai", () => ({
    getAIClient: jest.fn(() => ({
        speech: {
            transcribe: mockTranscribe
        }
    }))
}));

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("AudioTranscribeTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default mock for OPENAI_API_KEY
        process.env.OPENAI_API_KEY = "test-api-key";
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(audioTranscribeTool, {
                name: "audio_transcribe",
                category: "media",
                riskLevel: "low"
            });
        });

        it("has correct display name", () => {
            expect(audioTranscribeTool.displayName).toBe("Transcribe Audio");
        });

        it("has correct tags", () => {
            expect(audioTranscribeTool.tags).toContain("audio");
            expect(audioTranscribeTool.tags).toContain("transcription");
            expect(audioTranscribeTool.tags).toContain("speech-to-text");
            expect(audioTranscribeTool.tags).toContain("whisper");
        });

        it("has credit cost defined", () => {
            expect(audioTranscribeTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid path input", () => {
            const input = {
                path: "/tmp/audio.mp3"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
        });

        it("accepts language code", () => {
            const input = {
                path: "/tmp/audio.mp3",
                language: "en"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
        });

        it("accepts transcribe task", () => {
            const input = {
                path: "/tmp/audio.mp3",
                task: "transcribe"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
        });

        it("accepts translate task", () => {
            const input = {
                path: "/tmp/audio.mp3",
                task: "translate"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
        });

        it("accepts timestamps option", () => {
            const input = {
                path: "/tmp/audio.mp3",
                timestamps: true
            };
            expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all valid output formats", () => {
            const formats = ["text", "json", "srt", "vtt"];
            for (const outputFormat of formats) {
                const input = {
                    path: "/tmp/audio.mp3",
                    outputFormat
                };
                expect(() => audioTranscribeInputSchema.parse(input)).not.toThrow();
            }
        });

        it("uses default values when not provided", () => {
            const input = { path: "/tmp/audio.mp3" };
            const parsed = audioTranscribeInputSchema.parse(input);
            expect(parsed.model).toBe("whisper-1");
            expect(parsed.task).toBe("transcribe");
            expect(parsed.timestamps).toBe(false);
            expect(parsed.outputFormat).toBe("text");
            expect(parsed.temperature).toBe(0);
        });

        it("rejects empty path", () => {
            const input = {
                path: ""
            };
            expect(() => audioTranscribeInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid language code", () => {
            const input = {
                path: "/tmp/audio.mp3",
                language: "english" // Should be 2-letter code
            };
            expect(() => audioTranscribeInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid task", () => {
            const input = {
                path: "/tmp/audio.mp3",
                task: "summarize"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid output format", () => {
            const input = {
                path: "/tmp/audio.mp3",
                outputFormat: "mp3"
            };
            expect(() => audioTranscribeInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        beforeEach(() => {
            // Default successful mocks
            mockedFs.access.mockResolvedValue(undefined);
            mockedFs.stat.mockResolvedValue({ size: 1024 * 1024 } as Stats); // 1MB file
            mockedFs.readFile.mockResolvedValue(Buffer.from("mock audio data"));
            mockedFs.writeFile.mockResolvedValue(undefined);
            mockedFs.mkdir.mockResolvedValue(undefined);

            // Mock successful OpenAI API response
            mockTranscribe.mockResolvedValue({
                text: "This is a test transcription.",
                language: "en",
                duration: 10.5,
                segments: [
                    {
                        id: 0,
                        start: 0,
                        end: 10.5,
                        text: "This is a test transcription."
                    }
                ],
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "whisper-1"
                }
            });
        });

        it("executes successfully with valid path", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
            expect(result.data?.text).toBe("This is a test transcription.");
            expect(result.data?.language).toBe("en");
        });

        it("executes with specific language", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3",
                language: "es"
            };

            mockTranscribe.mockResolvedValue({
                text: "Esta es una prueba.",
                language: "es",
                duration: 5.0,
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "whisper-1"
                }
            });

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.language).toBe("es");
        });

        it("executes with translate task", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/spanish_audio.mp3",
                task: "translate"
            };

            mockTranscribe.mockResolvedValue({
                text: "This is a translation to English.",
                language: "es",
                duration: 8.0,
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "whisper-1"
                }
            });

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.text).toBe("This is a translation to English.");
        });

        it("executes with SRT output format", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3",
                outputFormat: "srt"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with VTT output format", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3",
                outputFormat: "vtt"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
        });

        it("rejects path traversal attempt", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/../../../etc/passwd"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /etc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/etc/audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /proc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/proc/self/audio"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("returns error when file not found", async () => {
            mockedFs.access.mockRejectedValue(new Error("ENOENT"));

            const context = createMockContext();
            const params = {
                path: "/tmp/nonexistent.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result, "FILE_NOT_FOUND");
        });

        it("returns error when file too large", async () => {
            mockedFs.stat.mockResolvedValue({ size: 30 * 1024 * 1024 } as Stats); // 30MB

            const context = createMockContext();
            const params = {
                path: "/tmp/large_audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result, "FILE_TOO_LARGE");
        });

        it("returns error when API key not set", async () => {
            delete process.env.OPENAI_API_KEY;
            mockTranscribe.mockRejectedValue(new Error("API key not configured"));

            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result);
        });

        it("returns error when API call fails", async () => {
            mockTranscribe.mockRejectedValue(new Error("Invalid API key"));

            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertError(result);
        });
    });

    describe("output structure", () => {
        beforeEach(() => {
            mockedFs.access.mockResolvedValue(undefined);
            mockedFs.stat.mockResolvedValue({ size: 1024 * 1024 } as Stats);
            mockedFs.readFile.mockResolvedValue(Buffer.from("mock audio data"));
            mockedFs.writeFile.mockResolvedValue(undefined);
            mockedFs.mkdir.mockResolvedValue(undefined);

            mockTranscribe.mockResolvedValue({
                text: "Hello world. This is a test.",
                language: "en",
                duration: 5.0,
                segments: [
                    { id: 0, start: 0, end: 2.5, text: "Hello world." },
                    { id: 1, start: 2.5, end: 5.0, text: "This is a test." }
                ],
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "whisper-1"
                }
            });
        });

        it("returns expected output fields", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/audio.mp3"
            };

            const result = await audioTranscribeTool.execute(params, context);

            assertSuccess(result);
            expect(result.data).toHaveProperty("text");
            expect(result.data).toHaveProperty("language");
            expect(result.data).toHaveProperty("duration");
            expect(result.data).toHaveProperty("wordCount");
        });
    });
});
