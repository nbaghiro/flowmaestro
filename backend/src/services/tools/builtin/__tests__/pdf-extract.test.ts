/**
 * PDF Extract Tool Tests
 */

import * as fs from "fs/promises";
import { pdfExtractTool, pdfExtractInputSchema } from "../pdf-extract";
import {
    createMockContext,
    assertSuccess,
    assertError,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";

// Mock fs/promises
jest.mock("fs/promises", () => ({
    readFile: jest.fn()
}));

// Mock pdf-parse
jest.mock("pdf-parse", () => {
    return jest.fn().mockResolvedValue({
        text: "Sample PDF text content.\fPage 2 content.\fPage 3 content.",
        numpages: 3,
        info: {
            Title: "Test Document",
            Author: "Test Author",
            Subject: "Test Subject",
            Creator: "Test Creator",
            Producer: "Test Producer",
            CreationDate: "D:20240101120000",
            ModDate: "D:20240115120000"
        }
    });
});

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("PDFExtractTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mocks
        mockedFs.readFile.mockResolvedValue(Buffer.from("mock pdf data"));
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(pdfExtractTool, {
                name: "pdf_extract",
                category: "data",
                riskLevel: "low"
            });
        });

        it("has correct display name", () => {
            expect(pdfExtractTool.displayName).toBe("Extract PDF Content");
        });

        it("has correct tags", () => {
            expect(pdfExtractTool.tags).toContain("pdf");
            expect(pdfExtractTool.tags).toContain("extract");
            expect(pdfExtractTool.tags).toContain("text");
        });

        it("has credit cost defined", () => {
            expect(pdfExtractTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid path input", () => {
            const input = {
                path: "/tmp/document.pdf"
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts text extraction options", () => {
            const input = {
                path: "/tmp/document.pdf",
                extractText: true,
                extractMetadata: true
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts table extraction option", () => {
            const input = {
                path: "/tmp/document.pdf",
                extractTables: true
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts image extraction option", () => {
            const input = {
                path: "/tmp/document.pdf",
                extractImages: true
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts page range as array", () => {
            const input = {
                path: "/tmp/document.pdf",
                pages: [1, 3, 5, 7]
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts page range as object", () => {
            const input = {
                path: "/tmp/document.pdf",
                pages: { start: 1, end: 10 }
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts pages as 'all'", () => {
            const input = {
                path: "/tmp/document.pdf",
                pages: "all"
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all output formats", () => {
            for (const outputFormat of ["text", "markdown", "json"]) {
                const input = {
                    path: "/tmp/document.pdf",
                    outputFormat
                };
                expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts preserve layout option", () => {
            const input = {
                path: "/tmp/document.pdf",
                preserveLayout: true
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("accepts password for encrypted PDFs", () => {
            const input = {
                path: "/tmp/encrypted.pdf",
                password: "secretpassword"
            };
            expect(() => pdfExtractInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { path: "/tmp/document.pdf" };
            const parsed = pdfExtractInputSchema.parse(input);
            expect(parsed.extractText).toBe(true);
            expect(parsed.extractTables).toBe(false);
            expect(parsed.extractImages).toBe(false);
            expect(parsed.extractMetadata).toBe(true);
            expect(parsed.pages).toBe("all");
            expect(parsed.outputFormat).toBe("text");
            expect(parsed.preserveLayout).toBe(false);
        });

        it("rejects empty path", () => {
            const input = {
                path: ""
            };
            expect(() => pdfExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid output format", () => {
            const input = {
                path: "/tmp/document.pdf",
                outputFormat: "html"
            };
            expect(() => pdfExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid page range start", () => {
            const input = {
                path: "/tmp/document.pdf",
                pages: { start: 0, end: 10 }
            };
            expect(() => pdfExtractInputSchema.parse(input)).toThrow();
        });

        it("rejects negative page numbers in array", () => {
            const input = {
                path: "/tmp/document.pdf",
                pages: [1, -2, 3]
            };
            expect(() => pdfExtractInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with valid path", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
        });

        it("executes with all extraction options enabled", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf",
                extractText: true,
                extractTables: true,
                extractImages: true,
                extractMetadata: true
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with page range", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf",
                pages: { start: 1, end: 5 }
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with markdown output format", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf",
                outputFormat: "markdown"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
        });

        it("rejects path traversal attempt", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/../../../etc/passwd"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /etc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/etc/passwd"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });

        it("rejects /proc path", async () => {
            const context = createMockContext();
            const params = {
                path: "/proc/self/environ"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertError(result, "ACCESS_DENIED");
        });
    });

    describe("output structure", () => {
        it("returns expected output fields", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
            expect(result.data).toHaveProperty("text");
            expect(result.data).toHaveProperty("pages");
            expect(result.data).toHaveProperty("metadata");
            expect(result.data).toHaveProperty("wordCount");
            expect(result.data).toHaveProperty("characterCount");
        });

        it("metadata includes expected fields", async () => {
            const context = createMockContext();
            const params = {
                path: "/tmp/document.pdf"
            };

            const result = await pdfExtractTool.execute(params, context);

            assertSuccess(result);
            const metadata = result.data?.metadata as Record<string, unknown>;
            expect(metadata).toHaveProperty("pageCount");
            expect(metadata).toHaveProperty("isEncrypted");
        });
    });
});
