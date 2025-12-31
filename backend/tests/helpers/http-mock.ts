/**
 * HTTP Mocking Helpers
 *
 * Utilities for mocking HTTP requests in tests using nock.
 * Provides pre-configured mocks for common APIs (OpenAI, Anthropic, etc.)
 */

import nock from "nock";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

// ============================================================================
// TYPES
// ============================================================================

export interface HttpMockConfig {
    /** Base URL (e.g., "https://api.openai.com") */
    baseUrl: string;
    /** Path to match (e.g., "/v1/chat/completions") - supports regex */
    path: string | RegExp;
    /** HTTP method */
    method: "get" | "post" | "put" | "patch" | "delete";
    /** Response body */
    response: JsonValue;
    /** Response status code (default: 200) */
    status?: number;
    /** Response headers */
    headers?: Record<string, string>;
    /** Delay before responding (ms) */
    delay?: number;
    /** Number of times to reply (default: 1, use Infinity for unlimited) */
    times?: number;
    /** Request body matcher (for exact matching) */
    requestBody?: JsonObject | ((body: JsonObject) => boolean);
    /** Request headers to require */
    requestHeaders?: Record<string, string>;
}

export interface MockedRequest {
    baseUrl: string;
    path: string;
    method: string;
    requestBody?: JsonObject;
    requestHeaders?: Record<string, string>;
}

// ============================================================================
// CORE MOCKING FUNCTIONS
// ============================================================================

/**
 * Create an HTTP mock with full configuration
 */
export function mockHttpEndpoint(config: HttpMockConfig): nock.Scope {
    const {
        baseUrl,
        path,
        method,
        response,
        status = 200,
        headers = {},
        delay = 0,
        times = 1,
        requestBody,
        requestHeaders
    } = config;

    let scope = nock(baseUrl);

    // Add required headers if specified
    if (requestHeaders) {
        for (const [key, value] of Object.entries(requestHeaders)) {
            scope = scope.matchHeader(key, value);
        }
    }

    // Get the method function
    type MethodName = "get" | "post" | "put" | "patch" | "delete";
    const methodFn = scope[method as MethodName].bind(scope);

    // Create interceptor
    let interceptor: nock.Interceptor;
    if (requestBody) {
        interceptor = methodFn(path, requestBody);
    } else {
        interceptor = methodFn(path);
    }

    // Configure response
    if (times !== 1) {
        interceptor = interceptor.times(times);
    }

    if (delay > 0) {
        interceptor = interceptor.delay(delay);
    }

    return interceptor.reply(status, response, headers);
}

/**
 * Create a simple GET mock
 */
export function mockGet(
    baseUrl: string,
    path: string,
    response: JsonValue,
    status: number = 200
): nock.Scope {
    return mockHttpEndpoint({
        baseUrl,
        path,
        method: "get",
        response,
        status
    });
}

/**
 * Create a simple POST mock
 */
export function mockPost(
    baseUrl: string,
    path: string,
    response: JsonValue,
    status: number = 200
): nock.Scope {
    return mockHttpEndpoint({
        baseUrl,
        path,
        method: "post",
        response,
        status
    });
}

/**
 * Create an error response mock
 */
export function mockError(
    baseUrl: string,
    path: string,
    method: HttpMockConfig["method"],
    status: number,
    errorMessage: string
): nock.Scope {
    return mockHttpEndpoint({
        baseUrl,
        path,
        method,
        status,
        response: { error: { message: errorMessage, type: "error", code: status } }
    });
}

/**
 * Mock a timeout (request never completes)
 */
export function mockTimeout(
    baseUrl: string,
    path: string,
    method: HttpMockConfig["method"],
    timeoutMs: number = 30000
): nock.Scope {
    return mockHttpEndpoint({
        baseUrl,
        path,
        method,
        response: {},
        delay: timeoutMs + 10000 // Delay longer than timeout
    });
}

// ============================================================================
// OPENAI API MOCKS
// ============================================================================

const OPENAI_BASE_URL = "https://api.openai.com";

export interface OpenAIChatCompletionConfig {
    content: string;
    model?: string;
    finishReason?: string;
    promptTokens?: number;
    completionTokens?: number;
}

/**
 * Mock OpenAI chat completion endpoint
 */
export function mockOpenAIChatCompletion(config: OpenAIChatCompletionConfig): nock.Scope {
    const {
        content,
        model = "gpt-4",
        finishReason = "stop",
        promptTokens = 10,
        completionTokens = 20
    } = config;

    return mockHttpEndpoint({
        baseUrl: OPENAI_BASE_URL,
        path: "/v1/chat/completions",
        method: "post",
        response: {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: "assistant",
                        content
                    },
                    finish_reason: finishReason
                }
            ],
            usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens
            }
        }
    });
}

/**
 * Mock OpenAI embeddings endpoint
 */
export function mockOpenAIEmbeddings(embeddings: number[][]): nock.Scope {
    return mockHttpEndpoint({
        baseUrl: OPENAI_BASE_URL,
        path: "/v1/embeddings",
        method: "post",
        response: {
            object: "list",
            data: embeddings.map((embedding, index) => ({
                object: "embedding",
                index,
                embedding
            })),
            model: "text-embedding-3-small",
            usage: {
                prompt_tokens: embeddings.length * 10,
                total_tokens: embeddings.length * 10
            }
        }
    });
}

/**
 * Mock OpenAI rate limit error
 */
export function mockOpenAIRateLimit(): nock.Scope {
    return mockHttpEndpoint({
        baseUrl: OPENAI_BASE_URL,
        path: /\/v1\/.*/,
        method: "post",
        status: 429,
        response: {
            error: {
                message: "Rate limit exceeded",
                type: "rate_limit_error",
                code: "rate_limit_exceeded"
            }
        },
        headers: {
            "retry-after": "60"
        }
    });
}

/**
 * Mock OpenAI server error
 */
export function mockOpenAIServerError(): nock.Scope {
    return mockHttpEndpoint({
        baseUrl: OPENAI_BASE_URL,
        path: /\/v1\/.*/,
        method: "post",
        status: 500,
        response: {
            error: {
                message: "Internal server error",
                type: "server_error"
            }
        }
    });
}

// ============================================================================
// ANTHROPIC API MOCKS
// ============================================================================

const ANTHROPIC_BASE_URL = "https://api.anthropic.com";

export interface AnthropicMessageConfig {
    content: string;
    model?: string;
    stopReason?: string;
    inputTokens?: number;
    outputTokens?: number;
}

/**
 * Mock Anthropic messages endpoint
 */
export function mockAnthropicMessage(config: AnthropicMessageConfig): nock.Scope {
    const {
        content,
        model = "claude-3-5-sonnet-20241022",
        stopReason = "end_turn",
        inputTokens = 10,
        outputTokens = 20
    } = config;

    return mockHttpEndpoint({
        baseUrl: ANTHROPIC_BASE_URL,
        path: "/v1/messages",
        method: "post",
        response: {
            id: `msg_${Date.now()}`,
            type: "message",
            role: "assistant",
            content: [
                {
                    type: "text",
                    text: content
                }
            ],
            model,
            stop_reason: stopReason,
            usage: {
                input_tokens: inputTokens,
                output_tokens: outputTokens
            }
        }
    });
}

/**
 * Mock Anthropic rate limit error
 */
export function mockAnthropicRateLimit(): nock.Scope {
    return mockHttpEndpoint({
        baseUrl: ANTHROPIC_BASE_URL,
        path: "/v1/messages",
        method: "post",
        status: 429,
        response: {
            type: "error",
            error: {
                type: "rate_limit_error",
                message: "Rate limit exceeded"
            }
        }
    });
}

// ============================================================================
// GENERIC API MOCKS
// ============================================================================

/**
 * Mock a REST API endpoint with CRUD operations
 */
export function mockRestApi(
    baseUrl: string,
    resourcePath: string,
    data: JsonObject[]
): {
    list: nock.Scope;
    get: nock.Scope;
    create: nock.Scope;
    update: nock.Scope;
    delete: nock.Scope;
} {
    return {
        list: mockGet(baseUrl, resourcePath, data),
        get: mockGet(baseUrl, new RegExp(`${resourcePath}/[^/]+`), data[0] || {}),
        create: mockPost(baseUrl, resourcePath, { ...data[0], id: "new-id" }, 201),
        update: mockHttpEndpoint({
            baseUrl,
            path: new RegExp(`${resourcePath}/[^/]+`),
            method: "put",
            response: data[0] || {},
            status: 200
        }),
        delete: mockHttpEndpoint({
            baseUrl,
            path: new RegExp(`${resourcePath}/[^/]+`),
            method: "delete",
            response: {},
            status: 204
        })
    };
}

/**
 * Mock a webhook endpoint
 */
export function mockWebhook(webhookUrl: string, expectedPayload?: JsonObject): nock.Scope {
    const url = new URL(webhookUrl);
    return mockHttpEndpoint({
        baseUrl: url.origin,
        path: url.pathname,
        method: "post",
        response: { success: true, received: true },
        requestBody: expectedPayload
    });
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clear all HTTP mocks
 */
export function clearHttpMocks(): void {
    nock.cleanAll();
}

/**
 * Restore HTTP interceptors to normal behavior
 */
export function restoreHttp(): void {
    nock.restore();
    nock.activate();
}

/**
 * Check if all mocks were used
 */
export function verifyAllMocksUsed(): boolean {
    return nock.isDone();
}

/**
 * Get pending mocks that weren't used
 */
export function getPendingMocks(): string[] {
    return nock.pendingMocks();
}

/**
 * Disable net connect (all HTTP requests must be mocked)
 */
export function disableNetConnect(): void {
    nock.disableNetConnect();
}

/**
 * Enable net connect
 */
export function enableNetConnect(): void {
    nock.enableNetConnect();
}

// ============================================================================
// TEST SETUP HELPERS
// ============================================================================

/**
 * Setup HTTP mocking for a test suite
 * Call in beforeEach or beforeAll
 */
export function setupHttpMocking(): void {
    nock.disableNetConnect();
    nock.cleanAll();
}

/**
 * Teardown HTTP mocking after tests
 * Call in afterEach or afterAll
 */
export function teardownHttpMocking(): void {
    nock.cleanAll();
    nock.enableNetConnect();
}

/**
 * Create a mock HTTP response sequence (for retries)
 */
export function mockSequence(
    baseUrl: string,
    path: string,
    method: HttpMockConfig["method"],
    responses: Array<{ status: number; response: JsonValue }>
): void {
    let scope = nock(baseUrl);

    for (const { status, response } of responses) {
        type MethodName = "get" | "post" | "put" | "patch" | "delete";
        scope = (scope[method as MethodName] as (uri: string) => nock.Interceptor)(path).reply(
            status,
            response
        );
    }
}
