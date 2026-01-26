/**
 * File Download Tool Tests
 */

import * as fs from "fs/promises";
import { fileDownloadTool, fileDownloadInputSchema } from "../file-download";
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
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn()
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("FileDownloadTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mocks
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.writeFile.mockResolvedValue(undefined);
        mockedFs.stat.mockResolvedValue({ size: 1024 } as Stats);

        // Mock successful fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            headers: new Map([
                ["content-type", "application/pdf"],
                ["content-length", "1024"]
            ]) as unknown as Headers,
            arrayBuffer: async () => new ArrayBuffer(1024)
        });
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(fileDownloadTool, {
                name: "file_download",
                category: "file",
                riskLevel: "medium"
            });
        });

        it("has correct display name", () => {
            expect(fileDownloadTool.displayName).toBe("Download File");
        });

        it("has correct tags", () => {
            expect(fileDownloadTool.tags).toContain("download");
            expect(fileDownloadTool.tags).toContain("file");
            expect(fileDownloadTool.tags).toContain("fetch");
        });

        it("has credit cost defined", () => {
            expect(fileDownloadTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid HTTPS URL", () => {
            const input = {
                url: "https://example.com/file.pdf"
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts valid HTTP URL", () => {
            const input = {
                url: "http://example.com/file.txt"
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts custom filename", () => {
            const input = {
                url: "https://example.com/download",
                filename: "myfile.pdf"
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts custom destination path", () => {
            const input = {
                url: "https://example.com/file.zip",
                path: "/tmp/custom/path"
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts max size configuration", () => {
            const input = {
                url: "https://example.com/file.zip",
                maxSize: 10000000 // 10MB
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts timeout configuration", () => {
            const input = {
                url: "https://example.com/file.zip",
                timeout: 120000
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts custom headers", () => {
            const input = {
                url: "https://example.com/protected/file.pdf",
                headers: {
                    Authorization: "Bearer token123",
                    "X-API-Key": "apikey456"
                }
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts followRedirects option", () => {
            const input = {
                url: "https://example.com/redirect",
                followRedirects: false
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("accepts content type validation", () => {
            const input = {
                url: "https://example.com/file",
                validateContentType: ["application/pdf", "image/png"]
            };
            expect(() => fileDownloadInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { url: "https://example.com/file.txt" };
            const parsed = fileDownloadInputSchema.parse(input);
            expect(parsed.path).toBe("/tmp/downloads");
            expect(parsed.maxSize).toBe(52428800); // 50MB
            expect(parsed.timeout).toBe(60000);
            expect(parsed.followRedirects).toBe(true);
        });

        it("rejects invalid URL", () => {
            const input = {
                url: "not-a-url"
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });

        it("rejects max size exceeding limit", () => {
            const input = {
                url: "https://example.com/file.zip",
                maxSize: 200000000 // 200MB, exceeds 100MB limit
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });

        it("rejects timeout below minimum", () => {
            const input = {
                url: "https://example.com/file.txt",
                timeout: 1000 // Below 5000ms minimum
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });

        it("rejects timeout above maximum", () => {
            const input = {
                url: "https://example.com/file.txt",
                timeout: 600000 // Above 300000ms maximum
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });

        it("rejects empty filename", () => {
            const input = {
                url: "https://example.com/file.txt",
                filename: ""
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });

        it("rejects filename exceeding max length", () => {
            const input = {
                url: "https://example.com/file.txt",
                filename: "a".repeat(256)
            };
            expect(() => fileDownloadInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with valid URL", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com/document.pdf",
                filename: "downloaded.pdf"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
            expect(result.data?.url).toBe("https://example.com/document.pdf");
            expect(result.data?.filename).toBe("downloaded.pdf");
        });

        it("infers filename from URL when not provided", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com/path/to/file.pdf"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.filename).toBe("file.pdf");
        });

        it("uses trace-based directory when traceId present", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com/file.txt",
                path: "/tmp/custom"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertSuccess(result);
            // When traceId is present, trace-based directory is used regardless of custom path
            expect(result.data?.path).toContain("/tmp/fm-workspace/test-trace-abc/downloads");
        });

        it("rejects localhost URL", async () => {
            const context = createMockContext();
            const params = {
                url: "http://localhost:8080/file.txt"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects 127.0.0.1 URL", async () => {
            const context = createMockContext();
            const params = {
                url: "http://127.0.0.1/file.txt"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects private network addresses", async () => {
            const context = createMockContext();

            const privateUrls = [
                "http://192.168.1.100/file.txt",
                "http://10.0.0.50/file.txt",
                "http://172.20.0.1/file.txt"
            ];

            for (const url of privateUrls) {
                const result = await fileDownloadTool.execute({ url }, context);
                assertError(result, "INVALID_URL");
            }
        });

        it("rejects .local domain", async () => {
            const context = createMockContext();
            const params = {
                url: "http://mynas.local/file.txt"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects non-HTTP protocols", async () => {
            const context = createMockContext();
            const params = {
                url: "ftp://example.com/file.txt"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects file:// protocol", async () => {
            const context = createMockContext();
            const params = {
                url: "file:///etc/passwd"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });
    });

    describe("output", () => {
        it("returns download metadata", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com/file.pdf",
                filename: "doc.pdf"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.url).toBe("https://example.com/file.pdf");
            expect(result.data?.filename).toBe("doc.pdf");
            expect(result.data?.path).toBeDefined();
            expect(result.data?.contentType).toBeDefined();
        });

        it("generates correct output path", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com/document.pdf",
                filename: "my_doc.pdf"
            };

            const result = await fileDownloadTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/downloads/my_doc.pdf");
        });
    });
});
