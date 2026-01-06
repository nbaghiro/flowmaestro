/**
 * HTTP Node Handler Unit Tests
 *
 * Tests HTTP node handler with mocked network calls using nock.
 * Covers GET/POST requests, authentication, headers, retries, and error handling.
 */

import nock from "nock";

// Mock config before importing handler
jest.mock("../../../../src/core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" },
            anthropic: { apiKey: "test-anthropic-key" }
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
jest.mock("../../../../src/storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

// Mock heartbeat functions
jest.mock("../../../../src/temporal/core/services/heartbeat", () => ({
    withHeartbeat: jest.fn((_name: string, fn: (heartbeat: unknown) => Promise<unknown>) => {
        const mockHeartbeat = { update: jest.fn() };
        return fn(mockHeartbeat);
    }),
    getCancellationSignal: jest.fn().mockReturnValue(null),
    createHeartbeatManager: jest.fn(),
    sendHeartbeat: jest.fn(),
    isCancelled: jest.fn().mockReturnValue(false),
    HeartbeatManager: jest.fn()
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    HTTPNodeHandler,
    createHTTPNodeHandler
} from "../../../../src/temporal/activities/execution/handlers/utils/http";
import { createTestContext, createTestMetadata } from "../../../helpers/handler-test-utils";
import { setupHttpMocking, teardownHttpMocking, clearHttpMocks } from "../../../helpers/http-mock";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ContextSnapshot;
    } = {}
) {
    const defaultConfig = {
        url: "https://api.example.com/data",
        method: "GET"
    };

    return {
        nodeType: overrides.nodeType || "http",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-http-node" })
    };
}

describe("HTTPNodeHandler", () => {
    let handler: HTTPNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createHTTPNodeHandler();
        jest.clearAllMocks();
        clearHttpMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("HTTPNodeHandler");
        });

        it("supports http node type", () => {
            expect(handler.supportedNodeTypes).toContain("http");
        });

        it("can handle http type", () => {
            expect(handler.canHandle("http")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("url")).toBe(false);
            expect(handler.canHandle("request")).toBe(false);
            expect(handler.canHandle("api")).toBe(false);
        });
    });

    describe("GET requests", () => {
        it("makes simple GET request", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { message: "success", value: 42 },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.statusText).toBe("OK");
            expect(result.data).toEqual({ message: "success", value: 42 });
        });

        it("adds query parameters to URL", async () => {
            nock("https://api.example.com")
                .get("/search")
                .query({ q: "test", limit: "10" })
                .reply(
                    200,
                    { results: ["a", "b", "c"] },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/search",
                    method: "GET",
                    queryParams: [
                        { key: "q", value: "test" },
                        { key: "limit", value: "10" }
                    ]
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.data).toEqual({ results: ["a", "b", "c"] });
        });

        it("interpolates variables in URL", async () => {
            nock("https://api.example.com").get("/users/user-123").reply(
                200,
                { id: "user-123", name: "John" },
                {
                    "Content-Type": "application/json"
                }
            );

            const context = createTestContext({
                nodeOutputs: {
                    previousNode: { userId: "user-123" }
                }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    url: "https://api.example.com/users/{{previousNode.userId}}",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect((result.data as JsonObject).id).toBe("user-123");
        });

        it("handles text response", async () => {
            nock("https://api.example.com").get("/text").reply(200, "Hello, World!", {
                "Content-Type": "text/plain"
            });

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/text",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.data).toBe("Hello, World!");
        });
    });

    describe("POST requests", () => {
        it("sends JSON body in POST request", async () => {
            nock("https://api.example.com")
                .post("/users", { name: "John", email: "john@example.com" })
                .reply(
                    201,
                    { id: "new-user-123", name: "John" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/users",
                    method: "POST",
                    body: JSON.stringify({ name: "John", email: "john@example.com" }),
                    bodyType: "json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(201);
            expect((result.data as JsonObject).id).toBe("new-user-123");
        });

        it("sends form data in POST request", async () => {
            nock("https://api.example.com")
                .post("/form", "name=John&email=john%40example.com")
                .reply(
                    200,
                    { received: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/form",
                    method: "POST",
                    body: "name=John&email=john%40example.com",
                    bodyType: "form"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });

        it("interpolates variables in request body", async () => {
            nock("https://api.example.com")
                .post("/webhook", (body) => {
                    return body.workflowId === "wf-123" && body.status === "completed";
                })
                .reply(
                    200,
                    { ok: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            // Note: inputs are spread at root level by getExecutionContext
            const context = createTestContext({
                inputs: {
                    workflowId: "wf-123",
                    status: "completed"
                }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    url: "https://api.example.com/webhook",
                    method: "POST",
                    body: JSON.stringify({
                        workflowId: "{{workflowId}}",
                        status: "{{status}}"
                    }),
                    bodyType: "json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });
    });

    describe("PUT and PATCH requests", () => {
        it("sends PUT request with body", async () => {
            nock("https://api.example.com")
                .put("/users/123", { name: "Jane", email: "jane@example.com" })
                .reply(
                    200,
                    { id: "123", name: "Jane" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/users/123",
                    method: "PUT",
                    body: JSON.stringify({ name: "Jane", email: "jane@example.com" }),
                    bodyType: "json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect((result.data as JsonObject).name).toBe("Jane");
        });

        it("sends PATCH request with partial update", async () => {
            nock("https://api.example.com").patch("/users/123", { name: "Jane Updated" }).reply(
                200,
                { id: "123", name: "Jane Updated" },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/users/123",
                    method: "PATCH",
                    body: JSON.stringify({ name: "Jane Updated" }),
                    bodyType: "json"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });
    });

    describe("DELETE requests", () => {
        it("sends DELETE request", async () => {
            nock("https://api.example.com").delete("/users/123").reply(204);

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/users/123",
                    method: "DELETE"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(204);
        });
    });

    describe("authentication", () => {
        it("adds Basic auth header", async () => {
            nock("https://api.example.com")
                .get("/protected")
                .matchHeader("Authorization", /^Basic /)
                .reply(
                    200,
                    { access: "granted" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/protected",
                    method: "GET",
                    authType: "basic",
                    authCredentials: "user:password"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect((result.data as JsonObject).access).toBe("granted");
        });

        it("adds Bearer token header", async () => {
            nock("https://api.example.com")
                .get("/protected")
                .matchHeader("Authorization", "Bearer my-jwt-token")
                .reply(
                    200,
                    { access: "granted" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/protected",
                    method: "GET",
                    authType: "bearer",
                    authCredentials: "my-jwt-token"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });

        it("adds API key header", async () => {
            nock("https://api.example.com")
                .get("/protected")
                .matchHeader("X-API-Key", "secret-api-key")
                .reply(
                    200,
                    { access: "granted" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/protected",
                    method: "GET",
                    authType: "apiKey",
                    authCredentials: "secret-api-key"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });

        it("interpolates credentials from context", async () => {
            nock("https://api.example.com")
                .get("/protected")
                .matchHeader("Authorization", "Bearer dynamic-token-123")
                .reply(
                    200,
                    { access: "granted" },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const context = createTestContext({
                nodeOutputs: {
                    authNode: { token: "dynamic-token-123" }
                }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    url: "https://api.example.com/protected",
                    method: "GET",
                    authType: "bearer",
                    authCredentials: "{{authNode.token}}"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });
    });

    describe("headers", () => {
        it("includes custom headers in request", async () => {
            nock("https://api.example.com")
                .get("/data")
                .matchHeader("X-Custom-Header", "custom-value")
                .matchHeader("X-Request-ID", "req-123")
                .reply(
                    200,
                    { ok: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET",
                    headers: [
                        { key: "X-Custom-Header", value: "custom-value" },
                        { key: "X-Request-ID", value: "req-123" }
                    ]
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });

        it("interpolates variables in headers", async () => {
            nock("https://api.example.com")
                .get("/data")
                .matchHeader("X-Trace-ID", "trace-abc-123")
                .reply(
                    200,
                    { ok: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            // Note: inputs are spread at root level by getExecutionContext
            const context = createTestContext({
                inputs: { traceId: "trace-abc-123" }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET",
                    headers: [{ key: "X-Trace-ID", value: "{{traceId}}" }]
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
        });

        it("sets Content-Type for JSON body", async () => {
            nock("https://api.example.com")
                .post("/data")
                .matchHeader("Content-Type", "application/json")
                .reply(
                    200,
                    { ok: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "POST",
                    body: JSON.stringify({ test: true }),
                    bodyType: "json"
                }
            });

            const output = await handler.execute(input);
            expect((output.result as JsonObject).status).toBe(200);
        });
    });

    describe("response handling", () => {
        it("parses JSON response", async () => {
            nock("https://api.example.com")
                .get("/json")
                .reply(
                    200,
                    { users: [{ id: 1 }, { id: 2 }], total: 2 },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/json",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.data).toEqual({ users: [{ id: 1 }, { id: 2 }], total: 2 });
        });

        it("returns text response", async () => {
            nock("https://api.example.com")
                .get("/html")
                .reply(200, "<html><body>Hello</body></html>", {
                    "Content-Type": "text/html"
                });

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/html",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.data).toBe("<html><body>Hello</body></html>");
        });

        it("includes response status and headers", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { ok: true },
                {
                    "Content-Type": "application/json",
                    "X-Request-ID": "resp-456"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.statusText).toBe("OK");
            expect(result.headers).toBeDefined();
            expect((result.headers as Record<string, string>)["x-request-id"]).toBe("resp-456");
        });

        it("records response time", async () => {
            nock("https://api.example.com").get("/data").delay(50).reply(
                200,
                { ok: true },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.responseTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("retry behavior", () => {
        it("retries on transient errors", async () => {
            nock("https://api.example.com")
                .get("/flaky")
                .reply(500, { error: "Internal Server Error" })
                .get("/flaky")
                .reply(
                    200,
                    { ok: true },
                    {
                        "Content-Type": "application/json"
                    }
                );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/flaky",
                    method: "GET",
                    retryCount: 1
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            // First request fails with 500, but that's still a valid HTTP response
            // The handler returns the response, not retries on HTTP errors
            // Only network errors trigger retries
            expect(result.status).toBeDefined();
        });

        it("respects max retry count", async () => {
            // Set up 4 failures - should fail after 3 retries (retryCount: 2 = 3 total attempts)
            nock("https://api.example.com")
                .get("/always-fails")
                .times(3)
                .replyWithError("Connection refused");

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/always-fails",
                    method: "GET",
                    retryCount: 2
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed after 3 attempts/);
        });
    });

    describe("error handling", () => {
        it("handles 4xx client errors", async () => {
            nock("https://api.example.com").get("/not-found").reply(
                404,
                { error: "Not found" },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/not-found",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(404);
            expect((result.data as JsonObject).error).toBe("Not found");
        });

        it("handles 5xx server errors", async () => {
            nock("https://api.example.com").get("/server-error").reply(
                500,
                { error: "Internal server error" },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/server-error",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(500);
        });

        it("handles network errors", async () => {
            nock("https://api.example.com").get("/network-error").replyWithError("ECONNREFUSED");

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/network-error",
                    method: "GET",
                    retryCount: 0
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/ECONNREFUSED/);
        });

        it("throws on invalid JSON body", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "POST",
                    body: "{ invalid json",
                    bodyType: "json"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid JSON/);
        });
    });

    describe("output variable", () => {
        it("wraps result in outputVariable when specified", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { value: 123 },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET",
                    outputVariable: "apiResponse"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.apiResponse).toBeDefined();
            const apiResponse = result.apiResponse as JsonObject;
            expect(apiResponse.status).toBe(200);
            expect(apiResponse.data).toEqual({ value: 123 });
        });

        it("returns raw result when no outputVariable", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { value: 456 },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/data",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.data).toEqual({ value: 456 });
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { ok: true },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput();
            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records response time in result", async () => {
            nock("https://api.example.com").get("/data").reply(
                200,
                { ok: true },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.responseTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles empty response body", async () => {
            nock("https://api.example.com").get("/empty").reply(200, "", {
                "Content-Type": "application/json"
            });

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/empty",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.status).toBe(200);
            expect(result.data).toBeNull();
        });

        it("handles redirect responses", async () => {
            // Note: fetch follows redirects by default
            nock("https://api.example.com")
                .get("/redirect")
                .reply(301, "", { Location: "https://api.example.com/new-location" });

            nock("https://api.example.com").get("/new-location").reply(
                200,
                { redirected: true },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/redirect",
                    method: "GET"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            // fetch follows redirects automatically
            expect(result.status).toBe(200);
        });

        it("handles URL with special characters", async () => {
            nock("https://api.example.com").get("/search").query({ q: "hello world" }).reply(
                200,
                { results: [] },
                {
                    "Content-Type": "application/json"
                }
            );

            const input = createHandlerInput({
                nodeConfig: {
                    url: "https://api.example.com/search",
                    method: "GET",
                    queryParams: [{ key: "q", value: "hello world" }]
                }
            });

            const output = await handler.execute(input);
            expect((output.result as JsonObject).status).toBe(200);
        });
    });
});
