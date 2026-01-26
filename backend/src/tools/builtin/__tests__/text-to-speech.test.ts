/**
 * Text to Speech Tool Tests
 */

import * as fs from "fs/promises";
import { textToSpeechTool, textToSpeechInputSchema } from "../text-to-speech";
import {
    createMockContext,
    assertSuccess,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";
import type { Stats } from "fs";

// Mock fs/promises
jest.mock("fs/promises", () => ({
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn()
}));

// Mock the unified AI service
const mockSynthesize = jest.fn();
jest.mock("../../../services/ai", () => ({
    getAIClient: jest.fn(() => ({
        speech: {
            synthesize: mockSynthesize
        }
    }))
}));

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("TextToSpeechTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default mock for OPENAI_API_KEY
        process.env.OPENAI_API_KEY = "test-api-key";

        // Default successful mocks
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.writeFile.mockResolvedValue(undefined);
        mockedFs.stat.mockResolvedValue({ size: 12345 } as Stats);

        // Mock successful TTS response from unified AI service
        mockSynthesize.mockResolvedValue({
            base64: Buffer.from("mock audio data").toString("base64"),
            metadata: {
                processingTimeMs: 100,
                provider: "openai",
                model: "tts-1",
                charactersUsed: 10
            }
        });
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(textToSpeechTool, {
                name: "text_to_speech",
                category: "media",
                riskLevel: "low"
            });
        });

        it("has correct display name", () => {
            expect(textToSpeechTool.displayName).toBe("Text to Speech");
        });

        it("has correct tags", () => {
            expect(textToSpeechTool.tags).toContain("tts");
            expect(textToSpeechTool.tags).toContain("speech");
            expect(textToSpeechTool.tags).toContain("audio");
            expect(textToSpeechTool.tags).toContain("voice");
        });

        it("has credit cost defined", () => {
            expect(textToSpeechTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid text input", () => {
            const input = {
                text: "Hello, world! This is a test."
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts alloy voice", () => {
            const input = {
                text: "Hello",
                voice: "alloy"
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts echo voice", () => {
            const input = {
                text: "Hello",
                voice: "echo"
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts fable voice", () => {
            const input = {
                text: "Hello",
                voice: "fable"
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all supported voices", () => {
            const voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
            for (const voice of voices) {
                const input = { text: "Hello", voice };
                expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts speed configuration", () => {
            const input = {
                text: "Hello",
                speed: 1.5
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts model configuration", () => {
            const input = {
                text: "Hello",
                model: "tts-1-hd"
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all valid output formats", () => {
            const formats = ["mp3", "opus", "aac", "flac", "wav", "pcm"];
            for (const format of formats) {
                const input = { text: "Hello", format };
                expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts custom filename", () => {
            const input = {
                text: "Hello",
                filename: "my_speech"
            };
            expect(() => textToSpeechInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { text: "Hello" };
            const parsed = textToSpeechInputSchema.parse(input);
            expect(parsed.voice).toBe("alloy");
            expect(parsed.model).toBe("tts-1");
            expect(parsed.speed).toBe(1.0);
            expect(parsed.format).toBe("mp3");
            expect(parsed.filename).toBe("speech");
        });

        it("rejects empty text", () => {
            const input = {
                text: ""
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects text exceeding max length", () => {
            const input = {
                text: "a".repeat(5001)
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid voice", () => {
            const input = {
                text: "Hello",
                voice: "invalid-voice"
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects speed below minimum", () => {
            const input = {
                text: "Hello",
                speed: 0.2
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects speed above maximum", () => {
            const input = {
                text: "Hello",
                speed: 5.0
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid format", () => {
            const input = {
                text: "Hello",
                format: "ogg"
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid model", () => {
            const input = {
                text: "Hello",
                model: "tts-2"
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects empty filename", () => {
            const input = {
                text: "Hello",
                filename: ""
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });

        it("rejects filename exceeding max length", () => {
            const input = {
                text: "Hello",
                filename: "a".repeat(256)
            };
            expect(() => textToSpeechInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with valid text", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello, this is a test message."
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
        });

        it("executes with different voice", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello",
                voice: "nova"
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.voice).toBe("nova");
        });

        it("executes with custom speed", async () => {
            const context = createMockContext();
            const params = {
                text: "This is fast speech.",
                speed: 1.5
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with WAV format", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello",
                format: "wav"
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.format).toBe("wav");
            expect(result.data?.filename).toContain(".wav");
        });

        it("executes with OPUS format", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello",
                format: "opus"
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.format).toBe("opus");
        });

        it("executes with HD model", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello",
                model: "tts-1-hd"
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.model).toBe("tts-1-hd");
        });
    });

    describe("output structure", () => {
        it("returns expected output fields", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello, this is a test."
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data).toHaveProperty("path");
            expect(result.data).toHaveProperty("filename");
            expect(result.data).toHaveProperty("format");
            expect(result.data).toHaveProperty("size");
            expect(result.data).toHaveProperty("characterCount");
            expect(result.data).toHaveProperty("voice");
            expect(result.data).toHaveProperty("model");
        });

        it("returns correct character count", async () => {
            const context = createMockContext();
            const text = "This is exactly forty characters long!!!";
            const params = { text };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.characterCount).toBe(text.length);
        });

        it("generates correct output path", async () => {
            const context = createMockContext();
            const params = {
                text: "Hello",
                filename: "my_audio",
                format: "mp3"
            };

            const result = await textToSpeechTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/my_audio.mp3");
            expect(result.data?.filename).toBe("my_audio.mp3");
        });

        it("credit cost varies by model", async () => {
            const context = createMockContext();

            const standardResult = await textToSpeechTool.execute(
                { text: "Hello", model: "tts-1" },
                context
            );
            const hdResult = await textToSpeechTool.execute(
                { text: "Hello", model: "tts-1-hd" },
                context
            );

            assertSuccess(standardResult);
            assertSuccess(hdResult);
            // HD model costs more
            expect(hdResult.metadata?.creditCost).toBeGreaterThan(
                standardResult.metadata?.creditCost ?? 0
            );
        });
    });
});
