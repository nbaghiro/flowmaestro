/**
 * SSE Test Client
 *
 * Utility for testing Server-Sent Events (SSE) endpoints.
 * Provides helpers for connecting, receiving events, and assertions.
 */

import type { ThreadStreamingEvent } from "@flowmaestro/shared";
import type { FastifyInstance } from "fastify";

// ============================================================================
// TYPES
// ============================================================================

export interface SSEEvent {
    type: string;
    data: unknown;
    raw: string;
    timestamp: number;
}

export interface SSETestClient {
    /** Connect to an SSE endpoint */
    connect(url: string, headers?: Record<string, string>): Promise<SSEConnectionResult>;
    /** Wait for a specific event type */
    waitForEvent(eventType: string, timeout?: number): Promise<ThreadStreamingEvent>;
    /** Wait for any event */
    waitForAnyEvent(timeout?: number): Promise<SSEEvent>;
    /** Get all received events */
    getReceivedEvents(): SSEEvent[];
    /** Get events of a specific type */
    getEventsByType(type: string): SSEEvent[];
    /** Check if connected */
    isConnected(): boolean;
    /** Close the connection */
    close(): void;
    /** Clear received events */
    clearEvents(): void;
}

export interface SSEConnectionResult {
    statusCode: number;
    headers: Record<string, string>;
    connected: boolean;
    error?: string;
}

// ============================================================================
// SSE TEST CLIENT IMPLEMENTATION
// ============================================================================

/**
 * Create an SSE test client for a Fastify instance.
 */
export function createSSETestClient(fastify: FastifyInstance): SSETestClient {
    const receivedEvents: SSEEvent[] = [];
    let connected = false;
    let eventBuffer = "";
    const eventListeners: Array<{
        type: string | null;
        resolve: (event: SSEEvent) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = [];

    const parseSSEData = (chunk: string): void => {
        eventBuffer += chunk;
        const lines = eventBuffer.split("\n");

        // Keep the last incomplete line in the buffer
        eventBuffer = lines.pop() || "";

        let currentEvent: Partial<SSEEvent> = {};

        for (const line of lines) {
            // Empty line indicates end of an event
            if (line === "") {
                if (currentEvent.raw) {
                    currentEvent.timestamp = Date.now();
                    receivedEvents.push(currentEvent as SSEEvent);
                    notifyListeners(currentEvent as SSEEvent);
                    currentEvent = {};
                }
                continue;
            }

            // Ignore comments (keepalive messages)
            if (line.startsWith(":")) {
                continue;
            }

            // Parse data lines
            if (line.startsWith("data:")) {
                const dataStr = line.slice(5).trim();
                try {
                    const data = JSON.parse(dataStr);
                    currentEvent.data = data;
                    currentEvent.type = data.type || "unknown";
                    currentEvent.raw = dataStr;
                } catch {
                    // Not JSON, treat as raw string
                    currentEvent.data = dataStr;
                    currentEvent.type = "raw";
                    currentEvent.raw = dataStr;
                }
            }
        }
    };

    const notifyListeners = (event: SSEEvent): void => {
        const matchingListeners = eventListeners.filter(
            (listener) => listener.type === null || listener.type === event.type
        );

        for (const listener of matchingListeners) {
            clearTimeout(listener.timeout);
            const index = eventListeners.indexOf(listener);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
            listener.resolve(event);
        }
    };

    return {
        async connect(
            url: string,
            headers: Record<string, string> = {}
        ): Promise<SSEConnectionResult> {
            try {
                const response = await fastify.inject({
                    method: "GET",
                    url,
                    headers: {
                        Accept: "text/event-stream",
                        ...headers
                    }
                });

                const result: SSEConnectionResult = {
                    statusCode: response.statusCode,
                    headers: response.headers as Record<string, string>,
                    connected: false
                };

                // Check if SSE headers are set
                const contentType = response.headers["content-type"];
                if (
                    response.statusCode === 200 &&
                    typeof contentType === "string" &&
                    contentType.includes("text/event-stream")
                ) {
                    connected = true;
                    result.connected = true;

                    // Parse the response body for events
                    if (response.body) {
                        parseSSEData(response.body);
                    }
                }

                return result;
            } catch (error) {
                return {
                    statusCode: 500,
                    headers: {},
                    connected: false,
                    error: error instanceof Error ? error.message : "Unknown error"
                };
            }
        },

        waitForEvent(eventType: string, timeout: number = 5000): Promise<ThreadStreamingEvent> {
            return new Promise((resolve, reject) => {
                // Check if we already have this event
                const existing = receivedEvents.find((e) => e.type === eventType);
                if (existing) {
                    resolve(existing.data as ThreadStreamingEvent);
                    return;
                }

                const timeoutHandle = setTimeout(() => {
                    const index = eventListeners.findIndex((l) => l.type === eventType);
                    if (index > -1) {
                        eventListeners.splice(index, 1);
                    }
                    reject(new Error(`Timeout waiting for event: ${eventType}`));
                }, timeout);

                eventListeners.push({
                    type: eventType,
                    resolve: (event) => resolve(event.data as ThreadStreamingEvent),
                    reject,
                    timeout: timeoutHandle
                });
            });
        },

        waitForAnyEvent(timeout: number = 5000): Promise<SSEEvent> {
            return new Promise((resolve, reject) => {
                // Check if we already have events
                if (receivedEvents.length > 0) {
                    resolve(receivedEvents[receivedEvents.length - 1]);
                    return;
                }

                const timeoutHandle = setTimeout(() => {
                    const index = eventListeners.findIndex((l) => l.type === null);
                    if (index > -1) {
                        eventListeners.splice(index, 1);
                    }
                    reject(new Error("Timeout waiting for any event"));
                }, timeout);

                eventListeners.push({
                    type: null,
                    resolve,
                    reject,
                    timeout: timeoutHandle
                });
            });
        },

        getReceivedEvents(): SSEEvent[] {
            return [...receivedEvents];
        },

        getEventsByType(type: string): SSEEvent[] {
            return receivedEvents.filter((e) => e.type === type);
        },

        isConnected(): boolean {
            return connected;
        },

        close(): void {
            connected = false;
            // Clear any pending listeners
            for (const listener of eventListeners) {
                clearTimeout(listener.timeout);
                listener.reject(new Error("Connection closed"));
            }
            eventListeners.length = 0;
        },

        clearEvents(): void {
            receivedEvents.length = 0;
        }
    };
}

// ============================================================================
// SSE EVENT SIMULATION
// ============================================================================

/**
 * Create a simulated SSE response string.
 */
export function createSSEResponse(
    events: Array<{ type: string; data: Record<string, unknown> }>
): string {
    return events
        .map((event) => `data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`)
        .join("");
}

/**
 * Create a connection established event.
 */
export function createConnectionEvent(): string {
    return `data: ${JSON.stringify({ type: "connection:established" })}\n\n`;
}

/**
 * Create a keepalive comment.
 */
export function createKeepalive(): string {
    return ":keepalive\n\n";
}

// ============================================================================
// SSE ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a specific event was received.
 */
export function assertEventReceived(
    client: SSETestClient,
    eventType: string,
    expectedData?: Partial<unknown>
): void {
    const events = client.getEventsByType(eventType);
    expect(events.length).toBeGreaterThan(0);

    if (expectedData) {
        const matchingEvent = events.find((e) => {
            const data = e.data as Record<string, unknown>;
            return Object.entries(expectedData as Record<string, unknown>).every(
                ([key, value]) => data[key] === value
            );
        });
        expect(matchingEvent).toBeDefined();
    }
}

/**
 * Assert that a connection established event was received.
 */
export function assertConnectionEstablished(client: SSETestClient): void {
    assertEventReceived(client, "connection:established");
}

/**
 * Assert SSE headers are correct.
 */
export function assertSSEHeaders(headers: Record<string, string>): void {
    expect(headers["content-type"]).toContain("text/event-stream");
    expect(headers["cache-control"]).toBe("no-cache");
    expect(headers["connection"]).toBe("keep-alive");
}
