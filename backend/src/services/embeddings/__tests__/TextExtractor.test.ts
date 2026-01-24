/**
 * TextExtractor Tests
 *
 * Tests for text extraction service (TextExtractor.ts)
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock fs/promises
const mockReadFile = jest.fn();
jest.mock("fs/promises", () => ({
    readFile: mockReadFile
}));

// Mock mammoth
const mockExtractRawText = jest.fn();
jest.mock("mammoth", () => ({
    extractRawText: mockExtractRawText
}));

// Mock pdf-parse
const mockGetText = jest.fn();
jest.mock("pdf-parse", () => ({
    PDFParse: jest.fn().mockImplementation(() => ({
        getText: mockGetText
    }))
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { TextExtractor } from "../TextExtractor";

describe("TextExtractor", () => {
    let extractor: TextExtractor;

    beforeEach(() => {
        jest.clearAllMocks();
        extractor = new TextExtractor();
    });

    describe("extractFromFile", () => {
        describe("PDF extraction", () => {
            it("should extract text from PDF file", async () => {
                const pdfBuffer = Buffer.from("PDF content");
                mockReadFile.mockResolvedValue(pdfBuffer);
                mockGetText.mockResolvedValue({
                    text: "Extracted PDF text content",
                    total: 5
                });

                const result = await extractor.extractFromFile("/path/to/document.pdf", "pdf");

                expect(result.content).toBe("Extracted PDF text content");
                expect(result.metadata.pages).toBe(5);
                expect(result.metadata.wordCount).toBeGreaterThan(0);
            });

            it("should handle PDF extraction errors", async () => {
                mockReadFile.mockRejectedValue(new Error("File not found"));

                await expect(extractor.extractFromFile("/missing.pdf", "pdf")).rejects.toThrow(
                    /Failed to extract text from PDF/
                );
            });
        });

        describe("DOCX extraction", () => {
            it("should extract text from DOCX file", async () => {
                const docxBuffer = Buffer.from("DOCX content");
                mockReadFile.mockResolvedValue(docxBuffer);
                mockExtractRawText.mockResolvedValue({
                    value: "Extracted DOCX text",
                    messages: []
                });

                const result = await extractor.extractFromFile("/path/to/document.docx", "docx");

                expect(result.content).toBe("Extracted DOCX text");
                expect(result.metadata.wordCount).toBeGreaterThan(0);
            });

            it("should handle DOC files the same as DOCX", async () => {
                const docBuffer = Buffer.from("DOC content");
                mockReadFile.mockResolvedValue(docBuffer);
                mockExtractRawText.mockResolvedValue({
                    value: "Extracted DOC text",
                    messages: []
                });

                const result = await extractor.extractFromFile("/path/to/document.doc", "doc");

                expect(result.content).toBe("Extracted DOC text");
            });

            it("should handle DOCX extraction errors", async () => {
                mockReadFile.mockResolvedValue(Buffer.from("invalid"));
                mockExtractRawText.mockRejectedValue(new Error("Invalid format"));

                await expect(
                    extractor.extractFromFile("/path/to/invalid.docx", "docx")
                ).rejects.toThrow(/Failed to extract text from DOCX/);
            });
        });

        describe("Plain text extraction", () => {
            it("should extract text from TXT file", async () => {
                mockReadFile.mockResolvedValue("Plain text file content.");

                const result = await extractor.extractFromFile("/path/to/file.txt", "txt");

                expect(result.content).toBe("Plain text file content.");
                expect(result.metadata.wordCount).toBe(4);
            });

            it("should extract text from MD file", async () => {
                mockReadFile.mockResolvedValue("# Markdown Title\n\nSome content here.");

                const result = await extractor.extractFromFile("/path/to/readme.md", "md");

                expect(result.content).toContain("# Markdown Title");
            });

            it("should handle text read errors", async () => {
                mockReadFile.mockRejectedValue(new Error("Permission denied"));

                await expect(extractor.extractFromFile("/path/to/file.txt", "txt")).rejects.toThrow(
                    /Failed to read text file/
                );
            });
        });

        describe("HTML extraction", () => {
            it("should extract text from HTML file", async () => {
                const html = `
                    <html>
                        <head><title>Test Page</title></head>
                        <body>
                            <h1>Hello World</h1>
                            <p>This is the content.</p>
                        </body>
                    </html>
                `;
                mockReadFile.mockResolvedValue(html);

                const result = await extractor.extractFromFile("/path/to/page.html", "html");

                expect(result.content).toContain("Test Page");
                expect(result.content).toContain("Hello World");
                expect(result.content).toContain("This is the content");
            });
        });

        describe("JSON extraction", () => {
            it("should extract text from JSON file", async () => {
                const json = JSON.stringify({
                    title: "Test Document",
                    body: "Main content here",
                    tags: ["tag1", "tag2"]
                });
                mockReadFile.mockResolvedValue(json);

                const result = await extractor.extractFromFile("/path/to/data.json", "json");

                expect(result.content).toContain("title:");
                expect(result.content).toContain("Test Document");
                expect(result.content).toContain("Main content here");
                expect(result.metadata.structure).toBe("json");
            });

            it("should handle nested JSON objects", async () => {
                const json = JSON.stringify({
                    user: {
                        name: "John",
                        address: {
                            city: "New York"
                        }
                    }
                });
                mockReadFile.mockResolvedValue(json);

                const result = await extractor.extractFromFile("/path/to/nested.json", "json");

                expect(result.content).toContain("John");
                expect(result.content).toContain("New York");
            });

            it("should handle invalid JSON", async () => {
                mockReadFile.mockResolvedValue("not valid json");

                await expect(
                    extractor.extractFromFile("/path/to/invalid.json", "json")
                ).rejects.toThrow(/Failed to extract text from JSON/);
            });
        });

        describe("CSV extraction", () => {
            it("should extract text from CSV file", async () => {
                const csv = "name,age,city\nJohn,30,NYC\nJane,25,LA";
                mockReadFile.mockResolvedValue(csv);

                const result = await extractor.extractFromFile("/path/to/data.csv", "csv");

                expect(result.content).toContain("Headers: name, age, city");
                expect(result.content).toContain("John");
                expect(result.metadata.rowCount).toBe(2); // Excluding header
                expect(result.metadata.columnCount).toBe(3);
            });

            it("should handle empty CSV", async () => {
                mockReadFile.mockResolvedValue("header1,header2");

                const result = await extractor.extractFromFile("/path/to/empty.csv", "csv");

                expect(result.metadata.rowCount).toBe(0);
            });
        });

        describe("Unsupported file types", () => {
            it("should throw for unsupported file type", async () => {
                await expect(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    extractor.extractFromFile("/path/to/file.exe", "exe" as unknown as any)
                ).rejects.toThrow(/Unsupported file type/);
            });
        });
    });

    describe("extractFromURL", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("should extract text from HTML page", async () => {
            const html = `
                <html>
                    <head>
                        <title>Test Article</title>
                        <meta name="description" content="Article description">
                    </head>
                    <body>
                        <article>
                            <h1>Main Heading</h1>
                            <p>Article content here.</p>
                        </article>
                    </body>
                </html>
            `;
            mockFetch.mockResolvedValue({
                ok: true,
                url: "https://example.com/article",
                headers: new Map([["content-type", "text/html"]]),
                text: jest.fn().mockResolvedValue(html)
            });

            const resultPromise = extractor.extractFromURL("https://example.com/article");
            jest.runAllTimers();
            const result = await resultPromise;

            expect(result.content).toContain("Test Article");
            expect(result.content).toContain("Main Heading");
            expect(result.metadata.source).toBe("https://example.com/article");
        });

        it("should handle plain text responses", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                url: "https://example.com/file.txt",
                headers: new Map([["content-type", "text/plain"]]),
                text: jest.fn().mockResolvedValue("Plain text content")
            });

            const resultPromise = extractor.extractFromURL("https://example.com/file.txt");
            jest.runAllTimers();
            const result = await resultPromise;

            expect(result.content).toBe("Plain text content");
        });

        it("should handle JSON responses", async () => {
            const jsonContent = JSON.stringify({ message: "Hello", data: [1, 2, 3] });
            mockFetch.mockResolvedValue({
                ok: true,
                url: "https://api.example.com/data",
                headers: new Map([["content-type", "application/json"]]),
                text: jest.fn().mockResolvedValue(jsonContent)
            });

            const resultPromise = extractor.extractFromURL("https://api.example.com/data");
            jest.runAllTimers();
            const result = await resultPromise;

            expect(result.content).toContain("Hello");
            expect(result.metadata.structure).toBe("json");
        });

        describe("Error handling", () => {
            it("should reject non-http protocols", async () => {
                await expect(extractor.extractFromURL("ftp://example.com")).rejects.toThrow(
                    /Unsupported protocol/
                );
            });

            it("should handle 403 Forbidden", async () => {
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 403,
                    statusText: "Forbidden",
                    url: "https://example.com"
                });

                const resultPromise = extractor.extractFromURL("https://example.com/blocked");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/403 Forbidden/);
            });

            it("should handle 401 Unauthorized", async () => {
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 401,
                    statusText: "Unauthorized",
                    url: "https://example.com"
                });

                const resultPromise = extractor.extractFromURL("https://example.com/private");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/401 Unauthorized/);
            });

            it("should handle 404 Not Found", async () => {
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 404,
                    statusText: "Not Found",
                    url: "https://example.com"
                });

                const resultPromise = extractor.extractFromURL("https://example.com/missing");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/404 Not Found/);
            });

            it("should handle 500 Server Error", async () => {
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 500,
                    statusText: "Internal Server Error",
                    url: "https://example.com"
                });

                const resultPromise = extractor.extractFromURL("https://example.com/error");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/500/);
            });

            it("should reject PDF URLs", async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com/doc.pdf",
                    headers: new Map([["content-type", "application/pdf"]]),
                    text: jest.fn()
                });

                const resultPromise = extractor.extractFromURL("https://example.com/doc.pdf");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/PDF URLs are not yet supported/);
            });

            it("should reject content over 10MB", async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com/large",
                    headers: new Map([
                        ["content-type", "text/html"],
                        ["content-length", "20000000"]
                    ]),
                    text: jest.fn()
                });

                const resultPromise = extractor.extractFromURL("https://example.com/large");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/Content too large/);
            });

            it("should handle network errors", async () => {
                mockFetch.mockRejectedValue(new Error("Network connection failed"));

                const resultPromise = extractor.extractFromURL("https://example.com");
                jest.runAllTimers();

                await expect(resultPromise).rejects.toThrow(/Failed to fetch URL/);
            });
        });

        describe("HTML content processing", () => {
            it("should remove script and style tags", async () => {
                const html = `
                    <html>
                        <head>
                            <script>alert('xss');</script>
                            <style>.red { color: red; }</style>
                        </head>
                        <body>
                            <p>Visible content</p>
                        </body>
                    </html>
                `;
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com",
                    headers: new Map([["content-type", "text/html"]]),
                    text: jest.fn().mockResolvedValue(html)
                });

                const resultPromise = extractor.extractFromURL("https://example.com");
                jest.runAllTimers();
                const result = await resultPromise;

                expect(result.content).not.toContain("alert");
                expect(result.content).not.toContain(".red");
                expect(result.content).toContain("Visible content");
            });

            it("should extract meta description", async () => {
                const html = `
                    <html>
                        <head>
                            <meta name="description" content="This is the page description">
                        </head>
                        <body><p>Content</p></body>
                    </html>
                `;
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com",
                    headers: new Map([["content-type", "text/html"]]),
                    text: jest.fn().mockResolvedValue(html)
                });

                const resultPromise = extractor.extractFromURL("https://example.com");
                jest.runAllTimers();
                const result = await resultPromise;

                expect(result.metadata.description).toBe("This is the page description");
            });

            it("should extract headings", async () => {
                const html = `
                    <html>
                        <body>
                            <h1>Main Title</h1>
                            <h2>Section One</h2>
                            <h3>Subsection</h3>
                        </body>
                    </html>
                `;
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com",
                    headers: new Map([["content-type", "text/html"]]),
                    text: jest.fn().mockResolvedValue(html)
                });

                const resultPromise = extractor.extractFromURL("https://example.com");
                jest.runAllTimers();
                const result = await resultPromise;

                expect(result.metadata.headingCount).toBe(3);
            });

            it("should remove navigation and footer elements", async () => {
                const html = `
                    <html>
                        <body>
                            <nav><a href="/">Home</a></nav>
                            <main><p>Main content here</p></main>
                            <footer>Copyright 2024</footer>
                        </body>
                    </html>
                `;
                mockFetch.mockResolvedValue({
                    ok: true,
                    url: "https://example.com",
                    headers: new Map([["content-type", "text/html"]]),
                    text: jest.fn().mockResolvedValue(html)
                });

                const resultPromise = extractor.extractFromURL("https://example.com");
                jest.runAllTimers();
                const result = await resultPromise;

                expect(result.content).toContain("Main content here");
                // Nav and footer should be removed but text might still appear in headings
            });
        });
    });
});
