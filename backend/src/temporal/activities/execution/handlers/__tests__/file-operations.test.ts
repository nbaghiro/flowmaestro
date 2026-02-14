/**
 * File Operations Node Handler Unit Tests
 *
 * Tests file operations node handler with mocked dependencies:
 * - fs/promises mocked for file system operations
 * - fetch mocked via nock for URL operations
 * - pdf-parse mocked for PDF parsing
 */

import nock from "nock";

// Mock fs/promises before importing handler
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockStat = jest.fn();
const mockMkdir = jest.fn();

jest.mock("fs/promises", () => ({
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    stat: mockStat,
    mkdir: mockMkdir
}));

// Mock pdf-parse (module is imported with "import * as pdf")
// The handler calls pdf() directly via type casting, so we need the module itself to be callable
// With "import * as pdf", jest creates a namespace object, so we use __esModule to control the shape
const mockPdfParse = jest.fn();
jest.mock("pdf-parse", () => {
    // Create a callable function that is also the default export
    const pdfParseFunction = (...args: unknown[]) => mockPdfParse(...args);
    // Mark as ES module to prevent jest from wrapping it
    return Object.assign(pdfParseFunction, {
        __esModule: true,
        default: pdfParseFunction
    });
});

// Mock config
jest.mock("../../../../../core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" }
        },
        database: {
            host: "localhost",
            port: 5432,
            database: "test",
            user: "test",
            password: "test"
        }
    }
}));

// Mock database module
jest.mock("../../../../../storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    createTestContext,
    createTestMetadata
} from "../../../../../../__tests__/helpers/handler-test-utils";
import {
    setupHttpMocking,
    teardownHttpMocking,
    clearHttpMocks
} from "../../../../../../__tests__/helpers/http-mock";
import { FileOperationsNodeHandler, createFileOperationsNodeHandler } from "../integrations/file";
import type { ContextSnapshot } from "../../../../../temporal/core/types";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ContextSnapshot;
    } = {}
) {
    const defaultConfig = {
        operation: "read",
        fileSource: "path",
        filePath: "/tmp/test.txt"
    };

    return {
        nodeType: overrides.nodeType || "fileOperations",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-file-node" })
    };
}

describe("FileOperationsNodeHandler", () => {
    let handler: FileOperationsNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createFileOperationsNodeHandler();
        jest.clearAllMocks();
        clearHttpMocks();

        // Default mock implementations
        mockStat.mockResolvedValue({ size: 100 });
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("FileOperationsNodeHandler");
        });

        it("supports file node type", () => {
            expect(handler.supportedNodeTypes).toContain("file");
        });

        it("supports fileOperations node type", () => {
            expect(handler.supportedNodeTypes).toContain("fileOperations");
        });

        it("can handle file type", () => {
            expect(handler.canHandle("file")).toBe(true);
        });

        it("can handle fileOperations type", () => {
            expect(handler.canHandle("fileOperations")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("files")).toBe(false);
            expect(handler.canHandle("upload")).toBe(false);
            expect(handler.canHandle("download")).toBe(false);
        });
    });

    describe("read operation", () => {
        it("reads file from local path", async () => {
            mockReadFile.mockResolvedValue("Hello, World!");
            mockStat.mockResolvedValue({ size: 13 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/test.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Hello, World!");
            expect(result.filePath).toBe("/tmp/test.txt");
            expect((result.metadata as JsonObject).size).toBe(13);
            expect(mockReadFile).toHaveBeenCalledWith("/tmp/test.txt", "utf-8");
        });

        it("reads file from URL", async () => {
            nock("https://example.com").get("/file.txt").reply(200, "Content from URL");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://example.com/file.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Content from URL");
            expect((result.metadata as JsonObject).size).toBe(16);
        });

        it("interpolates variables in file path", async () => {
            mockReadFile.mockResolvedValue("Interpolated content");
            mockStat.mockResolvedValue({ size: 20 });

            const context = createTestContext({
                inputs: { filename: "dynamic.txt" }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/{{filename}}"
                }
            });

            await handler.execute(input);

            expect(mockReadFile).toHaveBeenCalledWith("/tmp/dynamic.txt", "utf-8");
        });

        it("handles URL download errors", async () => {
            nock("https://example.com").get("/missing.txt").reply(404, "Not Found");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://example.com/missing.txt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/HTTP 404/);
        });
    });

    describe("write operation", () => {
        it("writes content to file", async () => {
            mockStat.mockResolvedValue({ size: 12 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "write",
                    content: "Hello World!",
                    outputPath: "/tmp/output.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.filePath).toBe("/tmp/output.txt");
            expect(mockWriteFile).toHaveBeenCalledWith("/tmp/output.txt", "Hello World!", "utf-8");
        });

        it("creates directory if not exists", async () => {
            mockStat.mockResolvedValue({ size: 5 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "write",
                    content: "Test",
                    outputPath: "/tmp/new/dir/file.txt"
                }
            });

            await handler.execute(input);

            expect(mockMkdir).toHaveBeenCalledWith("/tmp/new/dir", { recursive: true });
        });

        it("interpolates variables in content", async () => {
            mockStat.mockResolvedValue({ size: 10 });

            const context = createTestContext({
                inputs: { name: "World" }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    operation: "write",
                    content: "Hello {{name}}!",
                    outputPath: "/tmp/greeting.txt"
                }
            });

            await handler.execute(input);

            expect(mockWriteFile).toHaveBeenCalledWith(
                "/tmp/greeting.txt",
                "Hello World!",
                "utf-8"
            );
        });

        it("interpolates variables in output path", async () => {
            mockStat.mockResolvedValue({ size: 5 });

            const context = createTestContext({
                inputs: { userId: "user-123" }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    operation: "write",
                    content: "Data",
                    outputPath: "/tmp/users/{{userId}}/data.txt"
                }
            });

            await handler.execute(input);

            expect(mockWriteFile).toHaveBeenCalledWith(
                "/tmp/users/user-123/data.txt",
                "Data",
                "utf-8"
            );
        });

        it("returns file path and metadata", async () => {
            mockStat.mockResolvedValue({ size: 100 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "write",
                    content: "Large content...",
                    outputPath: "/tmp/large.txt",
                    format: "text"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.filePath).toBe("/tmp/large.txt");
            expect((result.metadata as JsonObject).size).toBe(100);
            expect((result.metadata as JsonObject).format).toBe("text");
        });
    });

    describe("parsePDF operation", () => {
        beforeEach(() => {
            // Reset and set up pdf-parse mock for each test
            mockPdfParse.mockReset();
        });

        it("parses PDF from local path", async () => {
            // Mock fs.readFile to return PDF buffer
            mockReadFile.mockResolvedValue(Buffer.from("fake PDF content"));
            // Mock pdf-parse to return parsed content
            mockPdfParse.mockResolvedValue({
                numpages: 5,
                text: "This is the extracted text from the PDF document."
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/document.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("This is the extracted text from the PDF document.");
            expect((result.metadata as JsonObject).pages).toBe(5);
            expect((result.metadata as JsonObject).format).toBe("pdf");
            expect(mockPdfParse).toHaveBeenCalled();
        });

        it("parses PDF from URL", async () => {
            // Mock HTTP response
            nock("https://example.com")
                .get("/document.pdf")
                .reply(200, Buffer.from("fake PDF bytes"), {
                    "Content-Type": "application/pdf"
                });

            mockPdfParse.mockResolvedValue({
                numpages: 3,
                text: "Downloaded PDF content."
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "url",
                    filePath: "https://example.com/document.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Downloaded PDF content.");
            expect((result.metadata as JsonObject).pages).toBe(3);
        });

        it("parses PDF from base64 data", async () => {
            const base64Pdf = Buffer.from("fake PDF content").toString("base64");

            mockPdfParse.mockResolvedValue({
                numpages: 1,
                text: "Base64 decoded PDF text."
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileData: base64Pdf
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Base64 decoded PDF text.");
            expect((result.metadata as JsonObject).pages).toBe(1);
        });

        it("throws error when PDF source not specified", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    // Explicitly set to undefined to override defaults
                    fileSource: undefined,
                    filePath: undefined,
                    fileData: undefined
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/PDF source not specified/);
        });

        it("returns page count in metadata", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("large PDF"));
            mockPdfParse.mockResolvedValue({
                numpages: 42,
                text: "Multi-page document content..."
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/large-doc.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect((result.metadata as JsonObject).pages).toBe(42);
        });

        it("interpolates variables in PDF path", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("PDF data"));
            mockPdfParse.mockResolvedValue({
                numpages: 1,
                text: "Interpolated PDF"
            });

            const context = createTestContext({
                inputs: { documentId: "doc-123" }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/uploads/{{documentId}}/document.pdf"
                }
            });

            await handler.execute(input);

            expect(mockReadFile).toHaveBeenCalledWith("/uploads/doc-123/document.pdf");
        });

        it("handles PDF download errors", async () => {
            nock("https://example.com").get("/missing.pdf").reply(404, "Not Found");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "url",
                    filePath: "https://example.com/missing.pdf"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/HTTP 404/);
        });

        it("handles PDF parsing errors", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("not a valid PDF"));
            mockPdfParse.mockRejectedValue(new Error("Invalid PDF structure"));

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/invalid.pdf"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid PDF/);
        });
    });

    describe("parseCSV operation", () => {
        it("parses CSV file to JSON array", async () => {
            mockReadFile.mockResolvedValue(
                "name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25"
            );
            mockStat.mockResolvedValue({ size: 50 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/data.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toHaveLength(2);
            expect(parsed[0]).toEqual({ name: "Alice", email: "alice@test.com", age: "30" });
            expect(parsed[1]).toEqual({ name: "Bob", email: "bob@test.com", age: "25" });
        });

        it("uses first row as headers", async () => {
            mockReadFile.mockResolvedValue("id,value\n1,one\n2,two");
            mockStat.mockResolvedValue({ size: 20 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/simple.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed[0]).toHaveProperty("id");
            expect(parsed[0]).toHaveProperty("value");
        });

        it("handles empty CSV", async () => {
            mockReadFile.mockResolvedValue("");
            mockStat.mockResolvedValue({ size: 0 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/empty.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toEqual([]);
        });
    });

    describe("parseJSON operation", () => {
        it("parses JSON file", async () => {
            mockReadFile.mockResolvedValue('{"name": "Test", "value": 42}');
            mockStat.mockResolvedValue({ size: 30 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseJSON",
                    fileSource: "path",
                    filePath: "/tmp/data.json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toEqual({ name: "Test", value: 42 });
        });

        it("throws error for invalid JSON", async () => {
            mockReadFile.mockResolvedValue("{ invalid json }");
            mockStat.mockResolvedValue({ size: 17 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseJSON",
                    fileSource: "path",
                    filePath: "/tmp/invalid.json"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid JSON/);
        });

        it("parses JSON array", async () => {
            mockReadFile.mockResolvedValue("[1, 2, 3]");
            mockStat.mockResolvedValue({ size: 9 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseJSON",
                    fileSource: "path",
                    filePath: "/tmp/array.json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toEqual([1, 2, 3]);
        });
    });

    describe("output variable", () => {
        it("wraps result in outputVariable when specified", async () => {
            mockReadFile.mockResolvedValue("File content");
            mockStat.mockResolvedValue({ size: 12 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/test.txt",
                    outputVariable: "fileData"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.fileData).toBeDefined();
        });

        it("returns raw result when no outputVariable", async () => {
            mockReadFile.mockResolvedValue("Raw content");
            mockStat.mockResolvedValue({ size: 11 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/test.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Raw content");
            expect(result.fileData).toBeUndefined();
        });
    });

    describe("error handling", () => {
        it("throws error for unsupported operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    operation: "unsupported" as string,
                    filePath: "/tmp/test.txt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Unsupported file operation/);
        });

        it("throws error when file not found", async () => {
            mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/missing.txt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/ENOENT/);
        });

        it("handles network errors for URL operations", async () => {
            nock("https://example.com").get("/file.txt").replyWithError("Network error");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://example.com/file.txt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Network error/);
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            mockReadFile.mockResolvedValue("Content");
            mockStat.mockResolvedValue({ size: 7 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/test.txt"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records file size in metadata", async () => {
            mockReadFile.mockResolvedValue("A".repeat(1024));
            mockStat.mockResolvedValue({ size: 1024 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/large.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect((result.metadata as JsonObject).size).toBe(1024);
        });
    });

    describe("URL timeout handling", () => {
        it("handles slow URL downloads", async () => {
            // Mock a slow response (but within timeout)
            nock("https://slow.example.com").get("/file.txt").delay(100).reply(200, "Slow content");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://slow.example.com/file.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Slow content");
        });

        it("handles URL server errors", async () => {
            nock("https://error.example.com").get("/file.txt").reply(500, "Internal Server Error");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://error.example.com/file.txt"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/HTTP 500/);
        });

        it("handles URL redirect chains", async () => {
            nock("https://redirect.example.com")
                .get("/file.txt")
                .reply(302, "", { Location: "https://cdn.example.com/actual-file.txt" });

            nock("https://cdn.example.com")
                .get("/actual-file.txt")
                .reply(200, "Redirected content");

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "url",
                    filePath: "https://redirect.example.com/file.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Redirected content");
        });
    });

    describe("PDF edge cases", () => {
        beforeEach(() => {
            mockPdfParse.mockReset();
        });

        it("handles PDFs with empty text (image-only)", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("image-only PDF"));
            mockPdfParse.mockResolvedValue({
                numpages: 10,
                text: "" // No extractable text
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/image-only.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("");
            expect((result.metadata as JsonObject).pages).toBe(10);
        });

        it("handles very large PDFs", async () => {
            const largePdfBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
            mockReadFile.mockResolvedValue(largePdfBuffer);
            mockPdfParse.mockResolvedValue({
                numpages: 500,
                text: "Large document text content..."
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/large-document.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect((result.metadata as JsonObject).pages).toBe(500);
            expect((result.metadata as JsonObject).size).toBe(50 * 1024 * 1024);
        });

        it("handles PDF with special characters in text", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("PDF with unicode"));
            mockPdfParse.mockResolvedValue({
                numpages: 1,
                text: "Special chars: café, naïve, 日本語, émojis 🎉"
            });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/unicode.pdf"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toContain("café");
            expect(result.content).toContain("日本語");
            expect(result.content).toContain("🎉");
        });

        it("handles encrypted PDF error", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("encrypted PDF"));
            mockPdfParse.mockRejectedValue(new Error("Encrypted PDF: password required"));

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/encrypted.pdf"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/password|encrypted/i);
        });

        it("handles corrupted PDF error", async () => {
            mockReadFile.mockResolvedValue(Buffer.from("not a real PDF file content"));
            mockPdfParse.mockRejectedValue(new Error("Invalid PDF structure"));

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parsePDF",
                    fileSource: "path",
                    filePath: "/tmp/corrupted.pdf"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid PDF/);
        });
    });

    describe("CSV edge cases", () => {
        it("handles CSV with extra whitespace", async () => {
            mockReadFile.mockResolvedValue("  name  ,  email  \n  Alice  ,  alice@test.com  ");
            mockStat.mockResolvedValue({ size: 50 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/whitespace.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed[0].name).toBe("Alice");
            expect(parsed[0].email).toBe("alice@test.com");
        });

        it("handles CSV with missing values", async () => {
            mockReadFile.mockResolvedValue(
                "name,email,phone\nAlice,alice@test.com,\nBob,,555-1234"
            );
            mockStat.mockResolvedValue({ size: 60 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/missing-values.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed[0].phone).toBe("");
            expect(parsed[1].email).toBe("");
        });

        it("handles CSV with only headers (no data)", async () => {
            mockReadFile.mockResolvedValue("name,email,phone");
            mockStat.mockResolvedValue({ size: 15 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/headers-only.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toEqual([]);
        });

        it("handles single-column CSV", async () => {
            mockReadFile.mockResolvedValue("names\nAlice\nBob\nCharlie");
            mockStat.mockResolvedValue({ size: 25 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/single-column.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed).toHaveLength(3);
            expect(parsed[0]).toEqual({ names: "Alice" });
        });

        it("handles CSV with numeric values", async () => {
            mockReadFile.mockResolvedValue("id,score,rate\n1,95,0.85\n2,87,0.72");
            mockStat.mockResolvedValue({ size: 40 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseCSV",
                    fileSource: "path",
                    filePath: "/tmp/numeric.csv"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            // Note: Current implementation returns all values as strings
            expect(parsed[0].id).toBe("1");
            expect(parsed[0].score).toBe("95");
        });
    });

    describe("concurrent operations", () => {
        it("handles multiple concurrent read operations", async () => {
            mockReadFile.mockImplementation(async (path: string) => {
                return `Content of ${path}`;
            });
            mockStat.mockResolvedValue({ size: 20 });

            const inputs = Array.from({ length: 5 }, (_, i) =>
                createHandlerInput({
                    nodeConfig: {
                        operation: "read",
                        fileSource: "path",
                        filePath: `/tmp/file-${i}.txt`
                    }
                })
            );

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(5);
            outputs.forEach((output, i) => {
                const result = output.result as JsonObject;
                expect(result.content).toBe(`Content of /tmp/file-${i}.txt`);
            });
        });

        it("handles multiple concurrent write operations", async () => {
            mockStat.mockResolvedValue({ size: 10 });

            const inputs = Array.from({ length: 5 }, (_, i) =>
                createHandlerInput({
                    nodeConfig: {
                        operation: "write",
                        content: `Content ${i}`,
                        outputPath: `/tmp/output-${i}.txt`
                    }
                })
            );

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(5);
            expect(mockWriteFile).toHaveBeenCalledTimes(5);
        });

        it("handles mixed concurrent operations", async () => {
            mockStat.mockResolvedValue({ size: 15 });

            // Set up mocks for each operation in order
            mockReadFile
                .mockResolvedValueOnce("Read content") // For read operation
                .mockResolvedValueOnce("name,value\na,1"); // For parseCSV operation

            const inputs = [
                createHandlerInput({
                    nodeConfig: { operation: "read", fileSource: "path", filePath: "/tmp/read.txt" }
                }),
                createHandlerInput({
                    nodeConfig: {
                        operation: "write",
                        content: "Write content",
                        outputPath: "/tmp/write.txt"
                    }
                }),
                createHandlerInput({
                    nodeConfig: {
                        operation: "parseCSV",
                        fileSource: "path",
                        filePath: "/tmp/data.csv"
                    }
                })
            ];

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(3);
        });
    });

    describe("edge cases", () => {
        beforeEach(() => {
            // Reset mocks to ensure clean state for each edge case test
            jest.clearAllMocks();
            mockStat.mockResolvedValue({ size: 100 });
            mockMkdir.mockResolvedValue(undefined);
            mockWriteFile.mockResolvedValue(undefined);
        });

        it("handles very long file paths", async () => {
            const longPath = `/tmp/${"subdir/".repeat(50)}file.txt`;
            mockReadFile.mockResolvedValue("Deep file content");
            mockStat.mockResolvedValue({ size: 17 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: longPath
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Deep file content");
            expect(mockReadFile).toHaveBeenCalledWith(longPath, "utf-8");
        });

        it("handles file paths with special characters", async () => {
            mockReadFile.mockResolvedValue("Special path content");
            mockStat.mockResolvedValue({ size: 20 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/file with spaces & symbols (1).txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("Special path content");
        });

        it("handles empty file read", async () => {
            mockReadFile.mockResolvedValue("");
            mockStat.mockResolvedValue({ size: 0 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/empty.txt"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBe("");
            expect((result.metadata as JsonObject).size).toBe(0);
        });

        it("handles binary file content (as UTF-8)", async () => {
            // When reading binary files as UTF-8, content may be garbled
            const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("utf-8");
            mockReadFile.mockResolvedValue(binaryContent);
            mockStat.mockResolvedValue({ size: 4 });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: "/tmp/image.png"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.content).toBeDefined();
        });

        it("handles JSON with deeply nested structure", async () => {
            const deepJson = JSON.stringify({
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                level5: {
                                    value: "deep"
                                }
                            }
                        }
                    }
                }
            });
            mockReadFile.mockResolvedValue(deepJson);
            mockStat.mockResolvedValue({ size: deepJson.length });

            const input = createHandlerInput({
                nodeConfig: {
                    operation: "parseJSON",
                    fileSource: "path",
                    filePath: "/tmp/deep.json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const parsed = JSON.parse(result.content as string);
            expect(parsed.level1.level2.level3.level4.level5.value).toBe("deep");
        });
    });
});
