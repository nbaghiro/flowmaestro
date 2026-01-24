/**
 * URL Node Handler Unit Tests
 *
 * Tests URL node handler:
 * - Handler name and type support
 * - URL fetching with mocked HTTP responses
 * - Content extraction
 * - Metadata extraction
 * - Error handling
 * - Multiple URL handling
 */

import nock from "nock";
import {
    createHandlerInput,
    createTestContext
} from "../../../../../../tests/helpers/handler-test-utils";
import {
    setupHttpMocking,
    teardownHttpMocking,
    clearHttpMocks
} from "../../../../../../tests/helpers/http-mock";
import { URLNodeHandler, createURLNodeHandler } from "../inputs/url";

describe("URLNodeHandler", () => {
    let handler: URLNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createURLNodeHandler();
        clearHttpMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("URLNodeHandler");
        });

        it("supports url node type", () => {
            expect(handler.supportedNodeTypes).toContain("url");
        });

        it("can handle url type", () => {
            expect(handler.canHandle("url")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("input")).toBe(false);
            expect(handler.canHandle("files")).toBe(false);
            expect(handler.canHandle("http")).toBe(false);
        });
    });

    describe("URL fetching", () => {
        it("fetches single URL and extracts text", async () => {
            nock("https://example.com")
                .get("/page")
                .reply(
                    200,
                    `<html>
                    <head><title>Test Page</title></head>
                    <body><p>Hello World</p></body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/page"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: true
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urls: Array<{ url: string; content: string; statusCode: number }>;
                combinedContent: string;
                successCount: number;
            };

            expect(result.urls).toHaveLength(1);
            expect(result.urls[0].url).toBe("https://example.com/page");
            expect(result.urls[0].content).toContain("Hello World");
            expect(result.urls[0].statusCode).toBe(200);
            expect(result.successCount).toBe(1);
        });

        it("fetches multiple URLs in parallel", async () => {
            nock("https://example.com")
                .get("/page1")
                .reply(200, "<html><body>Page 1 content</body></html>");

            nock("https://example.com")
                .get("/page2")
                .reply(200, "<html><body>Page 2 content</body></html>");

            nock("https://other.com")
                .get("/page3")
                .reply(200, "<html><body>Page 3 content</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: [
                        "https://example.com/page1",
                        "https://example.com/page2",
                        "https://other.com/page3"
                    ],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urls: Array<{ content: string }>;
                urlCount: number;
                successCount: number;
            };

            expect(result.urlCount).toBe(3);
            expect(result.successCount).toBe(3);
            expect(result.urls[0].content).toContain("Page 1 content");
            expect(result.urls[1].content).toContain("Page 2 content");
            expect(result.urls[2].content).toContain("Page 3 content");
        });

        it("combines content from all successful URLs", async () => {
            nock("https://example.com").get("/a").reply(200, "<html><body>Content A</body></html>");

            nock("https://example.com").get("/b").reply(200, "<html><body>Content B</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/a", "https://example.com/b"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { combinedContent: string };

            expect(result.combinedContent).toContain("Content A");
            expect(result.combinedContent).toContain("Content B");
        });
    });

    describe("URL input sources", () => {
        it("uses URLs from config", async () => {
            nock("https://config-url.com")
                .get("/")
                .reply(200, "<html><body>Config URL</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://config-url.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { successCount: number };
            expect(result.successCount).toBe(1);
        });

        it("uses URLs from workflow inputs", async () => {
            nock("https://workflow-url.com")
                .get("/")
                .reply(200, "<html><body>Workflow URL</body></html>");

            const context = createTestContext({
                inputs: {
                    targetUrls: ["https://workflow-url.com/"]
                }
            });

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    inputName: "targetUrls",
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                },
                context
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { successCount: number };
            expect(result.successCount).toBe(1);
        });

        it("throws error when required URLs are missing", async () => {
            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: [],
                    required: true,
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/no urls/i);
        });

        it("returns empty result for optional URLs", async () => {
            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: [],
                    required: false,
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urlCount: number };
            expect(result.urlCount).toBe(0);
        });
    });

    describe("content extraction", () => {
        it("extracts text from HTML", async () => {
            nock("https://example.com")
                .get("/")
                .reply(
                    200,
                    `<html>
                    <body>
                        <h1>Main Title</h1>
                        <p>First paragraph.</p>
                        <p>Second paragraph.</p>
                    </body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ content: string }> };
            expect(result.urls[0].content).toContain("Main Title");
            expect(result.urls[0].content).toContain("First paragraph");
            expect(result.urls[0].content).toContain("Second paragraph");
        });

        it("removes script and style tags", async () => {
            nock("https://example.com")
                .get("/")
                .reply(
                    200,
                    `<html>
                    <head>
                        <style>.hidden { display: none; }</style>
                    </head>
                    <body>
                        <script>alert('dangerous');</script>
                        <p>Safe content</p>
                        <script>console.log('also dangerous');</script>
                    </body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ content: string }> };
            expect(result.urls[0].content).not.toContain("dangerous");
            expect(result.urls[0].content).not.toContain("display: none");
            expect(result.urls[0].content).toContain("Safe content");
        });

        it("decodes HTML entities", async () => {
            nock("https://example.com")
                .get("/")
                .reply(200, "<html><body>&lt;tag&gt; &amp; &quot;quoted&quot;</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ content: string }> };
            expect(result.urls[0].content).toContain("<tag>");
            expect(result.urls[0].content).toContain("&");
            expect(result.urls[0].content).toContain('"quoted"');
        });
    });

    describe("metadata extraction", () => {
        it("extracts title from HTML", async () => {
            nock("https://example.com")
                .get("/")
                .reply(
                    200,
                    `<html>
                    <head><title>Page Title</title></head>
                    <body><p>Content</p></body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: true
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ title?: string }> };
            expect(result.urls[0].title).toBe("Page Title");
        });

        it("extracts description from meta tags", async () => {
            nock("https://example.com")
                .get("/")
                .reply(
                    200,
                    `<html>
                    <head>
                        <title>Page</title>
                        <meta name="description" content="This is the page description">
                    </head>
                    <body><p>Content</p></body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: true
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ description?: string }> };
            expect(result.urls[0].description).toBe("This is the page description");
        });

        it("handles alternate meta description format", async () => {
            nock("https://example.com")
                .get("/")
                .reply(
                    200,
                    `<html>
                    <head>
                        <meta content="Alternate format description" name="description">
                    </head>
                    <body><p>Content</p></body>
                </html>`
                );

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: true
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ description?: string }> };
            expect(result.urls[0].description).toBe("Alternate format description");
        });
    });

    describe("error handling", () => {
        it("handles 404 errors gracefully", async () => {
            nock("https://example.com").get("/missing").reply(404, "Not Found");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/missing"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urls: Array<{ statusCode: number }>;
                successCount: number;
            };

            // 404 is still a valid response, just with status code 404
            expect(result.urls[0].statusCode).toBe(404);
        });

        it("handles 500 server errors", async () => {
            nock("https://example.com").get("/error").reply(500, "Internal Server Error");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/error"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as { urls: Array<{ statusCode: number }> };
            expect(result.urls[0].statusCode).toBe(500);
        });

        it("handles network errors and includes error in result", async () => {
            nock("https://example.com").get("/").replyWithError("Connection refused");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urls: Array<{ error?: string; statusCode: number }>;
                errorCount: number;
            };

            expect(result.urls[0].error).toBeDefined();
            expect(result.urls[0].statusCode).toBe(0);
            expect(result.errorCount).toBe(1);
        });

        it("continues processing other URLs on individual failure", async () => {
            nock("https://example.com").get("/good").reply(200, "<html><body>Good</body></html>");

            nock("https://example.com").get("/bad").replyWithError("Connection failed");

            nock("https://example.com")
                .get("/also-good")
                .reply(200, "<html><body>Also Good</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: [
                        "https://example.com/good",
                        "https://example.com/bad",
                        "https://example.com/also-good"
                    ],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urlCount: number;
                successCount: number;
                errorCount: number;
            };

            expect(result.urlCount).toBe(3);
            expect(result.successCount).toBe(2);
            expect(result.errorCount).toBe(1);
        });
    });

    describe("output structure", () => {
        it("includes urls array with fetch results", async () => {
            nock("https://example.com").get("/").reply(200, "<html><body>Content</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urls: Array<{
                    url: string;
                    content: string;
                    statusCode: number;
                    fetchedAt: string;
                }>;
            };

            expect(result.urls[0]).toHaveProperty("url");
            expect(result.urls[0]).toHaveProperty("content");
            expect(result.urls[0]).toHaveProperty("statusCode");
            expect(result.urls[0]).toHaveProperty("fetchedAt");
        });

        it("includes urlCount and successCount metrics", async () => {
            nock("https://example.com").get("/").reply(200, "<html><body>Content</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const result = output.result.urlContent as {
                urlCount: number;
                successCount: number;
                errorCount: number;
            };

            expect(result).toHaveProperty("urlCount");
            expect(result).toHaveProperty("successCount");
            expect(result).toHaveProperty("errorCount");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            nock("https://example.com").get("/").reply(200, "<html><body>Content</body></html>");

            const input = createHandlerInput({
                nodeType: "url",
                nodeConfig: {
                    urls: ["https://example.com/"],
                    outputVariable: "urlContent",
                    timeout: 30,
                    followRedirects: true,
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });
});
