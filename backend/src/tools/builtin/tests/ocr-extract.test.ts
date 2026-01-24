/**
 * OCR Extract Tool Tests
 */

import * as fs from "fs/promises";
import { ocrExtractTool, ocrExtractInputSchema } from "../ocr-extract";
import {
    createMockContext,
    assertSuccess,
    assertError,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";

// Mock fs/promises
jest.mock("fs/promises", () => ({
    access: jest.fn(),
    readFile: jest.fn(),
    constants: {
        R_OK: 4
    }
}));

// Mock tesseract.js
const mockWorker = {
    setParameters: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined)
};

jest.mock("tesseract.js", () => ({
    createWorker: jest.fn().mockResolvedValue(mockWorker)
}));

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("OCRExtractTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mocks
        mockedFs.access.mockResolvedValue(undefined);
        mockedFs.readFile.mockResolvedValue(Buffer.from("mock image data"));

        // Mock successful OCR response
        mockWorker.recognize.mockResolvedValue({
            data: {
                text: "This is sample OCR text.\nSecond line of text.",
                confidence: 95,
                lines: [
                    {
                        words: [
                            {
                                text: "This",
                                confidence: 98,
                                bbox: { x0: 10, y0: 10, x1: 50, y1: 30 }
                            },
                            {
                                text: "is",
                                confidence: 99,
                                bbox: { x0: 55, y0: 10, x1: 70, y1: 30 }
                            },
                            {
                                text: "sample",
                                confidence: 97,
                                bbox: { x0: 75, y0: 10, x1: 130, y1: 30 }
                            },
                            {
                                text: "OCR",
                                confidence: 96,
                                bbox: { x0: 135, y0: 10, x1: 175, y1: 30 }
                            },
                            {
                                text: "text.",
                                confidence: 94,
                                bbox: { x0: 180, y0: 10, x1: 220, y1: 30 }
                            }
                        ]
                    },
                    {
                        words: [
                            {
                                text: "Second",
                                confidence: 95,
                                bbox: { x0: 10, y0: 40, x1: 70, y1: 60 }
                            },
                            {
                                text: "line",
                                confidence: 96,
                                bbox: { x0: 75, y0: 40, x1: 110, y1: 60 }
                            },
                            {
                                text: "of",
                                confidence: 99,
                                bbox: { x0: 115, y0: 40, x1: 130, y1: 60 }
                            },
                            {
                                text: "text.",
                                confidence: 97,
                                bbox: { x0: 135, y0: 40, x1: 175, y1: 60 }
                            }
                        ]
                    }
                ],
                words: [
                    { text: "This", confidence: 98 },
                    { text: "is", confidence: 99 },
                    { text: "sample", confidence: 97 },
                    { text: "OCR", confidence: 96 },
                    { text: "text.", confidence: 94 },
                    { text: "Second", confidence: 95 },
                    { text: "line", confidence: 96 },
                    { text: "of", confidence: 99 },
                    { text: "text.", confidence: 97 }
                ]
            }
        });
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(ocrExtractTool, {
                name: "ocr_extract",
                category: "media",
                riskLevel: "low"
            });
        });

        it("has correct display name", () => {
            expect(ocrExtractTool.displayName).toBe("Extract Text from Image (OCR)");
        });

        it("has correct tags", () => {
            expect(ocrExtractTool.tags).toContain("ocr");
            expect(ocrExtractTool.tags).toContain("image");
            expect(ocrExtractTool.tags).toContain("text-extraction");
            expect(ocrExtractTool.tags).toContain("tesseract");
        });

        it("has credit cost defined", () => {
            expect(ocrExtractTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid path input", () => {
            const input = {
                path: "/tmp/image.png"
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts single language", () => {
            const input = {
                path: "/tmp/image.png",
                language: ["eng"]
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts multiple languages", () => {
            const input = {
                path: "/tmp/image.png",
                language: ["eng", "spa", "fra"]
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts page segmentation mode", () => {
            const input = {
                path: "/tmp/image.png",
                psm: 6 // Single block of text
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts preprocessing options", () => {
            const input = {
                path: "/tmp/image.png",
                preprocessing: {
                    grayscale: true,
                    denoise: true,
                    deskew: true,
                    threshold: true,
                    scale: 2
                }
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all valid output formats", () => {
            const formats = ["text", "hocr", "tsv", "json"];
            for (const outputFormat of formats) {
                const input = {
                    path: "/tmp/image.png",
                    outputFormat
                };
                expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts confidence threshold", () => {
            const input = {
                path: "/tmp/image.png",
                confidenceThreshold: 60
            };
            expect(() => ocrExtractInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { path: "/tmp/image.png" };
            const parsed = ocrExtractInputSchema.parse(input);
            expect(parsed.language).toEqual(["eng"]);
            expect(parsed.psm).toBe(3);
            expect(parsed.outputFormat).toBe("text");
            expect(parsed.confidenceThreshold).toBe(0);
        });

        it("rejects empty path", () => {
            const input = {
                path: ""
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid PSM value below minimum", () => {
            const input = {
                path: "/tmp/image.png",
                psm: -1
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid PSM value above maximum", () => {
            const input = {
                path: "/tmp/image.png",
                psm: 14
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid output format", () => {
            const input = {
                path: "/tmp/image.png",
                outputFormat: "xml"
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects confidence threshold below 0", () => {
            const input = {
                path: "/tmp/image.png",
                confidenceThreshold: -10
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects confidence threshold above 100", () => {
            const input = {
                path: "/tmp/image.png",
                confidenceThreshold: 150
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects scale below minimum", () => {
            const input = {
                path: "/tmp/image.png",
                preprocessing: {
                    scale: 0.1
                }
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects scale above maximum", () => {
            const input = {
                path: "/tmp/image.png",
                preprocessing: {
                    scale: 5
                }
            };
            expect(() => ocrExtractInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with valid path", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
        });

        it("executes with multiple languages", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png",
                language: ["eng", "deu"]
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with preprocessing enabled", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png",
                preprocessing: {
                    grayscale: true,
                    denoise: true
                }
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with JSON output format", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png",
                outputFormat: "json"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with hOCR output format", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png",
                outputFormat: "hocr"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("rejects path traversal attempt", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/../../../etc/passwd"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /etc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/etc/image.png"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /proc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/proc/self/image"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });
    });

    describe("output structure", () => {
        it("returns expected output fields", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png"
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
            expect(result.data).toHaveProperty("text");
            expect(result.data).toHaveProperty("confidence");
            expect(result.data).toHaveProperty("lineCount");
            expect(result.data).toHaveProperty("wordCount");
            expect(result.data).toHaveProperty("characterCount");
            expect(result.data).toHaveProperty("language");
        });

        it("returns first language in language field", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/image.png",
                language: ["fra", "eng"]
            };

            const result = await ocrExtractTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.language).toBe("fra");
        });
    });
});
