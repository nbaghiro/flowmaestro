/**
 * Server-Sent Events (SSE) Client for streaming
 */

import { StreamError, ConnectionError } from "../errors";

export interface SSEClientOptions {
    baseUrl: string;
    apiKey: string;
    headers?: Record<string, string>;
}

export interface SSECallbacks<T> {
    onEvent: (event: T) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

/**
 * Represents an active SSE stream that can be closed
 */
export interface StreamHandle {
    close(): void;
}

/**
 * Parse a single SSE message
 */
interface SSEMessage {
    event?: string;
    data?: string;
    id?: string;
    retry?: number;
}

/**
 * SSE Client for streaming events from the FlowMaestro API
 */
export class SSEClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly headers: Record<string, string>;

    constructor(options: SSEClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.apiKey = options.apiKey;
        this.headers = options.headers || {};
    }

    /**
     * Connect to an SSE endpoint and stream events
     */
    connect<T>(path: string, callbacks: SSECallbacks<T>): StreamHandle {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();

        // Start the connection in the background
        this.streamEvents<T>(url, controller.signal, callbacks).catch((error) => {
            if (callbacks.onError && error.name !== "AbortError") {
                callbacks.onError(error);
            }
        });

        return {
            close: () => {
                controller.abort();
                callbacks.onClose?.();
            }
        };
    }

    /**
     * Connect to an SSE endpoint and return an async iterator
     */
    async *stream<T>(path: string, signal?: AbortSignal): AsyncGenerator<T, void, unknown> {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();

        // Link external signal to our controller
        if (signal) {
            signal.addEventListener("abort", () => controller.abort());
        }

        const response = await this.connectToUrl(url, controller.signal);

        if (!response.body) {
            throw new StreamError("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                // Check if aborted
                if (signal?.aborted) {
                    break;
                }

                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const messages = this.parseSSEBuffer(buffer);

                for (const message of messages.events) {
                    if (message.data) {
                        try {
                            const event = JSON.parse(message.data) as T;
                            yield event;
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }

                buffer = messages.remaining;
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Internal method to stream events using fetch
     */
    private async streamEvents<T>(
        url: string,
        signal: AbortSignal,
        callbacks: SSECallbacks<T>
    ): Promise<void> {
        const response = await this.connectToUrl(url, signal);

        if (!response.body) {
            throw new StreamError("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const messages = this.parseSSEBuffer(buffer);

                for (const message of messages.events) {
                    if (message.data) {
                        try {
                            const event = JSON.parse(message.data) as T;
                            callbacks.onEvent(event);
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }

                buffer = messages.remaining;
            }
        } finally {
            reader.releaseLock();
            callbacks.onClose?.();
        }
    }

    /**
     * Connect to a URL and return the response
     */
    private async connectToUrl(url: string, signal: AbortSignal): Promise<Response> {
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "text/event-stream",
                    Authorization: `Bearer ${this.apiKey}`,
                    "Cache-Control": "no-cache",
                    ...this.headers
                },
                signal
            });

            if (!response.ok) {
                const body = await response.text();
                throw new StreamError(`SSE connection failed: ${response.status} ${body}`);
            }

            return response;
        } catch (error) {
            if (error instanceof StreamError) {
                throw error;
            }
            if (error instanceof Error && error.name === "AbortError") {
                throw error;
            }
            throw new ConnectionError(
                error instanceof Error ? error.message : "Failed to connect to SSE stream"
            );
        }
    }

    /**
     * Parse SSE buffer and extract complete events
     */
    private parseSSEBuffer(buffer: string): { events: SSEMessage[]; remaining: string } {
        const events: SSEMessage[] = [];
        const lines = buffer.split("\n");
        let currentMessage: SSEMessage = {};
        let remaining = "";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if this is the last line and might be incomplete
            if (i === lines.length - 1 && !buffer.endsWith("\n")) {
                remaining = line;
                break;
            }

            // Empty line signals end of message
            if (line === "") {
                if (currentMessage.data !== undefined) {
                    events.push(currentMessage);
                }
                currentMessage = {};
                continue;
            }

            // Skip comments
            if (line.startsWith(":")) {
                continue;
            }

            // Parse field
            const colonIndex = line.indexOf(":");
            let field: string;
            let value: string;

            if (colonIndex === -1) {
                field = line;
                value = "";
            } else {
                field = line.slice(0, colonIndex);
                value = line.slice(colonIndex + 1);
                // Remove leading space from value
                if (value.startsWith(" ")) {
                    value = value.slice(1);
                }
            }

            switch (field) {
                case "event":
                    currentMessage.event = value;
                    break;
                case "data":
                    // Multiple data fields should be concatenated with newlines
                    if (currentMessage.data === undefined) {
                        currentMessage.data = value;
                    } else {
                        currentMessage.data += "\n" + value;
                    }
                    break;
                case "id":
                    currentMessage.id = value;
                    break;
                case "retry":
                    currentMessage.retry = parseInt(value, 10);
                    break;
            }
        }

        return { events, remaining };
    }
}
