/**
 * Executions Resource
 */

import { TimeoutError } from "../errors";
import { SSEClient, type StreamHandle } from "../http/sse-client";
import type { HttpClient } from "../http/base-client";
import type {
    Execution,
    ExecutionStatus,
    ListExecutionsOptions,
    PaginatedResponse,
    ApiResponse,
    WaitForCompletionOptions,
    ExecutionEvent,
    StreamCallbacks
} from "../types";

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_WAIT_TIMEOUT = 300000; // 5 minutes

export class Executions {
    private readonly sseClient: SSEClient;

    constructor(private readonly http: HttpClient) {
        this.sseClient = new SSEClient({
            baseUrl: http.getBaseUrl(),
            apiKey: http.getApiKey(),
            headers: http.getHeaders()
        });
    }

    /**
     * List executions
     *
     * @param options - Filter and pagination options
     * @returns Paginated list of executions
     *
     * @example
     * ```typescript
     * // List all executions
     * const { data: executions } = await client.executions.list();
     *
     * // Filter by workflow
     * const { data: workflowExecs } = await client.executions.list({
     *     workflow_id: "wf_123"
     * });
     *
     * // Filter by status
     * const { data: running } = await client.executions.list({
     *     status: "running"
     * });
     * ```
     */
    async list(options: ListExecutionsOptions = {}): Promise<PaginatedResponse<Execution>> {
        return this.http.getPaginated<Execution>("/api/v1/executions", {
            page: options.page,
            per_page: options.per_page,
            workflow_id: options.workflow_id,
            status: options.status
        });
    }

    /**
     * Get an execution by ID
     *
     * @param id - Execution ID
     * @returns Execution details
     *
     * @example
     * ```typescript
     * const { data: execution } = await client.executions.get("exec_123");
     * console.log(`Status: ${execution.status}`);
     * if (execution.outputs) {
     *     console.log("Outputs:", execution.outputs);
     * }
     * ```
     */
    async get(id: string): Promise<ApiResponse<Execution>> {
        return this.http.get<Execution>(`/api/v1/executions/${id}`);
    }

    /**
     * Cancel a running execution
     *
     * @param id - Execution ID
     * @returns Updated execution
     *
     * @example
     * ```typescript
     * const { data: execution } = await client.executions.cancel("exec_123");
     * console.log(`Execution cancelled: ${execution.status}`);
     * ```
     */
    async cancel(id: string): Promise<ApiResponse<Execution>> {
        return this.http.post<Execution>(`/api/v1/executions/${id}/cancel`);
    }

    /**
     * Wait for an execution to complete using polling
     *
     * @param id - Execution ID
     * @param options - Wait options (poll interval, timeout)
     * @returns Completed execution
     * @throws TimeoutError if execution doesn't complete within timeout
     *
     * @example
     * ```typescript
     * const { data } = await client.workflows.execute("wf_123", { inputs: { name: "John" } });
     * const execution = await client.executions.waitForCompletion(data.execution_id);
     * console.log("Result:", execution.outputs);
     * ```
     */
    async waitForCompletion(
        id: string,
        options: WaitForCompletionOptions = {}
    ): Promise<Execution> {
        const pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL;
        const timeout = options.timeout || DEFAULT_WAIT_TIMEOUT;
        const startTime = Date.now();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { data: execution } = await this.get(id);

            if (this.isTerminalStatus(execution.status)) {
                return execution;
            }

            if (Date.now() - startTime > timeout) {
                throw new TimeoutError(`Execution ${id} did not complete within ${timeout}ms`);
            }

            await this.sleep(pollInterval);
        }
    }

    /**
     * Stream execution events via Server-Sent Events
     *
     * @param id - Execution ID
     * @param callbacks - Event callbacks
     * @returns Stream handle to close the connection
     *
     * @example
     * ```typescript
     * const stream = client.executions.stream("exec_123", {
     *     onEvent: (event) => {
     *         console.log(`Event: ${event.type}`);
     *         if (event.type === "node:completed") {
     *             console.log(`Node ${event.node_id} completed`);
     *         }
     *     },
     *     onError: (error) => console.error("Stream error:", error),
     *     onClose: () => console.log("Stream closed")
     * });
     *
     * // Later, to close the stream
     * stream.close();
     * ```
     */
    stream(id: string, callbacks: StreamCallbacks<ExecutionEvent>): StreamHandle {
        return this.sseClient.connect<ExecutionEvent>(`/api/v1/executions/${id}/events`, {
            onEvent: (event) => {
                callbacks.onEvent?.(event);

                // Auto-close on terminal events
                if (this.isTerminalEventType(event.type)) {
                    callbacks.onClose?.();
                }
            },
            onError: callbacks.onError,
            onClose: callbacks.onClose
        });
    }

    /**
     * Stream execution events as an async iterator
     *
     * @param id - Execution ID
     * @param signal - Optional abort signal
     * @returns Async iterator of execution events
     *
     * @example
     * ```typescript
     * for await (const event of client.executions.streamIterator("exec_123")) {
     *     console.log(`Event: ${event.type}`);
     *     if (event.type === "execution:completed") {
     *         console.log("Done!", event.outputs);
     *         break;
     *     }
     * }
     * ```
     */
    async *streamIterator(
        id: string,
        signal?: AbortSignal
    ): AsyncGenerator<ExecutionEvent, void, unknown> {
        yield* this.sseClient.stream<ExecutionEvent>(`/api/v1/executions/${id}/events`, signal);
    }

    /**
     * Check if status is terminal (completed, failed, cancelled)
     */
    private isTerminalStatus(status: ExecutionStatus): boolean {
        return status === "completed" || status === "failed" || status === "cancelled";
    }

    /**
     * Check if event type is terminal
     */
    private isTerminalEventType(type: string): boolean {
        return (
            type === "execution:completed" ||
            type === "execution:failed" ||
            type === "execution:cancelled"
        );
    }

    /**
     * Sleep for a given duration
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
