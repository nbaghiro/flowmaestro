/**
 * Threads Resource
 */

import { SSEClient, type StreamHandle } from "../http/sse-client";
import type { HttpClient } from "../http/base-client";
import type {
    Thread,
    ThreadMessage,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    SendMessageOptions,
    SendMessageResponse,
    ThreadEvent,
    MessageStreamCallbacks
} from "../types";

export class Threads {
    private readonly sseClient: SSEClient;

    constructor(private readonly http: HttpClient) {
        this.sseClient = new SSEClient({
            baseUrl: http.getBaseUrl(),
            apiKey: http.getApiKey(),
            headers: http.getHeaders()
        });
    }

    /**
     * Get a thread by ID
     *
     * @param id - Thread ID
     * @returns Thread details
     *
     * @example
     * ```typescript
     * const { data: thread } = await client.threads.get("thread_123");
     * console.log(`Thread status: ${thread.status}`);
     * ```
     */
    async get(id: string): Promise<ApiResponse<Thread>> {
        return this.http.get<Thread>(`/api/v1/threads/${id}`);
    }

    /**
     * Delete a thread
     *
     * @param id - Thread ID
     *
     * @example
     * ```typescript
     * await client.threads.delete("thread_123");
     * console.log("Thread deleted");
     * ```
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return this.http.delete<void>(`/api/v1/threads/${id}`);
    }

    /**
     * List messages in a thread
     *
     * @param threadId - Thread ID
     * @param options - Pagination options
     * @returns Paginated list of messages
     *
     * @example
     * ```typescript
     * const { data: messages } = await client.threads.listMessages("thread_123");
     * for (const msg of messages) {
     *     console.log(`[${msg.role}]: ${msg.content}`);
     * }
     * ```
     */
    async listMessages(
        threadId: string,
        options: PaginationParams = {}
    ): Promise<PaginatedResponse<ThreadMessage>> {
        return this.http.getPaginated<ThreadMessage>(`/api/v1/threads/${threadId}/messages`, {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Send a message to a thread
     *
     * @param threadId - Thread ID
     * @param options - Message options
     * @returns Message response
     *
     * @example
     * ```typescript
     * const { data } = await client.threads.sendMessage("thread_123", {
     *     content: "What is the weather like today?"
     * });
     * console.log(`Message sent: ${data.message_id}`);
     * ```
     */
    async sendMessage(
        threadId: string,
        options: SendMessageOptions
    ): Promise<ApiResponse<SendMessageResponse>> {
        return this.http.post<SendMessageResponse>(`/api/v1/threads/${threadId}/messages`, {
            content: options.content,
            stream: options.stream || false
        });
    }

    /**
     * Send a message and stream the response
     *
     * @param threadId - Thread ID
     * @param content - Message content
     * @param callbacks - Stream callbacks
     * @returns Stream handle to close the connection
     *
     * @example
     * ```typescript
     * const stream = client.threads.sendMessageStream("thread_123", "Tell me a story", {
     *     onToken: (token) => process.stdout.write(token),
     *     onComplete: (message) => console.log("\n\nDone:", message.id),
     *     onError: (error) => console.error("Error:", error)
     * });
     *
     * // Later, to cancel
     * stream.close();
     * ```
     */
    sendMessageStream(
        threadId: string,
        content: string,
        callbacks: MessageStreamCallbacks
    ): StreamHandle {
        // First, send the message to start streaming
        this.http
            .post<SendMessageResponse>(`/api/v1/threads/${threadId}/messages`, {
                content,
                stream: true
            })
            .catch((error) => {
                callbacks.onError?.(error);
            });

        // Then connect to the event stream
        return this.sseClient.connect<ThreadEvent>(`/api/v1/threads/${threadId}/events`, {
            onEvent: (event) => {
                callbacks.onEvent?.(event);

                if (event.type === "message:token" && event.token) {
                    callbacks.onToken?.(event.token);
                }

                if (event.type === "message:completed" && event.content) {
                    callbacks.onComplete?.({
                        id: event.message_id || "",
                        thread_id: threadId,
                        role: "assistant",
                        content: event.content,
                        created_at: new Date().toISOString()
                    });
                }
            },
            onError: callbacks.onError,
            onClose: callbacks.onClose
        });
    }

    /**
     * Stream thread events as an async iterator
     *
     * @param threadId - Thread ID
     * @param signal - Optional abort signal
     * @returns Async iterator of thread events
     *
     * @example
     * ```typescript
     * // Send message first
     * await client.threads.sendMessage("thread_123", {
     *     content: "Hello!",
     *     stream: true
     * });
     *
     * // Then stream the response
     * let fullResponse = "";
     * for await (const event of client.threads.streamIterator("thread_123")) {
     *     if (event.type === "message:token" && event.token) {
     *         fullResponse += event.token;
     *         process.stdout.write(event.token);
     *     }
     *     if (event.type === "message:completed") {
     *         break;
     *     }
     * }
     * console.log("\n\nFull response:", fullResponse);
     * ```
     */
    async *streamIterator(
        threadId: string,
        signal?: AbortSignal
    ): AsyncGenerator<ThreadEvent, void, unknown> {
        yield* this.sseClient.stream<ThreadEvent>(`/api/v1/threads/${threadId}/events`, signal);
    }
}
