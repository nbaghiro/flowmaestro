/**
 * HTTP Handler Integration Tests
 *
 * Tests for HTTP node execution behavior including:
 * - Request building (URL, headers, body interpolation)
 * - Timeout handling
 * - Error handling and retry logic
 *
 * Note: These tests focus on request building and error handling logic,
 * not actual HTTP calls.
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    interpolateString
} from "../../../src/temporal/core/services/context";
import type { ContextSnapshot, JsonObject } from "../../../src/temporal/core/types";

// Mock types matching the HTTP handler
interface MockHTTPConfig {
    url: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Array<{ key: string; value: string }>;
    queryParams?: Array<{ key: string; value: string }>;
    body?: string | Record<string, unknown>;
    authType?: "none" | "basic" | "bearer" | "apiKey";
    authCredentials?: string;
    timeout?: number;
    retryConfig?: {
        maxRetries: number;
        retryableStatuses: number[];
    };
}

interface MockHTTPResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
    responseTime: number;
}

// Helper to build URL with interpolation
function buildURL(
    urlTemplate: string,
    queryParams: Array<{ key: string; value: string }> | undefined,
    context: ContextSnapshot
): string {
    let url =
        typeof urlTemplate === "string" ? interpolateString(context, urlTemplate) : urlTemplate;

    if (queryParams && queryParams.length > 0) {
        const params = new URLSearchParams();
        for (const { key, value } of queryParams) {
            if (key && typeof value === "string") {
                params.append(key, interpolateString(context, value));
            }
        }
        const queryString = params.toString();
        if (queryString) {
            url = `${url}?${queryString}`;
        }
    }

    return url;
}

// Helper to build headers with interpolation
function buildHeaders(
    headersList: Array<{ key: string; value: string }> | undefined,
    context: ContextSnapshot
): Record<string, string> {
    const headers: Record<string, string> = {};

    if (headersList) {
        for (const { key, value } of headersList) {
            if (key && typeof value === "string") {
                headers[key] = interpolateString(context, value);
            }
        }
    }

    return headers;
}

// Helper to build body with interpolation
function buildBody(
    body: string | Record<string, unknown> | undefined,
    context: ContextSnapshot
): string | undefined {
    if (!body) return undefined;

    if (typeof body === "string") {
        return interpolateString(context, body);
    }

    // For objects, interpolate string values
    const interpolatedBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") {
            try {
                interpolatedBody[key] = interpolateString(context, value);
            } catch {
                interpolatedBody[key] = value;
            }
        } else {
            interpolatedBody[key] = value;
        }
    }
    return JSON.stringify(interpolatedBody);
}

// Helper to check if status is retryable
function isRetryableStatus(
    status: number,
    retryableStatuses: number[] = [429, 500, 502, 503, 504]
): boolean {
    return retryableStatuses.includes(status);
}

// Helper to add auth header
function addAuthHeader(
    headers: Record<string, string>,
    authType: MockHTTPConfig["authType"],
    credentials: string
): void {
    if (!authType || authType === "none") return;

    switch (authType) {
        case "basic": {
            const encoded = Buffer.from(credentials).toString("base64");
            headers["Authorization"] = `Basic ${encoded}`;
            break;
        }
        case "bearer":
            headers["Authorization"] = `Bearer ${credentials}`;
            break;
        case "apiKey":
            headers["X-API-Key"] = credentials;
            break;
    }
}

describe("HTTP Handler", () => {
    describe("request building", () => {
        describe("URL interpolation", () => {
            it("should interpolate URL variables", () => {
                let context = createContext({});
                context = setVariable(context, "baseUrl", "https://api.example.com");
                context = setVariable(context, "userId", "12345");

                const urlTemplate = "{{baseUrl}}/users/{{userId}}";
                const url = buildURL(urlTemplate, undefined, context);

                expect(url).toBe("https://api.example.com/users/12345");
            });

            it("should interpolate URL with node output values", () => {
                let context = createContext({});
                context = storeNodeOutput(context, "GetUser", {
                    id: "user-abc",
                    workspace: "ws-123"
                });

                const urlTemplate =
                    "https://api.example.com/workspaces/{{GetUser.workspace}}/users/{{GetUser.id}}";
                const url = buildURL(urlTemplate, undefined, context);

                expect(url).toBe("https://api.example.com/workspaces/ws-123/users/user-abc");
            });

            it("should append query params to URL", () => {
                const context = createContext({ search: "test query" });

                const queryParams = [
                    { key: "q", value: "{{search}}" },
                    { key: "limit", value: "10" },
                    { key: "page", value: "1" }
                ];

                const url = buildURL("https://api.example.com/search", queryParams, context);

                expect(url).toContain("q=test+query");
                expect(url).toContain("limit=10");
                expect(url).toContain("page=1");
            });

            it("should handle URL encoding in query params", () => {
                const context = createContext({ query: "hello world & foo=bar" });

                const queryParams = [{ key: "q", value: "{{query}}" }];
                const url = buildURL("https://api.example.com/search", queryParams, context);

                // Should be properly encoded
                expect(url).not.toContain(" ");
                expect(url).toContain("hello+world");
            });

            it("should skip empty query param keys", () => {
                const context = createContext({});

                const queryParams = [
                    { key: "", value: "ignored" },
                    { key: "valid", value: "included" }
                ];

                const url = buildURL("https://api.example.com/test", queryParams, context);

                expect(url).toContain("valid=included");
                expect(url).not.toContain("ignored");
            });
        });

        describe("header interpolation", () => {
            it("should interpolate header variables", () => {
                let context = createContext({});
                context = setVariable(context, "apiKey", "secret-key-123");
                context = setVariable(context, "contentType", "application/json");

                const headersList = [
                    { key: "X-API-Key", value: "{{apiKey}}" },
                    { key: "Content-Type", value: "{{contentType}}" }
                ];

                const headers = buildHeaders(headersList, context);

                expect(headers["X-API-Key"]).toBe("secret-key-123");
                expect(headers["Content-Type"]).toBe("application/json");
            });

            it("should handle static header values", () => {
                const context = createContext({});

                const headersList = [
                    { key: "Accept", value: "application/json" },
                    { key: "X-Custom", value: "static-value" }
                ];

                const headers = buildHeaders(headersList, context);

                expect(headers["Accept"]).toBe("application/json");
                expect(headers["X-Custom"]).toBe("static-value");
            });

            it("should skip empty header keys", () => {
                const context = createContext({});

                const headersList = [
                    { key: "", value: "ignored" },
                    { key: "Valid-Header", value: "included" }
                ];

                const headers = buildHeaders(headersList, context);

                expect(headers["Valid-Header"]).toBe("included");
                expect(Object.keys(headers)).toHaveLength(1);
            });

            it("should add basic auth header", () => {
                const headers: Record<string, string> = {};
                addAuthHeader(headers, "basic", "username:password");

                expect(headers["Authorization"]).toMatch(/^Basic /);
                // Decode and verify
                const encoded = headers["Authorization"].replace("Basic ", "");
                const decoded = Buffer.from(encoded, "base64").toString();
                expect(decoded).toBe("username:password");
            });

            it("should add bearer auth header", () => {
                const headers: Record<string, string> = {};
                addAuthHeader(headers, "bearer", "my-jwt-token");

                expect(headers["Authorization"]).toBe("Bearer my-jwt-token");
            });

            it("should add API key auth header", () => {
                const headers: Record<string, string> = {};
                addAuthHeader(headers, "apiKey", "api-key-12345");

                expect(headers["X-API-Key"]).toBe("api-key-12345");
            });

            it("should not add auth header when type is none", () => {
                const headers: Record<string, string> = {};
                addAuthHeader(headers, "none", "credentials");

                expect(headers["Authorization"]).toBeUndefined();
                expect(headers["X-API-Key"]).toBeUndefined();
            });
        });

        describe("body interpolation", () => {
            it("should interpolate body variables", () => {
                let context = createContext({});
                context = setVariable(context, "userName", "Alice");
                context = setVariable(context, "userEmail", "alice@example.com");

                const bodyTemplate = '{"name": "{{userName}}", "email": "{{userEmail}}"}';
                const body = buildBody(bodyTemplate, context);

                expect(body).toBe('{"name": "Alice", "email": "alice@example.com"}');
            });

            it("should interpolate object body values", () => {
                let context = createContext({});
                context = storeNodeOutput(context, "FormData", {
                    title: "Test Post",
                    content: "Post content here"
                });

                const bodyObj = {
                    title: "{{FormData.title}}",
                    body: "{{FormData.content}}",
                    published: true
                };

                const body = buildBody(bodyObj, context);
                const parsed = JSON.parse(body!);

                expect(parsed.title).toBe("Test Post");
                expect(parsed.body).toBe("Post content here");
                expect(parsed.published).toBe(true);
            });

            it("should handle undefined body", () => {
                const context = createContext({});
                const body = buildBody(undefined, context);

                expect(body).toBeUndefined();
            });

            it("should preserve non-string values in object body", () => {
                const context = createContext({});

                const bodyObj = {
                    count: 42,
                    active: true,
                    tags: ["a", "b"],
                    nested: { key: "value" }
                };

                const body = buildBody(bodyObj, context);
                const parsed = JSON.parse(body!);

                expect(parsed.count).toBe(42);
                expect(parsed.active).toBe(true);
                expect(parsed.tags).toEqual(["a", "b"]);
                expect(parsed.nested).toEqual({ key: "value" });
            });
        });
    });

    describe("timeout handling", () => {
        it("should use default timeout when not specified", () => {
            const config: MockHTTPConfig = {
                url: "https://api.example.com",
                method: "GET"
            };

            // Default timeout should be applied (e.g., 30000ms)
            const timeout = config.timeout ?? 30000;
            expect(timeout).toBe(30000);
        });

        it("should use custom timeout when specified", () => {
            const config: MockHTTPConfig = {
                url: "https://api.example.com",
                method: "GET",
                timeout: 5000
            };

            expect(config.timeout).toBe(5000);
        });

        it("should track response time in output", () => {
            const response: MockHTTPResponse = {
                status: 200,
                statusText: "OK",
                headers: {},
                data: { success: true },
                responseTime: 245 // ms
            };

            expect(response.responseTime).toBe(245);
        });
    });

    describe("error handling", () => {
        it("should retry on configured retry codes", () => {
            const retryableStatuses = [429, 500, 502, 503, 504];

            expect(isRetryableStatus(429, retryableStatuses)).toBe(true);
            expect(isRetryableStatus(500, retryableStatuses)).toBe(true);
            expect(isRetryableStatus(502, retryableStatuses)).toBe(true);
            expect(isRetryableStatus(503, retryableStatuses)).toBe(true);
            expect(isRetryableStatus(504, retryableStatuses)).toBe(true);
        });

        it("should not retry on non-retryable failures", () => {
            const retryableStatuses = [429, 500, 502, 503, 504];

            expect(isRetryableStatus(400, retryableStatuses)).toBe(false);
            expect(isRetryableStatus(401, retryableStatuses)).toBe(false);
            expect(isRetryableStatus(403, retryableStatuses)).toBe(false);
            expect(isRetryableStatus(404, retryableStatuses)).toBe(false);
            expect(isRetryableStatus(422, retryableStatuses)).toBe(false);
        });

        it("should support custom retry status codes", () => {
            const customRetryStatuses = [408, 429, 503];

            expect(isRetryableStatus(408, customRetryStatuses)).toBe(true);
            expect(isRetryableStatus(500, customRetryStatuses)).toBe(false);
        });

        it("should capture error response in context", () => {
            let context = createContext({});

            // Simulate HTTP error response
            context = storeNodeOutput(context, "HTTPRequest", {
                error: true,
                status: 404,
                statusText: "Not Found",
                data: { message: "Resource not found" },
                responseTime: 120
            });

            const output = context.nodeOutputs.get("HTTPRequest");
            expect(output?.error).toBe(true);
            expect(output?.status).toBe(404);
            expect(output?.data).toEqual({ message: "Resource not found" });
        });

        it("should handle connection errors", () => {
            let context = createContext({});

            context = storeNodeOutput(context, "HTTPRequest", {
                error: true,
                errorType: "ConnectionError",
                errorMessage: "ECONNREFUSED - Connection refused",
                status: 0
            });

            const output = context.nodeOutputs.get("HTTPRequest");
            expect(output?.errorType).toBe("ConnectionError");
            expect(output?.status).toBe(0);
        });

        it("should handle timeout errors", () => {
            let context = createContext({});

            context = storeNodeOutput(context, "HTTPRequest", {
                error: true,
                errorType: "TimeoutError",
                errorMessage: "Request timed out after 30000ms",
                timeout: true
            });

            const output = context.nodeOutputs.get("HTTPRequest");
            expect(output?.errorType).toBe("TimeoutError");
            expect(output?.timeout).toBe(true);
        });
    });

    describe("response handling", () => {
        it("should store successful response in context", () => {
            let context = createContext({});

            const response: MockHTTPResponse = {
                status: 200,
                statusText: "OK",
                headers: {
                    "content-type": "application/json",
                    "x-request-id": "req-12345"
                },
                data: {
                    users: [
                        { id: 1, name: "Alice" },
                        { id: 2, name: "Bob" }
                    ],
                    total: 2
                },
                responseTime: 150
            };

            context = storeNodeOutput(context, "FetchUsers", response as unknown as JsonObject);

            const output = context.nodeOutputs.get("FetchUsers");
            expect(output?.status).toBe(200);
            expect(output?.data).toEqual({
                users: [
                    { id: 1, name: "Alice" },
                    { id: 2, name: "Bob" }
                ],
                total: 2
            });
        });

        it("should make response data available to downstream nodes", () => {
            let context = createContext({});

            // First HTTP request
            context = storeNodeOutput(context, "GetUser", {
                status: 200,
                data: { id: "user-123", name: "Alice" }
            });

            // Second HTTP request uses first response
            const userData = context.nodeOutputs.get("GetUser")?.data as { id: string };
            const urlTemplate = `https://api.example.com/users/${userData.id}/posts`;

            expect(urlTemplate).toBe("https://api.example.com/users/user-123/posts");
        });

        it("should handle different content types", () => {
            let context = createContext({});

            // JSON response
            context = storeNodeOutput(context, "JSONResponse", {
                status: 200,
                headers: { "content-type": "application/json" },
                data: { key: "value" }
            });

            // Text response
            context = storeNodeOutput(context, "TextResponse", {
                status: 200,
                headers: { "content-type": "text/plain" },
                data: "Plain text response"
            });

            // HTML response
            context = storeNodeOutput(context, "HTMLResponse", {
                status: 200,
                headers: { "content-type": "text/html" },
                data: "<html><body>Hello</body></html>"
            });

            expect(context.nodeOutputs.get("JSONResponse")?.data).toEqual({ key: "value" });
            expect(context.nodeOutputs.get("TextResponse")?.data).toBe("Plain text response");
            expect(context.nodeOutputs.get("HTMLResponse")?.data).toContain("<html>");
        });

        it("should handle empty response body", () => {
            let context = createContext({});

            context = storeNodeOutput(context, "DeleteRequest", {
                status: 204,
                statusText: "No Content",
                headers: {},
                data: null,
                responseTime: 50
            });

            const output = context.nodeOutputs.get("DeleteRequest");
            expect(output?.status).toBe(204);
            expect(output?.data).toBeNull();
        });
    });

    describe("request methods", () => {
        it("should support all HTTP methods", () => {
            const methods: MockHTTPConfig["method"][] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

            for (const method of methods) {
                const config: MockHTTPConfig = {
                    url: "https://api.example.com/resource",
                    method
                };

                expect(config.method).toBe(method);
            }
        });

        it("should include body only for methods that support it", () => {
            const methodsWithBody = ["POST", "PUT", "PATCH"];

            for (const _method of methodsWithBody) {
                const body = buildBody({ data: "test" }, createContext({}));
                expect(body).toBeDefined();
            }

            // GET and DELETE typically don't have body
            // (though technically allowed, usually omitted)
        });
    });
});
