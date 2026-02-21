/**
 * Fetch mocking utilities for tests
 */

import { vi } from "vitest";

/**
 * Response configuration for mock fetch
 */
export interface MockFetchResponse {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
    ok?: boolean;
}

/**
 * Mock fetch response builder
 */
export function createMockResponse(config: MockFetchResponse): Response {
    const status = config.status ?? 200;
    const ok = config.ok ?? (status >= 200 && status < 300);

    return {
        ok,
        status,
        statusText: config.statusText ?? "OK",
        headers: new Headers(config.headers ?? { "Content-Type": "application/json" }),
        json: () => Promise.resolve(config.body ?? {}),
        text: () => Promise.resolve(JSON.stringify(config.body ?? {})),
        blob: () => Promise.resolve(new Blob([JSON.stringify(config.body ?? {})])),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        clone: () => createMockResponse(config)
    } as Response;
}

/**
 * Mock fetch for specific URL patterns
 */
export function mockFetch(
    responses: Record<
        string,
        MockFetchResponse | ((url: string, init?: RequestInit) => MockFetchResponse)
    >
) {
    return vi
        .spyOn(global, "fetch")
        .mockImplementation(async (input: string | Request | URL, init?: RequestInit) => {
            const url = typeof input === "string" ? input : input.toString();

            for (const [pattern, responseOrFn] of Object.entries(responses)) {
                if (url.includes(pattern)) {
                    const response =
                        typeof responseOrFn === "function" ? responseOrFn(url, init) : responseOrFn;
                    return createMockResponse(response);
                }
            }

            throw new Error(`Unmocked fetch URL: ${url}`);
        });
}

/**
 * Mock fetch to always succeed with given data
 */
export function mockFetchSuccess(body: unknown, status = 200) {
    return vi.spyOn(global, "fetch").mockResolvedValue(createMockResponse({ status, body }));
}

/**
 * Mock fetch to always fail with error
 */
export function mockFetchError(status: number, body?: unknown) {
    return vi.spyOn(global, "fetch").mockResolvedValue(
        createMockResponse({
            status,
            ok: false,
            statusText: "Error",
            body: body ?? { error: "Mock error" }
        })
    );
}

/**
 * Mock fetch to throw network error
 */
export function mockFetchNetworkError(message = "Network error") {
    return vi.spyOn(global, "fetch").mockRejectedValue(new Error(message));
}

/**
 * Create a streaming response mock for SSE/streaming APIs
 */
export function createStreamingResponse(chunks: string[]): Response {
    let chunkIndex = 0;

    const stream = new ReadableStream({
        pull(controller) {
            if (chunkIndex < chunks.length) {
                controller.enqueue(new TextEncoder().encode(chunks[chunkIndex]));
                chunkIndex++;
            } else {
                controller.close();
            }
        }
    });

    return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "text/event-stream" }),
        body: stream,
        json: () => Promise.reject(new Error("Streaming response")),
        text: () => Promise.resolve(chunks.join("")),
        blob: () => Promise.reject(new Error("Streaming response")),
        arrayBuffer: () => Promise.reject(new Error("Streaming response")),
        clone: () => createStreamingResponse(chunks)
    } as Response;
}
